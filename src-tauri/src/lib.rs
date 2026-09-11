#[tauri::command]
fn healthcheck() -> &'static str {
    "ok"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(network::Generations(std::sync::Mutex::new(
            std::collections::HashMap::new(),
        )))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            let database = database::open(&app.handle())?;
            app.manage(database);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            healthcheck,
            commands::list_providers,
            commands::save_provider,
            commands::delete_provider,
            commands::list_models,
            commands::save_model,
            commands::create_conversation,
            commands::list_conversations,
            commands::rename_conversation,
            commands::delete_conversation,
            commands::list_messages,
            commands::usage_summary,
            commands::export_data,
            commands::import_data,
            network::start_generation,
            network::cancel_generation
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Relay desktop application");
}
mod commands;
mod credentials;
mod database;
mod models;
mod network;

use tauri::Manager;
