import { createApi, BaseQueryFn } from '@reduxjs/toolkit/query/react';
import { invokeCommand } from '@/lib/tauri';
import { TauriCommand } from '@/bindings/commands';
import { parseBackendError } from '@/lib/utils';

// Define a type for the arguments passed to invokeCommand
interface TauriBaseQueryArgs {
  command: TauriCommand;
  args?: Record<string, unknown>;
}

// Define the custom baseQuery
const tauriBaseQuery: BaseQueryFn<
  TauriBaseQueryArgs,
  unknown,
  { message: string; category?: string }
> = async ({ command, args }, _api, _extraOptions) => {
  try {
    const result = await invokeCommand(command, args);
    return { data: result };
  } catch (error) {
    const { category, message } = parseBackendError(error);

    // Optionally dispatch error notification globally
    // But per requirement 8: "Xử lý loading & error theo chuẩn", we might want to let component handle it
    // However, the original thunks dispatched showError.
    // Requirement 8 says "Không dùng alert trực tiếp trong component".
    // It doesn't forbid dispatching global notifications from middleware/baseQuery.
    // The previous implementation used `handleCommandError` or direct `dispatch(showError)`.
    // We can keep centralized error handling here if we want, OR just return error.
    // Let's return error so RTK Query state reflects it, but we can also side-effect dispatch if needed.
    // For now, let's just return the error to allow components to decide,
    // or add a flag to auto-show error?
    // The requirement says "use isLoading, isFetching, error".
    // I will stick to returning the error properly.

    return {
      error: {
        message,
        category,
      },
    };
  }
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: tauriBaseQuery,
  tagTypes: [
    'Workspace',
    'WorkspaceSettings',
    'Message',
    'Chat',
    'LLMConnection',
    'MCPConnection',
    'Agent',
    'ChatInputSettings',
    'HubAgent',
    'HubMCPServer',
    'HubPrompt',
  ],
  endpoints: () => ({}),
});
