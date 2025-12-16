use serde::{Deserialize, Serialize};
use strum_macros::EnumIter;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, EnumIter)]
pub enum Language {
    #[serde(rename = "en-US")]
    EnUs,
    #[serde(rename = "id-ID")]
    IdId,
    #[serde(rename = "ja-JP")]
    JaJp,
}

impl Language {
    pub fn to_display_name(&self) -> &'static str {
        match self {
            Language::EnUs => "English (US)",
            Language::IdId => "Bahasa Indonesia",
            Language::JaJp => "日本語",
        }
    }
}

#[derive(Serialize)]
pub struct LanguageInfo {
    pub code: Language,

    #[serde(rename = "displayName")]
    pub display_name: &'static str,
}

impl From<Language> for LanguageInfo {
    fn from(lang: Language) -> Self {
        LanguageInfo {
            code: lang,
            display_name: lang.to_display_name(),
        }
    }
}
