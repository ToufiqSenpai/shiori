use std::io;

use serde::Serialize;
use serde_json::Value;
use strum_macros::Display;

#[derive(Debug, Display, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[serde(tag = "code", content = "details")]
pub enum ErrorCode {
    Unknown,
    NotFound(String),
    InvalidInput(Value),
    DatabaseError,
    NetworkError,
    #[serde(serialize_with = "serialize_io_error_kind")]
    IoError(io::ErrorKind),
}

fn serialize_io_error_kind<S>(kind: &io::ErrorKind, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_str(&format!("{:?}", kind))
}

impl ErrorCode {
    pub fn invalid_input<T: Serialize>(value: T) -> Self {
        Self::InvalidInput(serde_json::to_value(value).unwrap_or(Value::Null))
    }
}

impl From<anyhow::Error> for ErrorCode {
  fn from(value: anyhow::Error) -> Self {
    map_anyhow_to_code(&value)
  }
}

fn map_anyhow_to_code(err: &anyhow::Error) -> ErrorCode {
    for cause in err.chain() {
        if let Some(io_err) = cause.downcast_ref::<io::Error>() {
            return ErrorCode::IoError(io_err.kind());
        } else if let Some(sqlx_err) = cause.downcast_ref::<sqlx::Error>() {
            return map_sqlx_to_code(sqlx_err);
        }
    }

    ErrorCode::Unknown
}

fn map_sqlx_to_code(err: &sqlx::Error) -> ErrorCode {
    match err {
        sqlx::Error::RowNotFound => ErrorCode::NotFound("Record not found".to_string()),
        sqlx::Error::Io(io_err) => ErrorCode::IoError(io_err.kind()),
        _ => ErrorCode::DatabaseError,
    }
}
