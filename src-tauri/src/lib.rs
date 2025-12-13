// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod api;
pub mod features;
pub mod security;
pub mod state;

use crate::features::model::commands::*;
use crate::state::download::DownloadManager;
use crate::state::AppState;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.manage(AppState {
                download_manager: DownloadManager::new(app.handle().clone()),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // // Model command
            get_speech_to_text_models,
            set_text_generation_api_key,
            download_speech_to_text_model
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
