use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::prelude::FromRow;
use uuid::Uuid;

#[derive(Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub id: Uuid,
    pub title: String,
    pub language: String,
    pub summary: String,
    pub file_path: String,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}

#[derive(FromRow, Serialize)]
pub struct SummaryTranscript {
    pub id: Uuid,
    pub summary_id: Uuid,
    pub text: String,
    pub start_time: f64,
    pub end_time: f64,
    pub created_at: NaiveDateTime,
}
