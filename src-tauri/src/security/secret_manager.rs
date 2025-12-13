use anyhow::Result;
use keyring::Entry;
use std::env::var;

pub struct SecretManager;

impl SecretManager {
    fn entry(key: &str) -> Result<Entry, keyring::Error> {
        let service_name = var("TAURI_ENV_PKG_PRODUCT_NAME")
            .unwrap_or_else(|_| env!("CARGO_PKG_NAME").to_string());
        Entry::new(&service_name, key)
    }

    pub fn set(key: &str, value: &str) -> Result<(), keyring::Error> {
        Self::entry(key)?.set_password(value)
    }

    pub fn get(key: &str) -> Result<String, keyring::Error> {
        Self::entry(key)?.get_password()
    }
}
