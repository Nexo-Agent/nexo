import { invoke } from "@tauri-apps/api/core";

// Types matching Rust structs
export interface Workspace {
  id: string;
  name: string;
  created_at: number;
}

export interface Chat {
  id: string;
  workspace_id: string;
  title: string;
  last_message: string | null;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface WorkspaceSettings {
  workspace_id: string;
  llm_connection_id: string | null;
  system_message: string | null;
  mcp_connection_ids: string | null; // JSON array string
  created_at: number;
  updated_at: number;
}

export interface LLMConnection {
  id: string;
  name: string;
  base_url: string;
  provider: "openai" | "ollama";
  api_key: string;
  models_json: string | null;
  created_at: number;
  updated_at: number;
}

export interface MCPServerConnection {
  id: string;
  name: string;
  url: string;
  type: string;
  headers: string;
  created_at: number;
  updated_at: number;
}

// Workspace API
export async function createWorkspace(
  id: string,
  name: string
): Promise<Workspace> {
  return invoke("create_workspace", { id, name });
}

export async function getWorkspaces(): Promise<Workspace[]> {
  return invoke("get_workspaces");
}

export async function updateWorkspace(
  id: string,
  name: string
): Promise<void> {
  return invoke("update_workspace", { id, name });
}

export async function deleteWorkspace(id: string): Promise<void> {
  return invoke("delete_workspace", { id });
}

// Chat API
export async function createChat(
  id: string,
  workspaceId: string,
  title: string
): Promise<Chat> {
  return invoke("create_chat", { id, workspaceId, title });
}

export async function getChats(workspaceId: string): Promise<Chat[]> {
  return invoke("get_chats", { workspaceId });
}

export async function updateChat(
  id: string,
  title?: string,
  lastMessage?: string
): Promise<void> {
  return invoke("update_chat", { id, title, lastMessage });
}

export async function deleteChat(id: string): Promise<void> {
  return invoke("delete_chat", { id });
}

// Message API
export async function createMessage(
  id: string,
  chatId: string,
  role: "user" | "assistant",
  content: string
): Promise<Message> {
  return invoke("create_message", { id, chatId, role, content });
}

export async function getMessages(chatId: string): Promise<Message[]> {
  return invoke("get_messages", { chatId });
}

// Workspace Settings API
export async function saveWorkspaceSettings(
  workspaceId: string,
  llmConnectionId?: string | null,
  systemMessage?: string | null,
  mcpConnectionIds?: string[] | null
): Promise<void> {
  const mcpConnectionIdsJson =
    mcpConnectionIds && mcpConnectionIds.length > 0
      ? JSON.stringify(mcpConnectionIds)
      : null;
  return invoke("save_workspace_settings", {
    workspaceId,
    llmConnectionId,
    systemMessage,
    mcpConnectionIds: mcpConnectionIdsJson,
  });
}

export async function getWorkspaceSettings(
  workspaceId: string
): Promise<WorkspaceSettings | null> {
  return invoke("get_workspace_settings", { workspaceId });
}

// LLM Connection API
export async function createLLMConnection(
  id: string,
  name: string,
  baseUrl: string,
  provider: "openai" | "ollama",
  apiKey: string,
  modelsJson?: string | null
): Promise<LLMConnection> {
  return invoke("create_llm_connection", {
    id,
    name,
    baseUrl, // Tauri v2 auto-converts camelCase to snake_case for Rust
    provider,
    apiKey, // Tauri v2 auto-converts camelCase to snake_case for Rust
    modelsJson, // Tauri v2 auto-converts camelCase to snake_case for Rust
  });
}

export async function getLLMConnections(): Promise<LLMConnection[]> {
  return invoke("get_llm_connections");
}

export async function updateLLMConnection(
  id: string,
  updates: {
    name?: string;
    baseUrl?: string;
    provider?: "openai" | "ollama";
    apiKey?: string;
    modelsJson?: string | null;
  }
): Promise<void> {
  // Tauri v2 auto-converts camelCase to snake_case for Rust
  return invoke("update_llm_connection", { id, ...updates });
}

export async function deleteLLMConnection(id: string): Promise<void> {
  return invoke("delete_llm_connection", { id });
}

// MCP Server Connection API
export async function createMCPServerConnection(
  id: string,
  name: string,
  url: string,
  type: string,
  headers: string
): Promise<MCPServerConnection> {
  return invoke("create_mcp_server_connection", {
    id,
    name,
    url,
    type,
    headers,
  });
}

export async function getMCPServerConnections(): Promise<MCPServerConnection[]> {
  return invoke("get_mcp_server_connections");
}

export async function updateMCPServerConnection(
  id: string,
  updates: {
    name?: string;
    url?: string;
    type?: string;
    headers?: string;
  }
): Promise<void> {
  return invoke("update_mcp_server_connection", { id, ...updates });
}

export async function deleteMCPServerConnection(id: string): Promise<void> {
  return invoke("delete_mcp_server_connection", { id });
}

