use crate::api::HTTP;
use anyhow::{Context, Result};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct LfsFile {
    pub oid: String,
    pub size: u64,
    #[serde(rename = "pointerSize")]
    pub pointer_size: i16,
}

#[derive(Debug, Deserialize)]
pub struct RepositoryTree {
    pub r#type: String,
    pub oid: String,
    pub size: u64,
    pub path: String,
    pub lfs: Option<LfsFile>,
}

pub async fn get_repository_files(
    namespace: &str,
    repository: &str,
) -> Result<Vec<RepositoryTree>> {
    let response: Vec<RepositoryTree> = HTTP
        .get(format!(
            "https://huggingface.co/api/models/{}/{}/tree/main",
            namespace, repository
        ))
        .send()
        .await
        .context(format!(
            "Failed to fetch repository files for {}/{}",
            namespace, repository
        ))?
        .json()
        .await
        .context("Failed to parse repository files response in JSON format")?;

    Ok(response)
}
