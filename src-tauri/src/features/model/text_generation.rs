use anyhow::{Context, Result};
use reqwest::StatusCode;
use serde::{Deserialize, Serialize};
use strum_macros::Display;

use crate::{api::HTTP, security::secret_manager::SecretManager};

#[derive(Debug, Deserialize, Display, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TextGenerationProvider {
    Gemini,
}

#[allow(async_fn_in_trait)]
pub trait TextGeneration {
    fn new_with_api_key(api_key: String) -> Self;
    async fn get_models(&self) -> Result<Vec<TextGenerationModel>>;
    fn get_provider() -> TextGenerationProvider;

    fn new() -> Self
    where
        Self: Sized,
    {
        let api_key = SecretManager::get(&format!(
            "{}_API_KEY",
            Self::get_provider().to_string().to_uppercase()
        ))
        .unwrap_or_default();

        Self::new_with_api_key(api_key)
    }

    async fn set_api_key(api_key: String) -> Result<bool>
    where
        Self: Sized,
    {
        let llm = Self::new_with_api_key(api_key.clone());
        let models = llm.get_models().await;

        match models {
            Ok(_) => {
                SecretManager::set(
                    &format!(
                        "{}_API_KEY",
                        Self::get_provider().to_string().to_uppercase()
                    ),
                    &api_key,
                )
                .context("Failed to store API key securely")?;

                Ok(true)
            }
            Err(e) => {
                if let Some(reqwest_error) = e.downcast_ref::<reqwest::Error>() {
                    if reqwest_error.status() == Some(StatusCode::UNAUTHORIZED)
                        || reqwest_error.status() == Some(StatusCode::FORBIDDEN)
                    {
                        return Ok(false);
                    }
                }
                Err(e)
            }
        }
    }
}

pub struct TextGenerationModel {
    id: String,
    name: String,
}

pub struct Gemini {
    api_key: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GeminiModel {
    name: String,
    display_name: String,
    #[serde(default)]
    supported_generation_methods: Vec<String>,
}

#[derive(Deserialize)]
struct GetGeminiModelsResponse {
    models: Vec<GeminiModel>,
}

impl TextGeneration for Gemini {
    fn new_with_api_key(api_key: String) -> Self {
        Gemini { api_key }
    }

    fn get_provider() -> TextGenerationProvider {
        TextGenerationProvider::Gemini
    }

    async fn get_models(&self) -> Result<Vec<TextGenerationModel>> {
        let response = HTTP
            .get("https://generativelanguage.googleapis.com/v1beta/models")
            .header("x-goog-api-key", self.api_key.clone())
            .send()
            .await
            .context("Failed to fetch models")?
            .error_for_status()?
            .json::<GetGeminiModelsResponse>()
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
            .map(|model| TextGenerationModel {
                id: model.name,
                name: model.display_name,
            })
            .collect();

        Ok(models)
    }
}
