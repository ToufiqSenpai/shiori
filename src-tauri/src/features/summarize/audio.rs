use anyhow::{Context, Error, Result};
use infer::Infer;
use std::path::PathBuf;
use std::process::Stdio;
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::process::Command;

const ALLOWED_FILE_MIMETYPES: [&'static str; 10] = [
    "audio/mpeg",
    "audio/x-wav",
    "audio/m4a",
    "audio/ogg",
    "audio/x-flac",
    "video/mp4",
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
    "video/quicktime",
];

async fn validate_file_type(path: &PathBuf) -> Result<(), Error> {
    let mut file = File::open(path).await.context("Failed to open file.")?;
    let mut buffer = [0u8; 8192];
    let n = file.read(&mut buffer).await?;
    let infer = Infer::new();
    let kind = infer
        .get(&buffer[..n])
        .context("Could not determine file type")?;

    if !ALLOWED_FILE_MIMETYPES.contains(&kind.mime_type()) {
        return Err(Error::msg(format!(
            "Unsupported file type: {}",
            kind.mime_type()
        )));
    }

    Ok(())
}

fn get_ffmpeg_path() -> PathBuf {
    if cfg!(debug_assertions) {
        // Development mode - use ffmpeg from PATH
        PathBuf::from("ffmpeg")
    } else {
        // Release mode - use bundled ffmpeg in executable directory
        let exe_dir = std::env::current_exe()
            .expect("Failed to get executable path")
            .parent()
            .expect("Failed to get executable directory")
            .to_path_buf();

        #[cfg(target_os = "windows")]
        let ffmpeg_name = "ffmpeg.exe";

        #[cfg(not(target_os = "windows"))]
        let ffmpeg_name = "ffmpeg";

        exe_dir.join("bin").join(ffmpeg_name)
    }
}

pub async fn load_f32le_audio(path: &PathBuf) -> Result<Vec<f32>> {
    validate_file_type(&path)
        .await
        .context("Failed to validate file type")?;

    let ffmpeg_path = get_ffmpeg_path();
    let output = Command::new(&ffmpeg_path)
        .arg("-i")
        .arg(&path)
        .args(&[
            "-vn", // Disable video recording
            "-acodec",
            "pcm_f32le", // 32-bit float codec
            "-ar",
            "16000", // 16khz sample rate
            "-ac",
            "1", // Mono channel
            "-f",
            "f32le",  // Output format (raw PCM 32-bit little-endian)
            "pipe:1", // Output to Stdout
        ])
        .stdout(Stdio::piped()) // Capture stdout
        .stderr(Stdio::piped()) // Capture stderr (untuk debug error)
        .output()
        .await
        .context("Failed to execute ffmpeg command")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(Error::msg(format!(
            "ffmpeg command failed with error: {}",
            stderr
        )));
    }

    let bytes = output.stdout;
    if bytes.len() % 4 != 0 {
        return Err(Error::msg("Invalid f32le audio data length"));
    }

    let audio_data = bytes
        .chunks_exact(4)
        .map(|chunk| f32::from_le_bytes([chunk[0], chunk[1], chunk[2], chunk[3]]))
        .collect::<Vec<f32>>();

    Ok(audio_data)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{env, path::PathBuf};

    fn get_base_path() -> PathBuf {
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap())
            .join("tests")
            .join("fixtures")
    }

    #[tokio::test]
    async fn test_validate_file_type() {
        let base_path = get_base_path();
        let audio_path = base_path.join("audio");
        let video_path = base_path.join("video");

        let test_cases = vec![
            audio_path.join("audio.mp3"),
            audio_path.join("audio.wav"),
            audio_path.join("audio.m4a"),
            audio_path.join("audio.ogg"),
            audio_path.join("audio.flac"),
            video_path.join("video.mp4"),
            video_path.join("video.webm"),
            video_path.join("video.mkv"),
            video_path.join("video.avi"),
            video_path.join("video.mov"),
        ];

        for path in test_cases {
            validate_file_type(&path).await.unwrap();
        }
    }

    #[tokio::test]
    async fn test_load_f32le_audio() {
        let base_path = get_base_path();
        let audio_path = base_path.join("audio");
        let video_path = base_path.join("video");

        let test_cases = vec![
            audio_path.join("audio.mp3"),
            audio_path.join("audio.wav"),
            audio_path.join("audio.m4a"),
            audio_path.join("audio.ogg"),
            audio_path.join("audio.flac"),
            video_path.join("video.mp4"),
            video_path.join("video.webm"),
            video_path.join("video.mkv"),
            video_path.join("video.avi"),
            video_path.join("video.mov"),
        ];

        for path in test_cases {
            let f32le_data = load_f32le_audio(&path).await.unwrap();
            assert!(!f32le_data.is_empty());
        }
    }
}
