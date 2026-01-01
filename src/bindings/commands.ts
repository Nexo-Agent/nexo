/**
 * Tauri Command Names
 * Auto-generated from Rust constants in src-tauri/src/constants/commands.rs
 * DO NOT EDIT MANUALLY - Update the Rust file instead
 */

export const TauriCommands = {
  // Basic commands
  GREET: 'greet',

  // Workspace commands
  CREATE_WORKSPACE: 'create_workspace',
  GET_WORKSPACES: 'get_workspaces',
  UPDATE_WORKSPACE: 'update_workspace',
  DELETE_WORKSPACE: 'delete_workspace',

  // Chat commands
  CREATE_CHAT: 'create_chat',
  GET_CHATS: 'get_chats',
  UPDATE_CHAT: 'update_chat',
  DELETE_CHAT: 'delete_chat',
  DELETE_ALL_CHATS_BY_WORKSPACE: 'delete_all_chats_by_workspace',
  SEND_MESSAGE: 'send_message',
  EDIT_AND_RESEND_MESSAGE: 'edit_and_resend_message',
  RESPOND_TOOL_PERMISSION: 'respond_tool_permission',

  // Message commands
  CREATE_MESSAGE: 'create_message',
  GET_MESSAGES: 'get_messages',
  UPDATE_MESSAGE: 'update_message',
  DELETE_MESSAGE: 'delete_message',
  DELETE_MESSAGES_AFTER: 'delete_messages_after',
  CANCEL_MESSAGE: 'cancel_message',

  // Workspace Settings commands
  SAVE_WORKSPACE_SETTINGS: 'save_workspace_settings',
  GET_WORKSPACE_SETTINGS: 'get_workspace_settings',

  // LLM Connection commands
  CREATE_LLM_CONNECTION: 'create_llm_connection',
  GET_LLM_CONNECTIONS: 'get_llm_connections',
  UPDATE_LLM_CONNECTION: 'update_llm_connection',
  DELETE_LLM_CONNECTION: 'delete_llm_connection',
  TEST_LLM_CONNECTION: 'test_llm_connection',

  // MCP Server Connection commands
  CREATE_MCP_SERVER_CONNECTION: 'create_mcp_server_connection',
  GET_MCP_SERVER_CONNECTIONS: 'get_mcp_server_connections',
  UPDATE_MCP_SERVER_CONNECTION: 'update_mcp_server_connection',
  DELETE_MCP_SERVER_CONNECTION: 'delete_mcp_server_connection',
  UPDATE_MCP_SERVER_STATUS: 'update_mcp_server_status',

  // App Settings commands
  SAVE_APP_SETTING: 'save_app_setting',
  GET_APP_SETTING: 'get_app_setting',
  GET_ALL_APP_SETTINGS: 'get_all_app_settings',

  // Prompt commands
  CREATE_PROMPT: 'create_prompt',
  GET_PROMPTS: 'get_prompts',
  UPDATE_PROMPT: 'update_prompt',
  DELETE_PROMPT: 'delete_prompt',

  // MCP Tools commands
  TEST_MCP_CONNECTION_AND_FETCH_TOOLS: 'test_mcp_connection_and_fetch_tools',
  CONNECT_MCP_SERVER_AND_FETCH_TOOLS: 'connect_mcp_server_and_fetch_tools',
  GET_MCP_CLIENT: 'get_mcp_client',
  CALL_MCP_TOOL: 'call_mcp_tool',
  DISCONNECT_MCP_CLIENT: 'disconnect_mcp_client',

  // Python commands
  GET_PYTHON_RUNTIMES_STATUS: 'get_python_runtimes_status',
  INSTALL_PYTHON_RUNTIME: 'install_python_runtime',
  UNINSTALL_PYTHON_RUNTIME: 'uninstall_python_runtime',

  // Addon config commands
  GET_ADDON_CONFIG: 'get_addon_config',
  REFRESH_ADDON_CONFIG: 'refresh_addon_config',

  // Node commands
  GET_NODE_RUNTIMES_STATUS: 'get_node_runtimes_status',
  INSTALL_NODE_RUNTIME: 'install_node_runtime',
  UNINSTALL_NODE_RUNTIME: 'uninstall_node_runtime',
} as const;

export type TauriCommand = (typeof TauriCommands)[keyof typeof TauriCommands];
