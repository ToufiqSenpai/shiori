use std::{fmt, str::FromStr};

use anyhow::{Context, Result};
use futures_util::{Stream, StreamExt};
use reqwest::StatusCode;
use reqwest_eventsource::{Event, EventSource};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqliteArgumentValue, Decode, Encode, Sqlite, Type};
use strum_macros::Display;
use tauri::Wry;
use tauri_plugin_store::Store;
use tokio::select;
use tokio_util::sync::CancellationToken;
use tracing::debug;

use crate::{
    api::HTTP, features::model::text_generation::gemini::Gemini,
    security::secret_manager::SecretManager,
};

#[derive(Debug, Deserialize, Display, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum Provider {
    Gemini,
}

// #[async_trait::async_trait]
// pub trait TextGeneration {
//     fn get_provider() -> Provider;
//     fn new_with_api_key(api_key: String) -> Self
//     where
//         Self: Sized;
//     async fn get_models(&self) -> Result<Vec<Model>>;
//     async fn generate_text(&self, model_id: String, messages: Vec<Message>) -> Result<Vec<Message>>;
//     fn generate_text_stream(
//         &self,
//         model_id: String,
//         messages: Vec<Message>,
//         cancellation_token: CancellationToken,
//     ) -> impl Stream<Item = Result<String>> + '_;
// }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub id: String,
    pub name: String,
    pub provider: Provider,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

impl fmt::Display for Role {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Role::System => write!(f, "system"),
            Role::User => write!(f, "user"),
            Role::Assistant => write!(f, "assistant"),
        }
    }
}

impl FromStr for Role {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "system" => Ok(Role::System),
            "user" => Ok(Role::User),
            "assistant" => Ok(Role::Assistant),
            _ => Err(()),
        }
    }
}

impl Type<Sqlite> for Role {
    fn type_info() -> sqlx::sqlite::SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for Role {
    fn decode(
        value: <Sqlite as sqlx::Database>::ValueRef<'r>,
    ) -> std::result::Result<Self, sqlx::error::BoxDynError> {
        let s = <String as Decode<Sqlite>>::decode(value)?;
        Role::from_str(&s).map_err(|_| "Failed to decode Role from database".into())
    }
}

impl<'r> Encode<'r, Sqlite> for Role {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'r>>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let s = self.to_string();
        <String as Encode<Sqlite>>::encode_by_ref(&s, args)
    }
}

#[derive(Serialize)]
pub struct Message {
    pub role: Role,
    pub text: String,
}

pub mod gemini {
    use super::{Model as TextGenerationModel, *};

    impl From<Content> for Message {
        fn from(content: Content) -> Self {
            let role = match content.role.as_str() {
                "system" => Role::System,
                "user" => Role::User,
                "model" => Role::Assistant,
                _ => Role::User,
            };
            let text = content
                .parts
                .into_iter()
                .map(|p| p.text)
                .collect::<Vec<_>>()
                .join("\n");

            Message { role, text }
        }
    }

    pub struct Gemini {
        api_key: String,
        model_id: String,
    }

    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Model {
        name: String,
        display_name: String,
        #[serde(default)]
        supported_generation_methods: Vec<String>,
    }

    #[derive(Deserialize)]
    struct GetModelsResponse {
        models: Vec<Model>,
    }

    #[derive(Clone, Deserialize, Serialize)]
    struct Content {
        pub parts: Vec<Part>,
        pub role: String,
    }

    impl From<Message> for Content {
        fn from(message: Message) -> Self {
            Content {
                parts: vec![Part { text: message.text }],
                role: match message.role {
                    Role::User => "user".to_string(),
                    Role::Assistant => "model".to_string(),
                    Role::System => "system".to_string(),
                },
            }
        }
    }

    #[derive(Clone, Deserialize, Serialize)]
    struct Part {
        pub text: String,
    }

    #[derive(Deserialize)]
    struct Candidate {
        pub content: Content,
    }

    #[derive(Serialize)]
    struct MessageRequest {
        pub contents: Vec<Content>,
        #[serde(rename = "systemInstruction", skip_serializing_if = "Option::is_none")]
        pub system_instruction: Option<Content>,
    }

    #[derive(Deserialize)]
    struct MessageResponse {
        pub candidates: Vec<Candidate>,
    }

    impl Gemini {
        pub fn new(model_id: String) -> Result<Self>
        where
            Self: Sized,
        {
            Ok(Self::new_with_api_key(
                Self::get_api_key().context("Failed to initialize Gemini client with API key")?,
                model_id,
            ))
        }

        fn get_api_key() -> Result<String> {
            let api_key = SecretManager::get(&format!(
                "{}_API_KEY",
                Self::get_provider().to_string().to_uppercase()
            ))
            .context("Failed to retrieve API key from secure storage")?;

            Ok(api_key)
        }

        pub async fn set_api_key(api_key: String) -> Result<bool>
        where
            Self: Sized,
        {
            let token_key = format!(
                "{}_API_KEY",
                Self::get_provider().to_string().to_uppercase()
            );
            SecretManager::set(&token_key, &api_key).context("Failed to store API key securely")?;

            let models = Self::get_models().await;

            match models {
                Ok(_) => Ok(true),
                Err(e) => {
                    if let Some(reqwest_error) = e.downcast_ref::<reqwest::Error>() {
                        if reqwest_error.status() == Some(StatusCode::UNAUTHORIZED)
                            || reqwest_error.status() == Some(StatusCode::FORBIDDEN)
                        {
                            return Ok(false);
                        }
                    }
                    SecretManager::delete(&token_key)
                        .context("Failed to delete invalid API key from secure storage")?;

                    Err(e)
                }
            }
        }

        pub fn new_with_api_key(api_key: String, model_id: String) -> Self {
            Gemini { api_key, model_id }
        }

        pub fn get_provider() -> Provider {
            Provider::Gemini
        }

        pub async fn get_models() -> Result<Vec<TextGenerationModel>> {
            let response = HTTP
                .get("https://generativelanguage.googleapis.com/v1beta/models")
                .header("x-goog-api-key", Self::get_api_key()?)
                .send()
                .await
                .context("Failed to fetch models")?;

            if response.status().as_u16() >= 400 {
                let text = response.text().await.unwrap_or_default();
                debug!("Gemini API error response: {}", text);
                return Err(anyhow::anyhow!("Unauthorized: Invalid API Key"));
            }

            let response = response
                .error_for_status()
                .context("HTTP request failed, status: unknown")?
                .json::<GetModelsResponse>()
                .await
                .context("Failed to parse models response in JSON format")?;

            let models = response
                .models
                .into_iter()
                .filter(|model| {
                    model
                        .supported_generation_methods
                        .contains(&"generateContent".to_string())
                })
                .filter(|model| model.display_name.contains("Gemini"))
                .map(|model| TextGenerationModel {
                    id: model.name.split("/").last().unwrap_or_default().to_string(),
                    name: model.display_name,
                    provider: Provider::Gemini,
                })
                .collect();

            Ok(models)
        }

        pub async fn generate_text(&self, mut messages: Vec<Message>) -> Result<Vec<Message>> {
            let system_instruction = if messages
                .first()
                .map_or(false, |m| matches!(m.role, Role::System))
            {
                Some(Content {
                    parts: vec![Part {
                        text: messages.first().unwrap().text.clone(),
                    }],
                    role: "system".to_string(),
                })
            } else {
                None
            };
            let contents: Vec<Content> = messages
                .iter()
                .filter(|m| !matches!(m.role, Role::System))
                .map(|m| Content {
                    parts: vec![Part {
                        text: m.text.clone(),
                    }],
                    role: match m.role {
                        Role::User => "user".to_string(),
                        Role::Assistant => "model".to_string(),
                        Role::System => "system".to_string(),
                    },
                })
                .collect();
            let request_body = MessageRequest {
                contents,
                system_instruction,
            };

            let response = HTTP
                .post(&format!(
                    "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent",
                    self.model_id
                ))
                .header("x-goog-api-key", self.api_key.clone())
                .json(&request_body)
                .send()
                .await
                .context("Failed to send text generation request")?
                .error_for_status()
                .context("Text generation request failed")?
                .json::<MessageResponse>()
                .await
                .context("Failed to read text generation response")?;

            if let Some(candidate) = response.candidates.first() {
                messages.push(Message::from(candidate.content.clone()));
            }

            Ok(messages)
        }

        pub fn generate_text_stream(
            &self,
            messages: Vec<Message>,
            cancellation_token: CancellationToken,
        ) -> impl Stream<Item = Result<String>> + '_ {
            let api_key = self.api_key.clone();
            async_stream::try_stream! {
                let request = reqwest::Client::new()
                    .post("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
                    .header("Authorization", format!("Bearer {}", api_key))
                    .json(&openai::ChatCompletionRequest {
                        model: self.model_id.clone(),
                        messages: messages.into_iter().map(|m| openai::Message {
                            role: match m.role {
                                Role::User => "user".to_string(),
                                Role::Assistant => "assistant".to_string(),
                                Role::System => "system".to_string(),
                            },
                            content: m.text,
                        }).collect(),
                        stream: true,
                    });

                let mut es = EventSource::new(request)
                    .context("Failed to create event source")?;

                loop {
                    let next_step = select! {
                        _ = cancellation_token.cancelled() => {
                            None
                        }
                        event = es.next() => {
                            Some(event)
                        }
                    };

                    match next_step {
                        None => {
                            debug!("Stream cancelled by token");
                            es.close();
                            break;
                        }

                        Some(None) => {
                            debug!("Stream ended naturally");
                            break;
                        }

                        Some(Some(Err(e))) => {
                            es.close();
                            Err(anyhow::anyhow!("Stream connection error: {}", e))?;
                        }

                        Some(Some(Ok(event))) => {
                            match event {
                                Event::Open => {
                                    debug!("Connection opened");
                                    continue;
                                }
                                Event::Message(message) => {
                                    if message.data == "[DONE]" {
                                        break;
                                    }

                                    debug!("Received message data: {}", &message.data);

                                    let chunk = match serde_json::from_str::<openai::ChatCompletionChunk>(&message.data) {
                                        Ok(c) => c,
                                        Err(e) => {
                                            Err(anyhow::anyhow!("Failed to parse chunk: {}", e))?
                                        }
                                    };

                                    for choice in chunk.choices {
                                        if let Some(content) = choice.delta.content {
                                            yield content;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

mod openai {
    use super::*;
    use serde::Serialize;

    #[derive(Serialize)]
    pub struct ChatCompletionRequest {
        pub model: String,
        pub messages: Vec<Message>,
        pub stream: bool,
    }

    #[derive(Serialize)]
    pub struct Message {
        pub role: String,
        pub content: String,
    }

    #[derive(Deserialize)]
    pub struct ChatCompletionChunk {
        pub choices: Vec<ChatCompletionChoice>,
    }

    #[derive(Deserialize)]
    pub struct ChatCompletionChoice {
        pub delta: ChatCompletionDelta,
    }

    #[derive(Deserialize)]
    pub struct ChatCompletionDelta {
        pub content: Option<String>,
    }
}

pub async fn get_text_generation(store: &Store<Wry>) -> Result<Gemini> {
    let text_generation_model: String = serde_json::from_value(
        store
            .get("model.textGeneration.model")
            .context("Failed to get textGeneration model from settings store")?,
    )
    .context("Failed to parse text generation model from settings")?;

    Gemini::new(text_generation_model).context("Failed to initialize Gemini text generation client")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_gemini_generate_text() {
        let gemini = gemini::Gemini::new("gemini-2.5-flash".to_string())
            .expect("Failed to initialize Gemini client");
        let messages = vec![
            Message {
                role: Role::System,
                text: "You are a helpful assistant.".to_string(),
            },
            Message {
                role: Role::User,
                text: "Hello, how are you?".to_string(),
            },
        ];
        let response = gemini
            .generate_text(messages)
            .await
            .expect("Failed to generate text");

        for message in response {
            println!("Role: {:?}, Text: {}", message.role, message.text);
        }
    }

    #[tokio::test]
    async fn test_gemini_generate_text_stream() {
        let gemini = gemini::Gemini::new("gemini-2.5-flash".to_string())
            .expect("Failed to initialize Gemini client");
        let messages = vec![
            Message {
                role: Role::System,
                text: "You are a helpful assistant.".to_string(),
            },
            Message {
                role: Role::User,
                text: "Write a poem abou".to_string(),
            },
        ];

        let cancellation_token = CancellationToken::new();
        let mut stream =
            Box::pin(gemini.generate_text_stream(messages, cancellation_token.clone()));

        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(text) => print!("{}", text),
                Err(e) => eprintln!("Stream error: {}", e),
            }
        }
    }
}
