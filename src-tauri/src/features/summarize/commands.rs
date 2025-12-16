use strum::IntoEnumIterator;

use crate::features::summarize::language::{Language, LanguageInfo};

#[tauri::command]
pub async fn get_languages() -> Vec<LanguageInfo> {
    Language::iter().map(LanguageInfo::from).collect()
}
