use anyhow::Result;
use keyring::Entry;
use tracing::debug;

pub struct SecretManager;

impl SecretManager {
    const SERVICE_NAME: &'static str = "shiori";

    fn entry(key: &str) -> Result<Entry, keyring::Error> {
        debug!(
            service_name = Self::SERVICE_NAME,
            key, "SecretManager::entry"
        );
        Entry::new(Self::SERVICE_NAME, key)
    }

    pub fn set(key: &str, value: &str) -> Result<(), keyring::Error> {
        Self::entry(key)?.set_password(value)
    }

    pub fn get(key: &str) -> Result<String, keyring::Error> {
        Self::entry(key)?.get_password()
    }
}
