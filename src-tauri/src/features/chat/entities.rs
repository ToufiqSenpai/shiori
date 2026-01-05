use chrono::NaiveDateTime;
use serde::Serialize;
use sqlx::prelude::FromRow;
use uuid::Uuid;

use crate::features::model::text_generation::Role;

#[derive(Clone, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: Uuid,
    pub summary_id: Uuid,
    pub message: String,
    pub role: Role,
    pub created_at: NaiveDateTime,
    pub updated_at: NaiveDateTime,
}
