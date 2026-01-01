import type { RootState } from '@/store/index';
import type { SendMessageContext } from '../types';

/**
 * Validate and extract state values from Redux state
 * @throws Error if validation fails
 */
export function validateAndExtractState(
  state: RootState,
  chatId: string
): SendMessageContext {
  const selectedWorkspaceId = state.workspaces.selectedWorkspaceId;
  if (!selectedWorkspaceId) {
    throw new Error('No workspace selected');
  }

  const workspaceSettings =
    state.workspaceSettings.settingsByWorkspaceId[selectedWorkspaceId];
  if (!workspaceSettings?.llmConnectionId) {
    throw new Error('No LLM connection configured for workspace');
  }

  const llmConnections = state.llmConnections.llmConnections;
  const llmConnection = llmConnections.find(
    (conn) => conn.id === workspaceSettings.llmConnectionId
  );
  if (!llmConnection) {
    throw new Error('LLM connection not found');
  }

  const selectedModel = state.chatInput.selectedModel;
  if (!selectedModel) {
    throw new Error('No model selected');
  }

  const streamEnabled = workspaceSettings.streamEnabled ?? true;

  // Get existing messages
  const existingMessages = state.messages.messagesByChatId[chatId] || [];

  // Get MCP connections from workspace settings
  // mcpToolIds is a Record<string, string> mapping tool names to connection IDs
  const mcpToolIds = workspaceSettings.mcpToolIds || {};
  const mcpConnectionIds = Array.from(new Set(Object.values(mcpToolIds)));
  const mcpConnections = state.mcpConnections.mcpConnections.filter((conn) =>
    mcpConnectionIds.includes(conn.id)
  );

  return {
    workspaceSettings,
    llmConnection,
    selectedModel,
    streamEnabled,
    existingMessages,
    mcpConnections,
  };
}
