// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
pub mod api;
pub mod error;
pub mod features;
pub mod security;
pub mod state;
pub mod utils;

use crate::features::chat::commands::*;
use crate::features::model::commands::*;
use crate::features::summarize::commands::*;
use crate::state::download::DownloadManager;
use crate::state::AppState;

use std::panic;
use std::path::PathBuf;

use sqlx::migrate::Migrator;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tauri::path::BaseDirectory;
use tauri::Manager;
use tracing_appender::rolling;
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

fn install_panic_hook() {
    panic::set_hook(Box::new(|panic_info| {
        let payload = panic_info.payload();
        let message = if let Some(s) = payload.downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = payload.downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown error occurred".to_string()
        };

        rfd::MessageDialog::new()
            .set_level(rfd::MessageLevel::Error)
            .set_title("Application Crashed")
            .set_description(&format!(
                "The application encountered a fatal error:\n\n{}",
                message
            ))
            .show();
    }));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    install_panic_hook();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Setup logging
            let file_appender = rolling::daily(app.path().app_log_dir().unwrap(), "app.log");
            let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);
            let file_layer = fmt::layer()
                .json() // output JSON
                .with_writer(non_blocking)
                .with_target(true) // module path
                .with_level(true) // level info/error
                .with_thread_ids(true)
                .with_thread_names(true)
                .with_file(true)
                .with_line_number(true);
            let console_layer = fmt::layer().pretty().with_writer(std::io::stdout);
            tracing_subscriber::registry()
                .with(file_layer)
                .with(console_layer)
                .init();

            // Setup application state
            app.manage(AppState {
                download_manager: DownloadManager::new(app.handle().clone()),
            });

            // Setup database
            let db_path = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .join("app.sqlite");

            if let Some(parent) = db_path.parent() {
                std::fs::create_dir_all(parent).expect("Failed to create app data directory");
            }
            let db_pool = tauri::async_runtime::block_on(async {
                let connect_options = SqliteConnectOptions::new()
                    .filename(db_path)
                    .create_if_missing(true);

                let pool = SqlitePoolOptions::new()
                    .connect_with(connect_options)
                    .await
                    .expect("Failed to connect to the database");

                let migrations_dir: PathBuf = app
                    .path()
                    .resolve("migrations", BaseDirectory::Resource)
                    .expect("migrations folder not found");

                let migrator = Migrator::new(migrations_dir)
                    .await
                    .expect("Failed to initialize database migrator");
                migrator
                    .run(&pool)
                    .await
                    .expect("Failed to run database migrations");

                pool
            });
            app.manage(db_pool);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Chat commands
            get_chats,
            send_message,
            // Model command
            get_speech_to_text_models,
            download_speech_to_text_model,
            set_text_generation_api_key,
            get_text_generation_models,
            // Summarize command
            get_languages,
            get_summary,
            get_summaries,
            delete_summary,
            summarize
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
