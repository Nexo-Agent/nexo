use tauri::{AppHandle, Emitter};

pub fn create_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

    // Help menu items (common)
    let documentation = MenuItemBuilder::with_id("documentation", "Documentation").build(app)?;
    let keyboard_shortcuts = MenuItemBuilder::with_id("keyboard_shortcuts", "Keyboard Shortcuts")
        .accelerator("CommandOrControl+/")
        .build(app)?;

    // macOS Application Menu
    #[cfg(target_os = "macos")]
    let app_menu = {
        let about = MenuItemBuilder::with_id("about", "About Nexo").build(app)?;
        let settings = MenuItemBuilder::with_id("app_settings", "Settings...")
            .accelerator("Command+,")
            .build(app)?;
        let check_updates =
            MenuItemBuilder::with_id("check_updates", "Check for Updates...").build(app)?;

        SubmenuBuilder::new(app, "Nexo")
            .items(&[
                &about,
                &PredefinedMenuItem::separator(app)?,
                &settings,
                &PredefinedMenuItem::separator(app)?,
                &check_updates,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::services(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::hide(app, None)?,
                &PredefinedMenuItem::hide_others(app, None)?,
                &PredefinedMenuItem::show_all(app, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ])
            .build()?
    };

    // File menu items
    let new_chat = MenuItemBuilder::with_id("new_chat", "New Chat")
        .accelerator("CommandOrControl+N")
        .build(app)?;

    let file_submenu = {
        let builder = SubmenuBuilder::new(app, "File").item(&new_chat);

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder.separator().item(
                &MenuItemBuilder::with_id("quit", "Quit")
                    .accelerator("CommandOrControl+Q")
                    .build(app)?,
            );
        }

        builder.build()?
    };

    // Edit menu items
    let edit_submenu = SubmenuBuilder::new(app, "Edit")
        .items(&[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ])
        .build()?;

    // View menu items
    let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
        .accelerator("CommandOrControl+\\")
        .build(app)?;
    let view_submenu = SubmenuBuilder::new(app, "View")
        .items(&[
            &toggle_sidebar,
            &PredefinedMenuItem::separator(app)?,
            &MenuItemBuilder::with_id("theme_light", "Light Mode").build(app)?,
            &MenuItemBuilder::with_id("theme_dark", "Dark Mode").build(app)?,
            &MenuItemBuilder::with_id("theme_system", "System Mode").build(app)?,
        ])
        .build()?;

    // Help menu (Windows/Linux also get About/Settings here)
    let help_submenu = {
        let builder = SubmenuBuilder::new(app, "Help")
            .item(&documentation)
            .item(&keyboard_shortcuts);

        #[cfg(not(target_os = "macos"))]
        {
            builder = builder
                .separator()
                .item(&MenuItemBuilder::with_id("about", "About").build(app)?)
                .item(&MenuItemBuilder::with_id("app_settings", "Settings").build(app)?);
        }

        builder.build()?
    };

    let mut menu_builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    {
        menu_builder = menu_builder.item(&app_menu);
    }

    let menu = menu_builder
        .items(&[&file_submenu, &edit_submenu, &view_submenu, &help_submenu])
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
        "check_updates" => {
            app.emit(TauriEvents::MENU_CHECK_UPDATES, ()).ok();
        }
        "keyboard_shortcuts" => {
            app.emit(TauriEvents::MENU_KEYBOARD_SHORTCUTS, ()).ok();
        }
        _ => {}
    }
}
