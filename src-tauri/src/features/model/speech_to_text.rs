use std::{path::PathBuf, thread};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;
use tokio::sync::oneshot;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

use crate::features::summarize::language::Language;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, EnumIter)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechToTextModel {
    Tiny,
    Base,
    Small,
    Medium,
    LargeTurbo,
    Large,
}

impl SpeechToTextModel {
    pub fn filename(&self) -> &'static str {
        match self {
            SpeechToTextModel::Tiny => "ggml-tiny-q8_0.bin",
            SpeechToTextModel::Base => "ggml-base-q8_0.bin",
            SpeechToTextModel::Small => "ggml-small-q8_0.bin",
            SpeechToTextModel::Medium => "ggml-medium-q8_0.bin",
            SpeechToTextModel::LargeTurbo => "ggml-large-v3-turbo-q8_0.bin",
            SpeechToTextModel::Large => "ggml-large-v3.bin",
        }
    }

    pub fn download_url(&self) -> &'static str {
        match self {
            SpeechToTextModel::Tiny => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny-q8_0.bin",
            SpeechToTextModel::Base => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q8_0.bin",
            SpeechToTextModel::Small => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q8_0.bin",
            SpeechToTextModel::Medium => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
            SpeechToTextModel::LargeTurbo => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin",
            SpeechToTextModel::Large => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3.bin",
        }
    }

    pub fn checksum(&self) -> &'static str {
        match self {
            SpeechToTextModel::Tiny => "19e8118f6652a650569f5a949d962154e01571d9",
            SpeechToTextModel::Base => "7bb89bb49ed6955013b166f1b6a6c04584a20fbe",
            SpeechToTextModel::Small => "bcad8a2083f4e53d648d586b7dbc0cd673d8afad",
            SpeechToTextModel::Medium => "e66645948aff4bebbec71b3485c576f3d63af5d6",
            SpeechToTextModel::LargeTurbo => "01bf15bedffe9f39d65c1b6ff9b687ea91f59e0e",
            SpeechToTextModel::Large => "ad82bf6a9043ceed055076d0fd39f5f186ff8062",
        }
    }
}

#[derive(Clone)]
pub struct Segment {
    pub text: String,
    pub start: f64,
    pub end: f64,
}

pub struct Whisper {
    model_path: PathBuf,
}

impl Whisper {
    pub fn new(model_path: PathBuf) -> Self {
        Self { model_path }
    }

    pub async fn transcribe(
        &self,
        audio_data: Vec<f32>,
        language: Language,
    ) -> Result<Vec<Segment>> {
        let model_path = self.model_path.clone();
        let (tx, rx) = oneshot::channel();

        thread::Builder::new()
        .name("whisper-transcription".to_string())
        .stack_size(10 * 1024 * 1024) // 10 MB stack size
        .spawn(move || {
            let result = (|| -> anyhow::Result<Vec<Segment>> {
                let ctx = WhisperContext::new_with_params(
                    model_path.to_string_lossy().as_ref(),
                    WhisperContextParameters::default(),
                )
                .context("Failed to create Whisper context")?;

                let mut params = FullParams::new(SamplingStrategy::BeamSearch {
                    beam_size: 5,
                    patience: -1.0,
                });

                params.set_print_realtime(false);
                params.set_print_progress(false);

                params.set_language(Some(language.code()));

                let mut state = ctx
                    .create_state()
                    .context("Failed to create Whisper state")?;

                state
                    .full(params, &audio_data[..])
                    .context("Failed to run full transcription")?;

                let segments = state
                    .as_iter()
                    .map(|segment| Segment {
                        text: segment.to_string(),
                        start: (segment.start_timestamp() as f64) / 100.0,
                        end: (segment.end_timestamp() as f64) / 100.0,
                    })
                    .collect::<Vec<Segment>>();

                Ok(segments)
            })();

            // Kirim hasil balik ke async caller
            let _ = tx.send(result);
        })
        .context("Failed to spawn transcription thread")?;

        rx.await.context("Transcription thread panicked")?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::features::summarize::audio::load_f32le_audio;

    #[tokio::test]
    async fn test_whisper_transcription() -> Result<()> {
        let audio_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join("video")
            .join("stt.mp4");
        let audio_data = load_f32le_audio(&audio_path).await?;
        let whisper =
            Whisper::new(PathBuf::from("D:\\Rust\\ml-research\\models\\ggml-medium-q8_0.bin"));

        let segments = whisper.transcribe(audio_data, Language::EnUs).await?;

        for segment in segments {
            println!("{}", segment.text);
        }

        Ok(())
    }
}
