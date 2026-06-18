import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';
import type { Artifact } from '../types';

export const artifactsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getArtifacts: builder.query<Artifact[], string>({
      queryFn: async (chatId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.GET_ARTIFACTS,
          args: { chatId },
        });

        if (result.error) return { error: result.error };
        return { data: result.data as Artifact[] };
      },
      providesTags: (_result, _error, chatId) => [
        { type: 'Artifact', id: chatId },
      ],
    }),

    deleteArtifact: builder.mutation<void, { id: string; chatId: string }>({
      queryFn: async ({ id }, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.DELETE_ARTIFACT,
          args: { id },
        });

        if (result.error) return { error: result.error };
        return { data: undefined };
      },
      invalidatesTags: (_result, _error, { chatId }) => [
        { type: 'Artifact', id: chatId },
      ],
    }),
  }),
});

export const { useGetArtifactsQuery, useDeleteArtifactMutation } = artifactsApi;
