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

use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize AppState
            let app_handle = Arc::new(app.handle().clone());
            let app_state = state::AppState::new(app_handle)
                .map_err(|e| anyhow::anyhow!("Failed to initialize app state: {e}"))?;

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
            commands::chat::delete_all_chats_by_workspace,
            commands::chat::send_message,
            commands::chat::edit_and_resend_message,
            commands::chat::respond_tool_permission,
            // Message commands
            commands::message::create_message,
            commands::message::get_messages,
            commands::message::update_message,
            commands::message::delete_messages_after,
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
            // Agent commands
            agent::commands::install_agent,
            agent::commands::get_installed_agents,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! You've been greeted from Rust!")
}
