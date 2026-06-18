import { baseApi } from '@/app/api/baseApi';
import { TauriCommands } from '@/bindings/commands';
import type { Skill, SkillRecord } from '../types';

export const skillsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllSkills: builder.query<SkillRecord[], void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.GET_ALL_SKILLS,
          args: {},
        });

        if (result.error) return { error: result.error };
        return { data: result.data as SkillRecord[] };
      },
      providesTags: ['Skill'],
    }),

    loadSkill: builder.query<Skill, string>({
      queryFn: async (skillId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.LOAD_SKILL,
          args: { skillId },
        });

        if (result.error) return { error: result.error };
        return { data: result.data as Skill };
      },
    }),

    openSkillsFolder: builder.mutation<string, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.OPEN_SKILLS_FOLDER,
          args: {},
        });

        if (result.error) return { error: result.error };
        return { data: result.data as string };
      },
    }),

    importSkillFromGithub: builder.mutation<Skill, string>({
      queryFn: async (url, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.IMPORT_SKILL_FROM_GITHUB,
          args: { url },
        });

        if (result.error) return { error: result.error };
        return { data: result.data as Skill };
      },
      invalidatesTags: ['Skill'],
    }),

    deleteSkill: builder.mutation<void, string>({
      queryFn: async (skillId, _api, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          command: TauriCommands.DELETE_SKILL,
          args: { skillId },
        });

        if (result.error) return { error: result.error };
        return { data: undefined };
      },
      invalidatesTags: ['Skill'],
    }),
  }),
});

export const {
  useGetAllSkillsQuery,
  useLazyLoadSkillQuery,
  useOpenSkillsFolderMutation,
  useImportSkillFromGithubMutation,
  useDeleteSkillMutation,
} = skillsApi;
