import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { WorkspaceSettings } from '../types';

// Types matching Rust structs
interface DbWorkspaceSettings {
  workspace_id: string;
  llm_connection_id: string | null;
  system_message: string | null;
  mcp_tool_ids: string | null;
  stream_enabled: number | null; // 1 for true, 0 for false, null for default
  default_model: string | null;
  tool_permission_config: string | null; // JSON string
  created_at: number;
  updated_at: number;
}

interface WorkspaceSettingsState {
  settingsByWorkspaceId: Record<string, WorkspaceSettings>;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspaceSettingsState = {
  settingsByWorkspaceId: {},
  loading: false,
  error: null,
};

// Thunks
export const fetchWorkspaceSettings = createAsyncThunk(
  'workspaceSettings/fetchWorkspaceSettings',
  async ({
    workspaceId,
    workspaceName,
  }: {
    workspaceId: string;
    workspaceName: string;
  }) => {
    const dbSettings = await invokeCommand<DbWorkspaceSettings | null>(
      TauriCommands.GET_WORKSPACE_SETTINGS,
      { workspaceId }
    );
    if (!dbSettings) {
      return null;
    }

    let mcpToolIds: Record<string, string> | undefined;
    if (dbSettings.mcp_tool_ids) {
      try {
        mcpToolIds = JSON.parse(dbSettings.mcp_tool_ids);
      } catch (e) {
        console.error('Error parsing mcpToolIds:', e);
      }
    }

    // Convert stream_enabled from number (1/0) to boolean, default to true if null
    const streamEnabled =
      dbSettings.stream_enabled !== null
        ? dbSettings.stream_enabled === 1
        : undefined;

    // Parse tool_permission_config JSON
    let toolPermissionConfig: Record<string, 'require' | 'auto'> | undefined;
    if (dbSettings.tool_permission_config) {
      try {
        toolPermissionConfig = JSON.parse(dbSettings.tool_permission_config);
      } catch (e) {
        console.error('Error parsing toolPermissionConfig:', e);
      }
    }

    return {
      workspaceId,
      settings: {
        id: dbSettings.workspace_id,
        name: workspaceName,
        systemMessage: dbSettings.system_message || '',
        llmConnectionId: dbSettings.llm_connection_id || undefined,
        mcpToolIds,
        streamEnabled,
        defaultModel: dbSettings.default_model || undefined,
        toolPermissionConfig,
      },
    };
  }
);

export const saveWorkspaceSettings = createAsyncThunk(
  'workspaceSettings/saveWorkspaceSettings',
  async ({
    workspaceId,
    settings,
  }: {
    workspaceId: string;
    settings: WorkspaceSettings;
  }) => {
    const mcpToolIdsJson = settings.mcpToolIds
      ? JSON.stringify(settings.mcpToolIds)
      : null;
    const streamEnabled =
      settings.streamEnabled !== undefined ? settings.streamEnabled : null;
    const toolPermissionConfigJson = settings.toolPermissionConfig
      ? JSON.stringify(settings.toolPermissionConfig)
      : null;

    await invokeCommand(TauriCommands.SAVE_WORKSPACE_SETTINGS, {
      workspaceId,
      llmConnectionId: settings.llmConnectionId || null,
      systemMessage: settings.systemMessage || null,
      mcpToolIds: mcpToolIdsJson,
      streamEnabled, // Send as boolean, not number
      defaultModel: settings.defaultModel || null,
      toolPermissionConfig: toolPermissionConfigJson,
    });
    return { workspaceId, settings };
  }
);

const workspaceSettingsSlice = createSlice({
  name: 'workspaceSettings',
  initialState,
  reducers: {
    setWorkspaceSettings: (
      state,
      action: PayloadAction<{
        workspaceId: string;
        settings: WorkspaceSettings;
      }>
    ) => {
      state.settingsByWorkspaceId[action.payload.workspaceId] =
        action.payload.settings;
    },
    updateWorkspaceSettings: (
      state,
      action: PayloadAction<{
        workspaceId: string;
        settings: Partial<WorkspaceSettings>;
      }>
    ) => {
      const existing = state.settingsByWorkspaceId[action.payload.workspaceId];
      if (existing) {
        state.settingsByWorkspaceId[action.payload.workspaceId] = {
          ...existing,
          ...action.payload.settings,
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workspace settings
      .addCase(fetchWorkspaceSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaceSettings.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.settingsByWorkspaceId[action.payload.workspaceId] =
            action.payload.settings;
        }
      })
      .addCase(fetchWorkspaceSettings.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to fetch workspace settings';
      })
      // Save workspace settings
      .addCase(saveWorkspaceSettings.fulfilled, (state, action) => {
        state.settingsByWorkspaceId[action.payload.workspaceId] =
          action.payload.settings;
      });
  },
});

export const { setWorkspaceSettings, updateWorkspaceSettings } =
  workspaceSettingsSlice.actions;
export default workspaceSettingsSlice.reducer;
