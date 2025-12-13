use super::speech_to_text::SpeechToTextModel;
use crate::{
    api::hugging_face::get_repository_files,
    features::model::text_generation::{Gemini, TextGeneration, TextGenerationProvider},
    state::{
        download::{Checksum, FileDownload},
        AppState,
    },
};
use anyhow::Result;
use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct GetSpeechToTextModelResult {
    pub model: SpeechToTextModel,
    pub size: u64,
}

#[tauri::command]
pub async fn get_speech_to_text_models() -> Result<Vec<GetSpeechToTextModelResult>, String> {
    let whisper_models = vec![
        "ggml-tiny-q8_0.bin",
        "ggml-base-q8_0.bin",
        "ggml-small-q8_0.bin",
        "ggml-medium-q8_0.bin",
        "ggml-large-v3-turbo-q8_0.bin",
        "ggml-large-v3.bin",
    ];

    let files = get_repository_files("ggerganov", "whisper.cpp")
        .await
        .map_err(|e| format!("Error fetching repository files: {}", e))?
        .iter()
        .filter(|file| whisper_models.contains(&file.path.as_str()))
        .map(|file| GetSpeechToTextModelResult {
            model: match file.path.as_str() {
                "ggml-tiny-q8_0.bin" => SpeechToTextModel::Tiny,
                "ggml-base-q8_0.bin" => SpeechToTextModel::Base,
                "ggml-small-q8_0.bin" => SpeechToTextModel::Small,
                "ggml-medium-q8_0.bin" => SpeechToTextModel::Medium,
                "ggml-large-v3-turbo-q8_0.bin" => SpeechToTextModel::LargeTurbo,
                "ggml-large-v3.bin" => SpeechToTextModel::Large,
                _ => unreachable!(),
            },
            size: file.size,
        })
        .collect();

    Ok(files)
}

#[tauri::command]
pub async fn set_text_generation_api_key(
    provider: TextGenerationProvider,
    api_key: String,
) -> Result<bool, String> {
    match provider {
        TextGenerationProvider::Gemini => {
            let is_valid = Gemini::set_api_key(api_key)
                .await
                .map_err(|e| format!("Error setting Gemini API key: {}", e))?;

            Ok(is_valid)
        }
    }
}

#[tauri::command]
pub async fn download_speech_to_text_model(
    app: AppHandle,
    model: SpeechToTextModel,
) -> Result<(), String> {
    let (url, checksum) = match model {
        SpeechToTextModel::Tiny => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q8_0.bin",
            "19e8118f6652a650569f5a949d962154e01571d9",
        ),
        SpeechToTextModel::Base => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q8_0.bin",
            "7bb89bb49ed6955013b166f1b6a6c04584a20fbe",
        ),
        SpeechToTextModel::Small => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q8_0.bin",
            "bcad8a2083f4e53d648d586b7dbc0cd673d8afad",
        ),
        SpeechToTextModel::Medium => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
            "e66645948aff4bebbec71b3485c576f3d63af5d6",
        ),
        SpeechToTextModel::LargeTurbo => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin",
            "01bf15bedffe9f39d65c1b6ff9b687ea91f59e0e",
        ),
        SpeechToTextModel::Large => (
            "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
            "ad82bf6a9043ceed055076d0fd39f5f186ff8062",
        ),
    };

    let save_path = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app local data directory: {}", e))?
        .join("models");

    app.state::<AppState>()
        .download_manager
        .start(FileDownload::new(
            url,
            save_path,
            Some(Checksum::Sha1(checksum.to_string())),
        ))
        .await
        .map_err(|e| format!("Failed to start download: {}", e))?;

    Ok(())
}
