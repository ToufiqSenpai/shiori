use once_cell::sync::Lazy;
use reqwest::redirect::Policy as RedirectPolicy;
use reqwest::Client;
use std::env::var;

pub static HTTP: Lazy<Client> = Lazy::new(|| {
    let agent_name =
        var("TAURI_ENV_PKG_PRODUCT_NAME").unwrap_or_else(|_| env!("CARGO_PKG_NAME").to_string());
    let agent_version =
        var("TAURI_ENV_PKG_VERSION").unwrap_or_else(|_| env!("CARGO_PKG_VERSION").to_string());

    Client::builder()
        .redirect(RedirectPolicy::limited(10))
        .user_agent(format!("{}/{}", agent_name, agent_version))
        .build()
        .unwrap()
});
