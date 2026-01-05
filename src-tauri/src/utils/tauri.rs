use std::sync::Arc;
use anyhow::{Context, Result};
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_store::{Store, StoreExt};

pub fn get_settings_store(app: &AppHandle) -> Result<Arc<Store<Wry>>> {
    let store = app
        .store(
            app.path()
                .app_config_dir()
                .context("Could not determine app config directory")?
                .join("settings.json"),
        )
        .context("Failed to load settings store")?;

    Ok(store)
}
