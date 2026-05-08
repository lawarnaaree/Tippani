pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::vault::vault_list,
            commands::vault::note_read,
            commands::vault::note_write,
            commands::vault::note_write_bytes,
            commands::vault::note_create,
            commands::vault::note_rename,
            commands::vault::note_delete,
            commands::vault::config_get_last_vault,
            commands::vault::config_set_last_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
