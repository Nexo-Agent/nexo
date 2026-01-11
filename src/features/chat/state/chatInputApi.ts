import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';

export interface ChatInputSettings {
  workspaceId: string;
  selectedModel?: string;
  streamEnabled: boolean;
  updatedAt: number;
}

interface ChatInputSettingsBackend {
  workspace_id: string;
  selected_model: string | null;
  stream_enabled: number;
  created_at: number;
  updated_at: number;
}

export const chatInputApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatInputSettings: builder.query<ChatInputSettings | null, string>({
      queryFn: async (workspaceId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.GET_CHAT_INPUT_SETTINGS,
          args: { workspaceId },
        });

        if (result.error) return { error: result.error };

        const data = result.data as ChatInputSettingsBackend | null;
        if (!data) return { data: null };

        return {
          data: {
            workspaceId: data.workspace_id,
            selectedModel: data.selected_model || undefined,
            streamEnabled: data.stream_enabled === 1,
            updatedAt: data.updated_at,
          },
        };
      },
      providesTags: (_result, _error, workspaceId) => [
        { type: 'ChatInputSettings', id: workspaceId },
      ],
    }),
    saveChatInputSettings: builder.mutation<
      void,
      { workspaceId: string; selectedModel?: string; streamEnabled: boolean }
    >({
      queryFn: async (
        { workspaceId, selectedModel, streamEnabled },
        _api,
        _extraOptions,
        baseQuery
      ) => {
        const result = await baseQuery({
          command: TauriCommands.SAVE_CHAT_INPUT_SETTINGS,
          args: {
            workspaceId,
            selectedModel: selectedModel || null,
            streamEnabled,
          },
        });

        if (result.error) return { error: result.error };

        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: 'ChatInputSettings', id: workspaceId },
      ],
    }),
  }),
});

export const {
  useGetChatInputSettingsQuery,
  useSaveChatInputSettingsMutation,
} = chatInputApi;
