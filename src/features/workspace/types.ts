export interface Workspace {
  id: string;
  name: string;
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
  maxAgentIterations?: number;
  internalToolsEnabled?: boolean;
  selectedSkillIds?: string[];
}
