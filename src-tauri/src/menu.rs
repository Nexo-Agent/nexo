use tauri::{AppHandle, Emitter};

pub fn create_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::*;

    // File menu items
    let new_chat = MenuItemBuilder::with_id("new_chat", "New Chat")
        .accelerator("CommandOrControl+N")
        .build(app)?;
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .accelerator("CommandOrControl+Q")
        .build(app)?;
    let file_submenu = SubmenuBuilder::new(app, "File")
        .items(&[&new_chat, &quit])
        .build()?;
    // Edit menu items
    let edit_submenu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    // View menu items
    let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar").build(app)?;
    let theme_light = MenuItemBuilder::with_id("theme_light", "Light").build(app)?;
    let theme_dark = MenuItemBuilder::with_id("theme_dark", "Dark").build(app)?;
    let theme_system = MenuItemBuilder::with_id("theme_system", "System").build(app)?;
    // Note: Nested submenus might not be supported, so we'll add theme items directly
    let view_submenu = SubmenuBuilder::new(app, "View")
        .items(&[&toggle_sidebar, &theme_light, &theme_dark, &theme_system])
        .build()?;

    // Settings menu
    let app_settings = MenuItemBuilder::with_id("app_settings", "App Settings")
        .accelerator("CommandOrControl+,")
        .build(app)?;
    let settings_submenu = SubmenuBuilder::new(app, "Settings")
        .items(&[&app_settings])
        .build()?;

    // Help menu
    let documentation = MenuItemBuilder::with_id("documentation", "Documentation").build(app)?;
    let about = MenuItemBuilder::with_id("about", "About").build(app)?;
    let keyboard_shortcuts = MenuItemBuilder::with_id("keyboard_shortcuts", "Keyboard Shortcuts")
        .accelerator("CommandOrControl+/")
        .build(app)?;
    let help_submenu = SubmenuBuilder::new(app, "Help")
        .items(&[&documentation, &about, &keyboard_shortcuts])
        .build()?;

    // Build main menu - MenuBuilder might need items instead of submenus
    // Let's try building a menu with submenus as items
    let menu = MenuBuilder::new(app)
        .items(&[
            &file_submenu,
            &edit_submenu,
            &view_submenu,
            &settings_submenu,
            &help_submenu,
        ])
        .build()?;

    Ok(menu)
}

pub fn handle_menu_event(app: &AppHandle, id: &str) {
    use crate::constants::TauriEvents;
    match id {
        "new_chat" => {
            app.emit(TauriEvents::MENU_NEW_CHAT, ()).ok();
        }
        "quit" => {
            app.exit(0);
        }
        "undo" => {
            // Standard edit commands are handled by the system
            // But we can emit events if needed
            app.emit(TauriEvents::MENU_UNDO, ()).ok();
        }
        "redo" => {
            app.emit(TauriEvents::MENU_REDO, ()).ok();
        }
        "cut" => {
            app.emit(TauriEvents::MENU_CUT, ()).ok();
        }
        "copy" => {
            app.emit(TauriEvents::MENU_COPY, ()).ok();
        }
        "paste" => {
            app.emit(TauriEvents::MENU_PASTE, ()).ok();
        }
        "toggle_sidebar" => {
            app.emit(TauriEvents::MENU_TOGGLE_SIDEBAR, ()).ok();
        }
        "theme_light" => {
            app.emit(TauriEvents::MENU_THEME, "light").ok();
        }
        "theme_dark" => {
            app.emit(TauriEvents::MENU_THEME, "dark").ok();
        }
        "theme_system" => {
            app.emit(TauriEvents::MENU_THEME, "system").ok();
        }
        "app_settings" => {
            app.emit(TauriEvents::MENU_SETTINGS, ()).ok();
        }
        "documentation" => {
            app.emit(TauriEvents::MENU_DOCUMENTATION, ()).ok();
        }
        "about" => {
            app.emit(TauriEvents::MENU_ABOUT, ()).ok();
        }
        "keyboard_shortcuts" => {
            app.emit(TauriEvents::MENU_KEYBOARD_SHORTCUTS, ()).ok();
        }
        _ => {}
    }
}
