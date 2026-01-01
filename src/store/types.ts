// Shared types for Redux store

export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
}

export interface LLMConnection {
  id: string;
  name: string;
  baseUrl: string;
  provider: 'openai' | 'ollama';
  apiKey: string;
  models?: LLMModel[];
}

// Re-export MCP types from mcp module for backward compatibility
export type {
  MCPToolType as MCPTool,
  MCPServerConnection,
} from '@/lib/mcp/types';

export interface Workspace {
  id: string;
  name: string;
}

export interface ChatItem {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: number; // Unix timestamp in milliseconds
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: unknown;
  result?: unknown;
  error?: string;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  responseTimeMs?: number;
}

export interface CodeBlock {
  id: string;
  content: string;
  language: string; // "python" | "mermaid" | "javascript" | etc.
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'tool_call';
  content: string;
  reasoning?: string; // Content of the thinking/reasoning process
  timestamp: number; // Unix timestamp in milliseconds
  toolCalls?: ToolCall[];
  toolCallId?: string; // For tool result messages
  assistantMessageId?: string; // For tool_call messages: ID of the assistant message that contains these tool calls
  tokenUsage?: TokenUsage; // Token usage information for assistant messages
  codeBlocks?: CodeBlock[]; // Extracted code blocks (python, mermaid, etc.)
  // For tool_call messages, content is JSON string with: { name, arguments, result?, error?, status: "calling" | "completed" | "error" }
}

export interface WorkspaceSettings {
  id: string;
  name: string;
  systemMessage: string;
  mcpToolIds?: Record<string, string>; // Map of tool name to MCP connection ID
  llmConnectionId?: string;
  streamEnabled?: boolean;
  defaultModel?: string; // Default model ID for this workspace
  toolPermissionConfig?: Record<string, 'require' | 'auto'>; // Per-tool permission configuration
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}
