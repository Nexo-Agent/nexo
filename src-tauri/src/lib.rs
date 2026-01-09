mod agent;
mod commands;
mod constants;
mod db;
mod error;
mod events;
mod menu;
mod models;
mod repositories;
mod services;
mod state;

// Sentry helper macros and functions
#[macro_use]
mod lib {
    pub mod sentry_helpers;
}

use std::sync::Arc;
use tauri::Manager;
#[cfg(target_os = "macos")]
use tauri::Position;

/// Initialize Sentry for error tracking and performance monitoring
/// DSN is embedded at compile time via build.rs
fn init_sentry() -> sentry::ClientInitGuard {
    // Use env!() macro to get DSN embedded at compile time
    // This reads the value set by build.rs during build
    let dsn = option_env!("RUST_SENTRY_DSN")
        .and_then(|s| if s.is_empty() { None } else { Some(s) })
        .and_then(|s| s.parse().ok());

    let guard = sentry::init(sentry::ClientOptions {
        dsn,
        release: sentry::release_name!(),
        environment: Some(
            if cfg!(debug_assertions) {
                "development"
            } else {
                "production"
            }
            .into(),
        ),
        sample_rate: 1.0,
        traces_sample_rate: if cfg!(debug_assertions) { 1.0 } else { 0.1 },
        attach_stacktrace: true,
        ..Default::default()
    });

    // Panic handler is automatically registered when sentry is initialized
    // No need to call register_panic_handler() separately in sentry 0.34

    // Set global context
    sentry::configure_scope(|scope| {
        scope.set_tag("app.version", env!("CARGO_PKG_VERSION"));
        scope.set_tag("app.name", "nexo");
    });

    guard
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize Sentry
    let _sentry_guard = init_sentry();
    let builder = tauri::Builder::default();

    builder
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Maximize the main window on startup and ensure it's at the top
            if let Some(window) = app.get_webview_window("main") {
                // Maximize first
                if let Err(e) = window.maximize() {
                    eprintln!("Failed to maximize window: {}", e);
                }
                // On macOS, ensure window is at position (0, 0) to remove any gap
                #[cfg(target_os = "macos")]
                {
                    // Set position to (0, 0) after a short delay to ensure maximize completes
                    let window_clone = window.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(100));
                        if let Err(e) =
                            window_clone.set_position(Position::Physical(tauri::PhysicalPosition {
                                x: 0,
                                y: 0,
                            }))
                        {
                            eprintln!("Failed to set window position: {}", e);
                        }
                    });
                }
            }

            // Initialize AppState
            let app_handle = Arc::new(app.handle().clone());
            let app_state = state::AppState::new(app_handle).map_err(|e| {
                // Report initialization error to Sentry
                sentry::capture_error(&e);
                sentry::add_breadcrumb(sentry::Breadcrumb {
                    message: Some("Failed to initialize app state".to_string()),
                    level: sentry::Level::Error,
                    ..Default::default()
                });
                anyhow::anyhow!("Failed to initialize app state: {e}")
            })?;

            app.manage(app_state);

            // Initialize MCPClientState
            let mcp_client_state = state::MCPClientState::new();
            app.manage(mcp_client_state);

            // Initialize IndexConfigService
            let index_config_service = services::IndexConfigService::new();
            app.manage(index_config_service);

            // Create and set menu
            let menu = menu::create_menu(app.handle())?;
            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|_window, event| {
                let id = event.id();
                // MenuId is a tuple struct with a String field
                let id_str = &id.0;
                menu::handle_menu_event(_window.app_handle(), id_str);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            // Workspace commands
            commands::workspace::create_workspace,
            commands::workspace::get_workspaces,
            commands::workspace::update_workspace,
            commands::workspace::delete_workspace,
            // Chat commands
            commands::chat::create_chat,
            commands::chat::get_chats,
            commands::chat::update_chat,
            commands::chat::delete_chat,
            commands::chat::get_or_create_specialist_session,
            commands::chat::delete_all_chats_by_workspace,
            commands::chat::send_message,
            commands::chat::edit_and_resend_message,
            commands::chat::respond_tool_permission,
            // Message commands
            commands::message::create_message,
            commands::message::get_messages,
            commands::message::update_message,
            commands::message::delete_messages_after,
            commands::message::cancel_message,
            // Workspace Settings commands
            commands::settings::save_workspace_settings,
            commands::settings::get_workspace_settings,
            // LLM Connection commands
            commands::llm_connection::create_llm_connection,
            commands::llm_connection::get_llm_connections,
            commands::llm_connection::update_llm_connection,
            commands::llm_connection::delete_llm_connection,
            commands::llm_connection::test_llm_connection,
            // MCP Server Connection commands
            commands::mcp_connection::create_mcp_server_connection,
            commands::mcp_connection::get_mcp_server_connections,
            commands::mcp_connection::update_mcp_server_connection,
            commands::mcp_connection::delete_mcp_server_connection,
            commands::mcp_connection::update_mcp_server_status,
            // App Settings commands
            commands::settings::save_app_setting,
            commands::settings::get_app_setting,
            commands::settings::get_all_app_settings,
            // Prompt commands
            commands::prompt::create_prompt,
            commands::prompt::get_prompts,
            commands::prompt::update_prompt,
            commands::prompt::delete_prompt,
            // MCP Tools commands
            commands::mcp_tool::test_mcp_connection_and_fetch_tools,
            commands::mcp_tool::connect_mcp_server_and_fetch_tools,
            commands::mcp_tool::get_mcp_client,
            commands::mcp_tool::call_mcp_tool,
            commands::mcp_tool::disconnect_mcp_client,
            // Python commands
            commands::python::get_python_runtimes_status,
            commands::python::install_python_runtime,
            commands::python::uninstall_python_runtime,
            // Addon config commands
            commands::addon::get_addon_config,
            commands::addon::refresh_addon_config,
            // Node commands
            commands::node::get_node_runtimes_status,
            commands::node::install_node_runtime,
            commands::node::uninstall_node_runtime,
            // Usage commands
            commands::usage::get_usage_summary,
            commands::usage::get_usage_chart,
            commands::usage::get_usage_logs,
            commands::usage::clear_usage,
            // Agent commands
            agent::commands::install_agent,
            agent::commands::get_installed_agents,
            agent::commands::delete_agent,
            agent::commands::get_agent_info,
            agent::commands::update_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}
