import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';
import { logger } from '@/lib/logger';
import type { WorkspaceSettings } from '../types';

interface DbWorkspaceSettings {
  workspace_id: string;
  llm_connection_id: string | null;
  system_message: string | null;
  mcp_tool_ids: string | null;
  stream_enabled: number | null;
  default_model: string | null;
  tool_permission_config: string | null;
  max_agent_iterations: number | null;
  internal_tools_enabled: number | null;
  selected_skill_ids: string | null;
  created_at: number;
  updated_at: number;
}

export const workspaceSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkspaceSettings: builder.query<
      WorkspaceSettings | null,
      { workspaceId: string; workspaceName: string }
    >({
      queryFn: async (
        { workspaceId, workspaceName },
        _api,
        _extraOptions,
        baseQuery
      ) => {
        const result = await baseQuery({
          command: TauriCommands.GET_WORKSPACE_SETTINGS,
          args: { workspaceId },
        });

        if (result.error) return { error: result.error };

        const dbSettings = result.data as DbWorkspaceSettings | null;
        if (!dbSettings) {
          return { data: null };
        }

        let mcpToolIds: Record<string, string> | undefined;
        if (dbSettings.mcp_tool_ids) {
          try {
            mcpToolIds = JSON.parse(dbSettings.mcp_tool_ids);
          } catch (e) {
            logger.error(
              'Error parsing mcpToolIds in workspace settings API:',
              e
            );
          }
        }

        const streamEnabled =
          dbSettings.stream_enabled !== null
            ? dbSettings.stream_enabled === 1
            : undefined;

        let toolPermissionConfig:
          | Record<string, 'require' | 'auto'>
          | undefined;
        if (dbSettings.tool_permission_config) {
          try {
            toolPermissionConfig = JSON.parse(
              dbSettings.tool_permission_config
            );
          } catch (e) {
            logger.error(
              'Error parsing toolPermissionConfig in workspace settings API:',
              e
            );
          }
        }

        const settings: WorkspaceSettings = {
          id: dbSettings.workspace_id,
          name: workspaceName,
          systemMessage: dbSettings.system_message || '',
          llmConnectionId: dbSettings.llm_connection_id || undefined,
          mcpToolIds,
          streamEnabled,
          defaultModel: dbSettings.default_model || undefined,
          toolPermissionConfig,
          maxAgentIterations: dbSettings.max_agent_iterations || undefined,
          internalToolsEnabled:
            dbSettings.internal_tools_enabled !== null
              ? dbSettings.internal_tools_enabled === 1
              : undefined,
          selectedSkillIds: dbSettings.selected_skill_ids
            ? JSON.parse(dbSettings.selected_skill_ids)
            : undefined,
        };

        return { data: settings };
      },
      providesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceSettings', id: workspaceId },
      ],
    }),
    saveWorkspaceSettings: builder.mutation<
      { workspaceId: string; settings: WorkspaceSettings },
      { workspaceId: string; settings: WorkspaceSettings }
    >({
      queryFn: async (
        { workspaceId, settings },
        _api,
        _extraOptions,
        baseQuery
      ) => {
        const mcpToolIdsJson = settings.mcpToolIds
          ? JSON.stringify(settings.mcpToolIds)
          : null;
        const streamEnabled =
          settings.streamEnabled !== undefined ? settings.streamEnabled : null;
        const toolPermissionConfigJson = settings.toolPermissionConfig
          ? JSON.stringify(settings.toolPermissionConfig)
          : null;

        const result = await baseQuery({
          command: TauriCommands.SAVE_WORKSPACE_SETTINGS,
          args: {
            workspaceId,
            llmConnectionId: settings.llmConnectionId || null,
            systemMessage: settings.systemMessage || null,
            mcpToolIds: mcpToolIdsJson,
            streamEnabled,
            defaultModel: settings.defaultModel || null,
            toolPermissionConfig: toolPermissionConfigJson,
            maxAgentIterations: settings.maxAgentIterations || null,
            internalToolsEnabled:
              settings.internalToolsEnabled !== undefined
                ? settings.internalToolsEnabled
                : null,
            selectedSkillIds: settings.selectedSkillIds
              ? JSON.stringify(settings.selectedSkillIds)
              : null,
          },
        });

        if (result.error) return { error: result.error };

        return { data: { workspaceId, settings } };
      },
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'WorkspaceSettings', id: workspaceId },
        { type: 'WorkspaceActiveTool', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useGetWorkspaceSettingsQuery,
  useSaveWorkspaceSettingsMutation,
} = workspaceSettingsApi;
