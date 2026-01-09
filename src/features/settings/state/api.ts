import { baseApi } from '@/store/api/baseApi';
import { TauriCommands } from '@/bindings/commands';

export const appSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAppSetting: builder.query<string | null, string>({
      query: (key) => ({
        command: TauriCommands.GET_APP_SETTING,
        args: { key },
      }),
    }),
    saveAppSetting: builder.mutation<void, { key: string; value: string }>({
      query: ({ key, value }) => ({
        command: TauriCommands.SAVE_APP_SETTING,
        args: { key, value },
      }),
    }),
  }),
});

export const { useGetAppSettingQuery, useSaveAppSettingMutation } =
  appSettingsApi;
