// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    let console_layer = fmt::layer().pretty().with_writer(std::io::stdout);

    tracing_subscriber::registry().with(console_layer).init();

    shiori::run();
}
