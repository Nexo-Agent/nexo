import { baseApi } from '@/store/api/baseApi';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { MCPServerConnection, MCPToolType } from '../types';

// Types matching Rust structs
interface DbMCPServerConnection {
  id: string;
  name: string;
  url: string;
  type: string;
  headers: string;
  runtime_path: string | null;
  status: string; // "disconnected" | "connecting" | "connected"
  tools_json: string | null;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}

function dbToFrontendMCPServerConnection(
  dbConn: DbMCPServerConnection
): MCPServerConnection {
  let tools: MCPToolType[] | undefined;
  if (dbConn.tools_json) {
    try {
      tools = JSON.parse(dbConn.tools_json);
    } catch (e) {
      console.error('Error parsing tools_json:', e);
      tools = undefined;
    }
  }

  return {
    id: dbConn.id,
    name: dbConn.name,
    url: dbConn.url,
    type: dbConn.type as 'sse' | 'stdio' | 'http-streamable',
    headers: dbConn.headers || undefined,
    runtime_path: dbConn.runtime_path || undefined,
    status: dbConn.status as
      | 'disconnected'
      | 'connecting'
      | 'connected'
      | undefined,
    tools,
    errorMessage: dbConn.error_message || undefined,
  };
}

export const mcpConnectionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMCPConnections: builder.query<MCPServerConnection[], void>({
      query: () => ({
        command: TauriCommands.GET_MCP_SERVER_CONNECTIONS,
      }),
      transformResponse: (response: DbMCPServerConnection[]) =>
        response.map(dbToFrontendMCPServerConnection),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: 'MCPConnection' as const,
                id,
              })),
              { type: 'MCPConnection', id: 'LIST' },
            ]
          : [{ type: 'MCPConnection', id: 'LIST' }],
    }),

    createMCPConnection: builder.mutation<
      MCPServerConnection,
      Omit<MCPServerConnection, 'id'>
    >({
      queryFn: async (connection) => {
        try {
          const id = Date.now().toString();

          // Create connection
          await invokeCommand(TauriCommands.CREATE_MCP_SERVER_CONNECTION, {
            id,
            name: connection.name,
            url: connection.url,
            type: connection.type,
            headers: connection.headers || '',
            runtimePath: connection.runtime_path || null,
          });

          // Set status to connecting
          await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
            id,
            status: 'connecting',
            toolsJson: null,
            errorMessage: null,
          });

          return {
            data: {
              ...connection,
              id,
              status: 'connecting',
              tools: undefined,
              errorMessage: undefined,
            },
          };
        } catch (error: any) {
          return { error: { message: error.message || String(error) } };
        }
      },
      invalidatesTags: [{ type: 'MCPConnection', id: 'LIST' }],
    }),

    connectMCPConnection: builder.mutation<
      void, // Returns void or updated connection? slice returns object. But we just want to update server state and refetch.
      {
        id: string;
        url: string;
        type: 'sse' | 'stdio' | 'http-streamable';
        headers?: string;
        runtime_path?: string;
      }
    >({
      queryFn: async (params) => {
        const { id, url, type, headers, runtime_path } = params;
        try {
          // Connect and fetch tools
          const mcpTools = await invokeCommand<
            Array<{ name: string; description?: string; input_schema?: string }>
          >(TauriCommands.CONNECT_MCP_SERVER_AND_FETCH_TOOLS, {
            url,
            type,
            headers: headers || null,
            runtimePath: runtime_path || null,
          });

          const tools = mcpTools.map((tool) => {
            let inputSchema: object | undefined;
            if (tool.input_schema) {
              try {
                inputSchema = JSON.parse(tool.input_schema);
              } catch (_) {
                // ignore
              }
            }
            return {
              name: tool.name,
              description: tool.description,
              inputSchema,
            };
          });

          const toolsJson = JSON.stringify(tools);
          await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
            id,
            status: 'connected',
            toolsJson,
            errorMessage: null,
          });

          return { data: undefined };
        } catch (error: any) {
          const errorMsg =
            error instanceof Error
              ? error.message
              : error?.toString() || 'Cannot connect to MCP server';

          await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
            id,
            status: 'disconnected',
            toolsJson: null,
            errorMessage: errorMsg,
          });

          return { error: { message: errorMsg } };
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MCPConnection', id },
        { type: 'MCPConnection', id: 'LIST' },
      ],
    }),

    disconnectMCPConnection: builder.mutation<void, string>({
      queryFn: async (id) => {
        try {
          await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
            id,
            status: 'disconnected',
            toolsJson: null,
            errorMessage: null,
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message || String(error) } };
        }
      },
      invalidatesTags: (_result, _error, id) => [
        { type: 'MCPConnection', id },
        { type: 'MCPConnection', id: 'LIST' },
      ],
    }),

    updateMCPConnection: builder.mutation<
      { needsReconnect: boolean },
      { id: string; connection: Partial<MCPServerConnection> }
    >({
      queryFn: async ({ id, connection }) => {
        try {
          await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_CONNECTION, {
            id,
            name: connection.name ?? null,
            url: connection.url ?? null,
            type: connection.type ?? null,
            headers: connection.headers ?? null,
            runtimePath: connection.runtime_path ?? null,
          });

          const needsReconnect =
            !!connection.url ||
            !!connection.type ||
            connection.headers !== undefined ||
            connection.runtime_path !== undefined;

          if (needsReconnect) {
            await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
              id,
              status: 'connecting',
              toolsJson: null,
              errorMessage: null,
            });
          }

          return { data: { needsReconnect } };
        } catch (error: any) {
          return { error: { message: error.message || String(error) } };
        }
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'MCPConnection', id },
        { type: 'MCPConnection', id: 'LIST' },
      ],
    }),

    removeMCPConnection: builder.mutation<void, string>({
      query: (id) => ({
        command: TauriCommands.DELETE_MCP_SERVER_CONNECTION,
        args: { id },
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'MCPConnection', id },
        { type: 'MCPConnection', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetMCPConnectionsQuery,
  useCreateMCPConnectionMutation,
  useConnectMCPConnectionMutation,
  useDisconnectMCPConnectionMutation,
  useUpdateMCPConnectionMutation,
  useRemoveMCPConnectionMutation,
} = mcpConnectionsApi;
