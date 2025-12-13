use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum SpeechToTextModel {
    Tiny,
    Base,
    Small,
    Medium,
    LargeTurbo,
    Large,
}
