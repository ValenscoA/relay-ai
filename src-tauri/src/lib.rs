#[tauri::command]
fn healthcheck() -> &'static str {
    "ok"
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![healthcheck])
        .run(tauri::generate_context!())
        .expect("failed to run Relay desktop application");
}
