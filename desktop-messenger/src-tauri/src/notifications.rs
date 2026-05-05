use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub fn send_message_notification(
    app: &AppHandle,
    sender: &str,
    body: &str,
) -> Result<(), String> {
    let preview = if body.len() > 140 {
        format!("{}…", &body[..140])
    } else {
        body.to_string()
    };
    app.notification()
        .builder()
        .title(format!("New message from {}", sender))
        .body(preview)
        .show()
        .map_err(|e| e.to_string())?;
    Ok(())
}
