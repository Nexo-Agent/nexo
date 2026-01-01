import type {
  Message,
  WorkspaceSettings,
  LLMConnection,
  MCPServerConnection,
} from '@/store/types';

/**
 * Context object containing all state needed for sendMessage thunk
 * Used by sendMessageNew.ts and editAndResendMessage.ts to validate state before calling Rust backend
 */
export interface SendMessageContext {
  workspaceSettings: WorkspaceSettings;
  llmConnection: LLMConnection;
  selectedModel: string;
  streamEnabled: boolean;
  existingMessages: Message[];
  mcpConnections: MCPServerConnection[];
}
