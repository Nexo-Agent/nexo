import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';
import type { HubAgent } from '@/features/agent/types';
import type { HubMCPServer } from '@/features/mcp/types';
import type { HubPrompt } from '../ui/prompt-types';
import type { Prompt } from '@/app/types';

export const hubApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getHubAgents: builder.query<HubAgent[], void>({
      query: () => ({
        command: TauriCommands.FETCH_HUB_AGENTS,
      }),
      keepUnusedDataFor: 300,
      providesTags: ['HubAgent'],
    }),
    getHubMCPServers: builder.query<HubMCPServer[], void>({
      query: () => ({
        command: TauriCommands.FETCH_HUB_MCP_SERVERS,
      }),
      keepUnusedDataFor: 300,
      providesTags: ['HubMCPServer'],
    }),
    getHubPrompts: builder.query<HubPrompt[], void>({
      query: () => ({
        command: TauriCommands.FETCH_HUB_PROMPTS,
      }),
      keepUnusedDataFor: 300,
      providesTags: ['HubPrompt'],
    }),
    getInstalledPrompts: builder.query<Prompt[], void>({
      query: () => ({
        command: TauriCommands.GET_PROMPTS,
      }),
      providesTags: ['HubPrompt'], // Re-use tag or add a new one if needed
    }),
    refreshHubIndex: builder.mutation<void, void>({
      query: () => ({
        command: TauriCommands.REFRESH_HUB_INDEX,
      }),
      invalidatesTags: ['HubAgent', 'HubMCPServer', 'HubPrompt'],
    }),
  }),
});

export const {
  useGetHubAgentsQuery,
  useGetHubMCPServersQuery,
  useGetHubPromptsQuery,
  useGetInstalledPromptsQuery,
  useRefreshHubIndexMutation,
} = hubApi;
