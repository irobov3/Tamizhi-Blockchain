use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

pub fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_i = MenuItem::with_id(app, "open", "Open Tamizhi Messenger", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open_i, &settings_i, &quit_i])?;

    let _tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("Tamizhi Messenger")
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.unminimize();
                    let _ = win.set_focus();
                }
            }
            "settings" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                    let _ = win.eval("window.dispatchEvent(new CustomEvent('open-settings'))");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            // Click-to-focus on left click
            if let TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}

pub fn update_unread(app: &AppHandle, count: u32) -> tauri::Result<()> {
    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if count == 0 {
            "Tamizhi Messenger".to_string()
        } else {
            format!("Tamizhi Messenger — {} unread", count)
        };
        tray.set_tooltip(Some(tooltip))?;
    }
    Ok(())
}
