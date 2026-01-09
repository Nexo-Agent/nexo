import type { RootState } from '@/store/index';
import type { SendMessageContext } from '../types';
import { llmConnectionsApi } from '@/features/llm';
import { mcpConnectionsApi } from '@/features/mcp';

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

  // Use RTK Query selectors
  const llmConnectionsResult =
    llmConnectionsApi.endpoints.getLLMConnections.select()(state);
  const llmConnections = llmConnectionsResult.data || [];

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
  const mcpToolIds = workspaceSettings.mcpToolIds || {};
  const mcpConnectionIds = Array.from(new Set(Object.values(mcpToolIds)));

  const mcpConnectionsResult =
    mcpConnectionsApi.endpoints.getMCPConnections.select()(state);
  const allMcpConnections = mcpConnectionsResult.data || [];

  const mcpConnections = allMcpConnections.filter((conn) =>
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
