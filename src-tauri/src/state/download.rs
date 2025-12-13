use crate::api::HTTP;
use anyhow::{Context, Error, Result};
use dashmap::DashMap;
use futures_util::StreamExt;
use reqwest::header;
use serde::{Deserialize, Serialize};
use sha1::{Digest, Sha1};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use tokio::fs::{create_dir_all, File};
use tokio::io::{AsyncReadExt, AsyncWriteExt, BufReader};
use tracing::{debug, error, info};
use url::Url;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDownload {
    pub id: String,
    pub size: usize,

    #[serde(rename = "progressBytes")]
    pub progress_bytes: usize,
    #[serde(rename = "speedBytes")]
    pub speed_bytes: usize,
    pub url: String,

    #[serde(rename = "savePath")]
    pub save_path: PathBuf,
    pub name: Option<String>,
    pub checksum: Option<Checksum>,
    pub status: DownloadStatus,
}

impl FileDownload {
    pub fn new(url: &str, save_path: PathBuf, checksum: Option<Checksum>) -> Self {
        FileDownload {
            id: Uuid::new_v4().to_string(),
            size: 0,
            progress_bytes: 0,
            speed_bytes: 0,
            url: url.to_string(),
            save_path,
            name: None,
            checksum,
            status: DownloadStatus::Pending,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload", rename_all = "kebab-case")]
pub enum DownloadEvent {
    Added(FileDownload),
    Progress {
        id: String,
        #[serde(rename = "progressBytes")]
        progress_bytes: usize,
        #[serde(rename = "speedBytes")]
        speed_bytes: usize,
    },
    StatusChanged {
        id: String,
        status: DownloadStatus,
    },
    Error {
        id: String,
        error: String,
    },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Verifying,
    Complete,
    Error(String),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum Checksum {
    Sha1(String),
}

impl Checksum {
    pub async fn validate(&self, file: &mut BufReader<File>) -> Result<bool> {
        match self {
            Checksum::Sha1(expected) => {
                let mut hasher = Sha1::new();
                let mut buffer = [0u8; 8192];

                loop {
                    let n = file.read(&mut buffer).await?;
                    if n == 0 {
                        break;
                    }
                    hasher.update(&buffer[..n]);
                }

                Ok(format!("{:x}", hasher.finalize()) == *expected)
            }
        }
    }
}

pub struct DownloadManager {
    downloads: Arc<DashMap<String, FileDownload>>,
    app: AppHandle,
}

impl DownloadManager {
    pub fn new(app: AppHandle) -> Self {
        DownloadManager {
            downloads: Arc::new(DashMap::new()),
            app,
        }
    }

    pub async fn start(&self, mut file_download: FileDownload) -> Result<()> {
        // Fetch metadata
        {
            let response = HTTP
                .head(file_download.url.clone())
                .send()
                .await
                .context("Failed to fetch file metadata")?;

            file_download.size = response
                .headers()
                .get(header::CONTENT_LENGTH)
                .and_then(|cl| cl.to_str().ok())
                .and_then(|cl_str| cl_str.parse::<usize>().ok())
                .unwrap_or(0);

            file_download.name = response
                .headers()
                .get(header::CONTENT_DISPOSITION)
                .and_then(|cd| cd.to_str().ok())
                .and_then(|cd_str| parse_content_disposition_filename(cd_str))
                .or_else(|| {
                    Url::parse(&file_download.url).ok().and_then(|url| {
                        url.path_segments()
                            .and_then(|segments| segments.last())
                            .map(|s| s.to_string())
                    })
                });
        }

        self.downloads
            .insert(file_download.id.clone(), file_download.clone());
        self.emit(DownloadEvent::Added(file_download.clone()));

        let download = file_download.clone();
        let downloads = Arc::clone(&self.downloads);
        let download_id = download.id.clone();
        let app = self.app.clone();

        tokio::spawn(async move {
            let emit = |event: DownloadEvent| {
                if let Err(e) = app.emit("download", &event) {
                    error!("Failed to emit download event: {}", e);
                }
            };

            if let Err(e) = async {
                info!(id=%download_id, "Starting download");

                if let Some(mut d) = downloads.get_mut(&download_id) {
                    d.status = DownloadStatus::Downloading;
                    emit(DownloadEvent::StatusChanged {
                        id: download_id.clone(),
                        status: DownloadStatus::Downloading,
                    });
                }

                // Downloading progress
                let (url, save_path, checksum) = {
                    let d = downloads
                        .get(&download_id)
                        .context("Download entry not found")?;
                    (d.url.clone(), d.save_path.clone(), d.checksum.clone())
                };
                let response = HTTP.get(&url).send().await?;
                let filepath = save_path.join(
                    downloads
                        .get(&download_id)
                        .context("Download entry not found")?
                        .name
                        .clone()
                        .unwrap_or_else(|| "download.bin".into()),
                );

                create_dir_all(&save_path)
                    .await
                    .context("Failed to create directories")?;

                debug!(download_id=%download_id, "Downloading to {}", filepath.to_string_lossy());

                let mut file = File::create(&filepath).await.with_context(|| {
                    format!(
                        "Failed to create file at path: {}",
                        filepath.to_string_lossy()
                    )
                })?;
                let mut stream = response.bytes_stream();

                let mut last_emit_time = Instant::now();
                let mut last_progress_bytes: usize = 0;
                const EMIT_INTERVAL_MS: u128 = 1000; // Throttle progress events every second

                while let Some(chunk) = stream.next().await {
                    let data = chunk.context("Failed to read chunk")?;
                    file.write_all(&data)
                        .await
                        .context("Failed to write chunk to file")?;

                    let current_progress = if let Some(mut d) = downloads.get_mut(&download_id) {
                        d.progress_bytes += data.len();
                        d.progress_bytes
                    } else {
                        0
                    };

                    // Throttle progress events
                    let elapsed = last_emit_time.elapsed().as_millis();
                    if elapsed >= EMIT_INTERVAL_MS {
                        let speed_bytes = current_progress.saturating_sub(last_progress_bytes);

                        // Update speed in the download entry
                        if let Some(mut d) = downloads.get_mut(&download_id) {
                            d.speed_bytes = speed_bytes;
                        }

                        emit(DownloadEvent::Progress {
                            id: download_id.clone(),
                            progress_bytes: current_progress,
                            speed_bytes,
                        });

                        last_progress_bytes = current_progress;
                        last_emit_time = Instant::now();
                    }
                }

                // Emit final progress (100%)
                if let Some(d) = downloads.get(&download_id) {
                    emit(DownloadEvent::Progress {
                        id: download_id.clone(),
                        progress_bytes: d.progress_bytes,
                        speed_bytes: 0,
                    });
                }

                info!(id=%download_id, "Download finished, starting verification");

                // Verification
                if let Some(checksum) = checksum {
                    // Update status
                    if let Some(mut d) = downloads.get_mut(&download_id) {
                        d.status = DownloadStatus::Verifying;
                        emit(DownloadEvent::StatusChanged {
                            id: download_id.clone(),
                            status: DownloadStatus::Verifying,
                        });
                    }

                    // Do verification without holding lock
                    let mut reader = BufReader::new(
                        File::open(&filepath)
                            .await
                            .context("Failed to open file for checksum")?,
                    );

                    let valid = checksum
                        .validate(&mut reader)
                        .await
                        .context("Checksum validation failed")?;

                    let mut d = downloads
                        .get_mut(&download_id)
                        .context("Entry missing during checksum update")?;

                    if valid {
                        d.status = DownloadStatus::Complete;
                        info!(id=%download_id, "Checksum OK → Completed");
                    } else {
                        return Err(Error::msg("Checksum mismatch"));
                    }
                } else {
                    if let Some(mut d) = downloads.get_mut(&download_id) {
                        d.status = DownloadStatus::Complete;
                    }
                    info!(id=%download_id, "No checksum provided → Completed");
                }

                emit(DownloadEvent::StatusChanged {
                    id: download_id.clone(),
                    status: DownloadStatus::Complete,
                });

                Ok::<_, Error>(())
            }
            .await
            {
                error!(id=%download_id, error=%e, "Download task failed");

                if let Some(mut d) = downloads.get_mut(&download_id) {
                    d.status = DownloadStatus::Error(e.to_string());
                }

                emit(DownloadEvent::Error {
                    id: download_id.clone(),
                    error: e.to_string(),
                });
            }
        });

        Ok(())
    }

    pub async fn get_all(&self) -> Vec<FileDownload> {
        self.downloads.iter().map(|d| d.value().clone()).collect()
    }

    pub async fn get(&self, id: &str) -> Option<FileDownload> {
        self.downloads.get(id).map(|d| d.value().clone())
    }

    fn emit(&self, event: DownloadEvent) {
        if let Err(e) = self.app.emit("download", &event) {
            error!("Failed to emit download event: {}", e);
        }
    }
}

/// Parse filename from Content-Disposition header
/// Handles formats like:
/// - `attachment; filename="file.bin"`
/// - `attachment; filename=file.bin`
/// - `attachment; filename*=UTF-8''file%20name.bin`
fn parse_content_disposition_filename(header: &str) -> Option<String> {
    // First try filename*= (RFC 5987 extended notation)
    if let Some(start) = header.find("filename*=") {
        let value_start = start + "filename*=".len();
        let rest = &header[value_start..];

        // Format: encoding'language'value (e.g., UTF-8''filename.bin)
        if let Some(quote_pos) = rest.find("''") {
            let encoded = rest[quote_pos + 2..].split(';').next().unwrap_or("").trim();
            // URL decode the filename
            if let Ok(decoded) = urlencoding::decode(encoded) {
                return Some(decoded.into_owned());
            }
        }
    }

    // Fall back to regular filename=
    if let Some(start) = header.find("filename=") {
        let value_start = start + "filename=".len();
        let rest = &header[value_start..];

        // Check if quoted
        if rest.starts_with('"') {
            // Find closing quote
            if let Some(end) = rest[1..].find('"') {
                return Some(rest[1..end + 1].to_string());
            }
        } else {
            // Unquoted - take until semicolon or end
            let filename = rest.split(';').next().unwrap_or("").trim().to_string();
            if !filename.is_empty() {
                return Some(filename);
            }
        }
    }

    None
}
