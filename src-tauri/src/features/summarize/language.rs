use std::{fmt, str::FromStr};

use serde::{Deserialize, Serialize};
use sqlx::{
    sqlite::{SqliteArgumentValue, SqliteValueRef},
    Decode, Encode, Sqlite, Type,
};
use strum_macros::EnumIter;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, EnumIter)]
pub enum Language {
    #[serde(rename = "en")]
    EnUs,
    #[serde(rename = "id")]
    IdId,
    #[serde(rename = "ja")]
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

    // return ISO 639-1 code
    pub fn code(&self) -> &'static str {
        match self {
            Language::EnUs => "en",
            Language::IdId => "id",
            Language::JaJp => "ja",
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

impl fmt::Display for Language {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.code())
    }
}

impl FromStr for Language {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "en" => Ok(Language::EnUs),
            "id" => Ok(Language::IdId),
            "ja" => Ok(Language::JaJp),
            _ => Err(()),
        }
    }
}

impl Type<Sqlite> for Language {
    fn type_info() -> sqlx::sqlite::SqliteTypeInfo {
        <String as Type<Sqlite>>::type_info()
    }
}

impl<'r> Decode<'r, Sqlite> for Language {
    fn decode(value: SqliteValueRef<'r>) -> Result<Self, sqlx::error::BoxDynError> {
        let s = <String as Decode<Sqlite>>::decode(value)?;
        Language::from_str(&s).map_err(|_| format!("invalid language value in db: {}", s).into())
    }
}

impl<'q> Encode<'q, Sqlite> for Language {
    fn encode_by_ref(
        &self,
        args: &mut Vec<SqliteArgumentValue<'q>>,
    ) -> Result<sqlx::encode::IsNull, sqlx::error::BoxDynError> {
        let s = self.to_string();
        <String as Encode<Sqlite>>::encode(s, args)
    }
}
