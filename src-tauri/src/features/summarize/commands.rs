use std::{path::PathBuf, vec};

use crate::{error::ErrorCode, features::{
    model::{
        speech_to_text::{Segment, SpeechToTextModel, Whisper},
        text_generation::{Message, Role, get_text_generation},
    },
    summarize::{
        audio::load_f32le_audio,
        entities::Summary,
        language::{Language, LanguageInfo},
    },
}, utils::tauri::get_settings_store};
use anyhow::{Context, Result};
use serde::Serialize;
use sqlx::SqlitePool;
use strum::IntoEnumIterator;
use tauri::{AppHandle, Emitter, Manager, State};
use tracing::{error, info};
use uuid::Uuid;

#[tauri::command]
pub async fn get_languages() -> Vec<LanguageInfo> {
    Language::iter().map(LanguageInfo::from).collect()
}

#[tauri::command]
pub async fn get_summary(
    database: State<'_, SqlitePool>,
    summary_id: u32,
) -> Result<Summary, ErrorCode> {
    let record = sqlx::query_as::<_, Summary>("SELECT * FROM summaries WHERE id = ?")
        .bind(summary_id)
        .fetch_one(database.inner())
        .await
        .context("Failed to fetch summary from database")?;

    Ok(record)
}

#[tauri::command]
pub async fn get_summaries(database: State<'_, SqlitePool>) -> Result<Vec<Summary>, ErrorCode> {
    let records = sqlx::query_as::<_, Summary>("SELECT * FROM summaries ORDER BY created_at DESC")
        .fetch_all(database.inner())
        .await
        .context("Failed to fetch summaries from database")?;
    Ok(records)
}

#[tauri::command]
pub async fn delete_summary(
    database: State<'_, SqlitePool>,
    summary_id: Uuid,
) -> Result<(), ErrorCode> {
    // Delete the summary
    let result = sqlx::query("DELETE FROM summaries WHERE id = ?")
        .bind(&summary_id)
        .execute(database.inner())
        .await
        .context("Failed to delete summary")?;

    if result.rows_affected() == 0 {
        return Err(ErrorCode::NotFound(format!(
            "Summary with id {} not found",
            summary_id
        )));
    }

    info!("Successfully deleted summary: {}", summary_id);

    Ok(())
}

#[derive(Clone, Serialize)]
struct SummarizationProgress {
    pub message: String,
    #[serde(rename = "currentStep")]
    pub current_step: u8,
    #[serde(rename = "totalSteps")]
    pub total_steps: u8,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<Summary>,
}

#[tauri::command]
pub async fn summarize(
    app: AppHandle,
    sqlite: State<'_, SqlitePool>,
    language: Language,
    file_path: String,
) -> Result<(), ErrorCode> {
    info!("Starting summarization for file: {:?}", file_path);

    let database = sqlite.inner().clone();

    tokio::spawn(async move {
        if let Err(e) = async {
            let mut tx = database
                .begin()
                .await
                .context("Failed to begin database transaction")?;
            let store = get_settings_store(&app)
                .context("Failed to get settings store")?;
            let stt_model: SpeechToTextModel = serde_json::from_value(
                store
                    .get("model.speechToText")
                    .context("Failed to get speechToText model from settings store")?,
            )
            .context("Failed to parse speech-to-text model from settings")?;

            let speech_to_text = Whisper::new(
                app.path()
                    .app_local_data_dir()
                    .context("Could not determine app local data directory")?
                    .join("models")
                    .join(stt_model.filename()),
            );
            let text_generation = get_text_generation(store.as_ref())
                .await
                .context("Failed to initialize text generation model")?;

            // Helper closure for emitting progress
            let emit_progress = |message: &str, step: u8, summary: Option<Summary>| {
                app.emit(
                    "summarization_progress",
                    SummarizationProgress {
                        message: message.to_string(),
                        current_step: step,
                        total_steps: 4,
                        summary,
                    },
                )
                .context("Failed to emit summarization progress event")
            };

            // Step 1: Load audio
            emit_progress("Loading audio...", 1, None)?;
            let audio_data = load_f32le_audio(&PathBuf::from(&file_path))
                .await
                .context("Failed to load audio data")?;

            // Step 2: Transcribe audio
            emit_progress("Transcribing audio...", 2, None)?;
            let segments = speech_to_text
                .transcribe(audio_data, language)
                .await
                .context("Failed to transcript audio")?;

            // Step 3: Generate summary and title
            emit_progress("Generating summary...", 3, None)?;
            let summarize_result = text_generation
                .generate_text(
                    vec![
                        Message {
                            role: Role::System,
                            text: get_summary_prompt(language),
                        },
                        Message {
                            role: Role::User,
                            text: segments_to_text(segments.clone()),
                        },
                    ],
                )
                .await
                .context("Failed to generate summary text")?
                .into_iter()
                .last()
                .map(|m| m.text)
                .unwrap_or_default();

            let summary_title = text_generation
                .generate_text(
                    vec![
                        Message {
                            role: Role::System,
                            text:
                            "
                            You will receive a summarized personal note written in Markdown.

                            Assume this summary represents the main content of a personal voice note.
                            Your task is to generate a **short, clear, and descriptive title** based only on the summary content.

                            Title requirements:
                            - One line only
                            - No punctuation at the end
                            - No quotation marks
                            - No emojis
                            - Do not add information not present in the summary
                            - Keep it concise and neutral

                            Write the title in the same language as the summary.
                            ".to_string(),
                        },
                        Message {
                            role: Role::User,
                            text: summarize_result.clone(),
                        },
                    ]
                )
                .await
                .context("Failed to generate summary title")?
                .into_iter()
                .last()
                .map(|m| m.text)
                .unwrap_or_else(|| "Untitled Summary".to_string());

            // Save to database
            let summary_id = Uuid::new_v4();
            sqlx::query(
                "INSERT INTO summaries (id, title, language, summary, file_path) VALUES (?, ?, ?, ?, ?)",
            )
            .bind(&summary_id)
            .bind(&summary_title)
            .bind(language.code())
            .bind(&summarize_result)
            .bind(&file_path)
            .execute(&mut *tx)
            .await
            .context("Failed to insert summary into database")?;

            for segment in segments {
                let transcript_id = Uuid::new_v4();
                sqlx::query(
                    "INSERT INTO summary_transcripts (id, summary_id, text, start_time, end_time) VALUES (?, ?, ?, ?, ?)"
                )
                .bind(&transcript_id)
                .bind(&summary_id)
                .bind(&segment.text)
                .bind(segment.start)
                .bind(segment.end)
                .execute(&mut *tx)
                .await
                .context("Failed to insert summary transcript into database")?;
            }

            tx.commit()
                .await
                .context("Failed to commit database transaction")?;

            // Fetch the inserted summary
            let summary = sqlx::query_as::<_, Summary>("SELECT * FROM summaries WHERE id = ?")
                .bind(&summary_id)
                .fetch_one(&database)
                .await
                .context("Failed to fetch inserted summary")?;

            // Step 4: Emit completion
            emit_progress("Completed!", 4, Some(summary))?;

            Ok::<(), anyhow::Error>(())
        }
        .await
        {
            error!(error = %e, "Error during summarization");
        }
    });

    Ok(())
}

fn get_summary_prompt(language: Language) -> String {
    format!(
        "
        You will receive an audio transcription generated by Whisper.
        The transcription consists of multiple segments with the text attribute.
        Ignore the timing information and focus only on the textual content.

        *Transcription language:* {}

        Assume this transcription is a *personal voice note recorded by the user*.
        Your task is to transform the raw transcription into a *concise note that is easy to read and review later.*

        *When summarizing:*
        - Combine all segments into a coherent understanding
        - Remove repetitions, filler words, and unimportant fragments
        - Preserve the main ideas, thoughts, or information worth

        *Output requirements*:
        - Use Markdown format
        - Use short paragraphs or bullet points when appropriate
        - Do not include timestamps or segment references

        Write the summary in {} using clear, natural, and concise wording.
        Do not add any information that is not present in the transcription.
        ",
        language.to_display_name(),
        language.to_display_name()
    )
}

fn segments_to_text(segments: Vec<Segment>) -> String {
    let content = segments
        .iter()
        .map(|s| s.text.trim())
        .filter(|t| !t.is_empty())
        .collect::<Vec<_>>()
        .join("\n");

    format!("<transcription>\n{}\n</transcription>", content)
}
