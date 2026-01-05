use super::speech_to_text::SpeechToTextModel;
use crate::{
    api::HTTP, error::ErrorCode, features::model::text_generation::{Model, Provider, gemini::Gemini}, state::{
        AppState, download::{Checksum, FileDownload}
    }
};
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use strum::IntoEnumIterator;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
pub struct GetSpeechToTextModelResult {
    pub model: SpeechToTextModel,
    pub size: u64,
}

#[derive(Debug, Deserialize)]
struct RepositoryTree {
    pub size: u64,
    pub path: String
}

#[tauri::command]
pub async fn get_speech_to_text_models() -> Result<Vec<GetSpeechToTextModelResult>, ErrorCode> {
    let stt_filenames = SpeechToTextModel::iter()
        .map(|model| model.filename())
        .collect::<Vec<&str>>();
    
    let models = HTTP
        .get("https://huggingface.co/api/models/ggerganov/whisper.cpp/tree/main")
        .send()
        .await
        .context("Failed to fetch repository files for ggerganov/whisper.cpp")?
        .json::<Vec<RepositoryTree>>()
        .await
        .context("Failed to parse repository files response in JSON format")?
        .into_iter()
        .filter(|file| stt_filenames.contains(&file.path.as_str()))
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
        .collect::<Vec<GetSpeechToTextModelResult>>();

    Ok(models)
}

#[tauri::command]
pub async fn download_speech_to_text_model(
    app: AppHandle,
    model: SpeechToTextModel,
) -> Result<(), ErrorCode> {
    let save_path = app
        .path()
        .app_local_data_dir()
        .context("Failed to get app local data directory")?
        .join("models");

    app.state::<AppState>()
        .download_manager
        .start(FileDownload::new(
            model.download_url().to_string(),
            save_path,
            Some(Checksum::Sha1(model.checksum().to_string())),
        ))
        .await
        .context("Failed to start download")?;

    Ok(())
}

#[tauri::command]
pub async fn set_text_generation_api_key(
    provider: Provider,
    api_key: String,
) -> Result<bool, ErrorCode> {
    match provider {
        Provider::Gemini => {
            let is_valid = Gemini::set_api_key(api_key)
                .await
                .context("Error setting Gemini API key")?;

            Ok(is_valid)
        }
    }
}

#[tauri::command]
pub async fn get_text_generation_models() -> Result<Vec<Model>, ErrorCode> {
    let gemini_models = Gemini::get_models()
        .await
        .context("Error fetching Gemini models")?;

    Ok(gemini_models)
}
