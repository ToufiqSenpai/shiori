use anyhow::Context;
use futures_util::StreamExt;
use serde::Serialize;
use sqlx::SqlitePool;
use tauri::{AppHandle, Emitter, State};
use tracing::error;
use uuid::Uuid;

use crate::{
    error::ErrorCode,
    features::{
        chat::entities::Chat,
        model::text_generation::{get_text_generation, Message, Role},
    },
    utils::tauri::get_settings_store,
};

#[tauri::command]
pub async fn get_chats(database: State<'_, SqlitePool>) -> Result<Vec<Chat>, ErrorCode> {
    let pool = database.inner();
    let chats = sqlx::query_as::<_, Chat>("SELECT * FROM chats")
        .fetch_all(pool)
        .await
        .context("Failed to fetch chats")?;

    Ok(chats)
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MessageChunk {
    text: String,
    chat_id: Uuid,
}

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    database: State<'_, SqlitePool>,
    message: String,
    summary_id: Uuid,
) -> Result<Vec<Chat>, ErrorCode> {
    let pool = database.inner().clone();
    let mut chats = sqlx::query_as::<_, Chat>(
        "SELECT * FROM chats WHERE summary_id = ? ORDER BY created_at ASC",
    )
    .bind(&summary_id)
    .fetch_all(&pool)
    .await
    .context("Failed to fetch chats")?;

    if chats.is_empty() {
        let summary = sqlx::query_scalar::<_, String>("SELECT summary FROM summaries WHERE id = ?")
            .bind(&summary_id)
            .fetch_one(&pool)
            .await
            .context("Failed to fetch summary")?;

        let prompt = format!(
            "
            You are a personal assistant helping the user based on a summarized voice note.

            The text below is a summary of the user's voice memo.
            Use it as the **main context** of the conversation.

            Your role:
            - Answer the user's questions related to the topic of the summary
            - Provide explanations, examples, or additional information when appropriate
            - Use general knowledge to help, as long as it does not contradict the summary

            Guidelines:
            - The summary provides context, not all possible details
            - Do not invent facts that are presented as coming from the summary if they are not there
            - If a question goes beyond the summary, answer it normally and clearly
            - If something is ambiguous, ask for clarification instead of refusing to answer
            - Do not reference the original audio or transcription

            Use the same language as the summary.
            Keep responses clear, natural, and helpful.

            Summary:
            ---
            {}
            ---
            ",
            summary
        );
        chats.push(Chat {
            id: Uuid::new_v4(),
            summary_id,
            message: prompt,
            role: Role::System,
            created_at: chrono::Utc::now().naive_utc(),
            updated_at: chrono::Utc::now().naive_utc(),
        });

        sqlx::query("INSERT INTO chats (id, summary_id, message, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
            .bind(chats[0].id)
            .bind(chats[0].summary_id)
            .bind(&chats[0].message)
            .bind(&chats[0].role)
            .bind(chats[0].created_at)
            .bind(chats[0].updated_at)
            .execute(&pool)
            .await
            .context("Failed to insert system chat")?;
    }

    let new_send_chat = Chat {
        id: Uuid::new_v4(),
        summary_id,
        message: message.clone(),
        role: Role::User,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };
    let new_reply_chat = Chat {
        id: Uuid::new_v4(),
        summary_id,
        message: "".to_string(), // Will be filled in as the model generates text
        role: Role::Assistant,
        created_at: chrono::Utc::now().naive_utc(),
        updated_at: chrono::Utc::now().naive_utc(),
    };
    chats.push(new_send_chat.clone());
    chats.push(new_reply_chat.clone());

    let pool_for_task = pool.clone();
    let mut reply_chat_for_task = new_reply_chat.clone();
    tokio::spawn(async move {
        if let Err(e) = (async {
            let settings = get_settings_store(&app).context("Failed to get settings store")?;
            let text_generation = get_text_generation(settings.as_ref())
                .await
                .context("Failed to get text generation model")?;

            let conversation = chats
                .into_iter()
                .map(|chat| Message {
                    role: chat.role,
                    text: chat.message,
                })
                .collect::<Vec<Message>>();

            let text_stream = text_generation
                .generate_text_stream(conversation, tokio_util::sync::CancellationToken::new());

            futures_util::pin_mut!(text_stream);

            let mut message = String::new();

            while let Some(chunk) = text_stream.next().await {
                match chunk {
                    Ok(partial_text) => {
                        // Here you would typically send the partial_text to the frontend via an event
                        // For example:
                        message.push_str(&partial_text);
                        app.emit("chat_message_chunk", MessageChunk { text: partial_text, chat_id: reply_chat_for_task.id }).context("Failed to emit message chunk")?;
                    }
                    Err(e) => {
                        error!("Error generating text: {:?}", e);
                        break;
                    }
                }
            }

            reply_chat_for_task.message = message;

            sqlx::query("INSERT INTO chats (id, summary_id, message, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
                .bind(reply_chat_for_task.id)
                .bind(reply_chat_for_task.summary_id)
                .bind(reply_chat_for_task.message)
                .bind(reply_chat_for_task.role)
                .bind(reply_chat_for_task.created_at)
                .bind(reply_chat_for_task.updated_at)
                .execute(&pool_for_task)
                .await
                .context("Failed to insert assistant chat")?;

            Ok::<(), anyhow::Error>(())
        }).await
        {
            error!("Error in send_message task: {:?}", e);
        }
    });

    sqlx::query("INSERT INTO chats (id, summary_id, message, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(new_send_chat.id)
        .bind(new_send_chat.summary_id)
        .bind(&new_send_chat.message)
        .bind(&new_send_chat.role)
        .bind(new_send_chat.created_at)
        .bind(new_send_chat.updated_at)
        .execute(&pool)
        .await
        .context("Failed to insert user chat")?;

    Ok(vec![new_send_chat, new_reply_chat])
}
