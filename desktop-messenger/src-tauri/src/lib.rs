mod notifications;
mod tray;

use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize)]
pub struct IncomingMessage {
    pub conversation_id: String,
    pub sender: String,
    pub body: String,
}

/// Command invoked from JS to fire a native notification when a message arrives.
#[tauri::command]
fn notify_new_message(app: tauri::AppHandle, msg: IncomingMessage) -> Result<(), String> {
    notifications::send_message_notification(&app, &msg.sender, &msg.body)
}

/// Update the tray icon's tooltip with the unread count.
#[tauri::command]
fn set_unread_badge(app: tauri::AppHandle, count: u32) -> Result<(), String> {
    tray::update_unread(&app, count).map_err(|e| e.to_string())
}

/// Bring the main window to front (used by tray "Open" item and global shortcut).
#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.unminimize();
        let _ = win.set_focus();
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            notify_new_message,
            set_unread_badge,
            focus_main
        ])
        .setup(|app| {
            // Build system tray
            tray::build_tray(app.handle())?;

            // Intercept window close → hide instead of exit (minimize-to-tray UX)
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        let _ = win_clone.hide();
                        api.prevent_close();
                    }
                });
            }

            // Forward an example "ready" event to the frontend.
            let _ = app.emit("desktop-ready", ());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tamizhi Messenger");
}
