import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
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

interface MCPConnectionsState {
  mcpConnections: MCPServerConnection[];
  loading: boolean;
  error: string | null;
}

const initialState: MCPConnectionsState = {
  mcpConnections: [],
  loading: false,
  error: null,
};

// Convert database MCPServerConnection to frontend MCPServerConnection
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

// Thunks
export const fetchMCPConnections = createAsyncThunk(
  'mcpConnections/fetchMCPConnections',
  async () => {
    const dbMCPConnections = await invokeCommand<DbMCPServerConnection[]>(
      TauriCommands.GET_MCP_SERVER_CONNECTIONS
    );
    return dbMCPConnections.map(dbToFrontendMCPServerConnection);
  }
);

export const refreshMCPConnections = createAsyncThunk(
  'mcpConnections/refreshMCPConnections',
  async () => {
    const dbMCPConnections = await invokeCommand<DbMCPServerConnection[]>(
      TauriCommands.GET_MCP_SERVER_CONNECTIONS
    );
    return dbMCPConnections.map(dbToFrontendMCPServerConnection);
  }
);

export const addMCPConnection = createAsyncThunk(
  'mcpConnections/addMCPConnection',
  async (connection: Omit<MCPServerConnection, 'id'>) => {
    const id = Date.now().toString();

    // Create connection with connecting status immediately
    await invokeCommand<DbMCPServerConnection>(
      TauriCommands.CREATE_MCP_SERVER_CONNECTION,
      {
        id,
        name: connection.name,
        url: connection.url,
        type: connection.type,
        headers: connection.headers || '',
        runtimePath: connection.runtime_path || null,
      }
    );

    // Set status to connecting immediately
    await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
      id,
      status: 'connecting',
      toolsJson: null,
      errorMessage: null,
    });

    // Return immediately with connecting status - connection will happen async
    return {
      ...connection,
      id,
      status: 'connecting' as const,
      tools: undefined,
      errorMessage: undefined,
    };
  }
);

// Separate thunk to handle async connection after creation
export const connectMCPConnection = createAsyncThunk(
  'mcpConnections/connectMCPConnection',
  async (params: {
    id: string;
    url: string;
    type: 'sse' | 'stdio' | 'http-streamable';
    headers?: string;
    runtime_path?: string;
  }) => {
    const { id, url, type, headers, runtime_path } = params;

    let tools: MCPToolType[] | undefined;
    let status: 'connected' | 'disconnected' = 'disconnected';
    let errorMessage: string | undefined;

    try {
      // Connect and fetch tools immediately - no delay
      const mcpTools = await invokeCommand<
        Array<{ name: string; description?: string; input_schema?: string }>
      >(TauriCommands.CONNECT_MCP_SERVER_AND_FETCH_TOOLS, {
        url,
        type,
        headers: headers || null,
        runtimePath: runtime_path || null,
      });

      tools = mcpTools.map((tool) => {
        let inputSchema: MCPToolType['inputSchema'];
        if (tool.input_schema) {
          try {
            inputSchema = JSON.parse(tool.input_schema);
          } catch (e) {
            console.error('Error parsing input_schema:', e);
          }
        }
        return {
          name: tool.name,
          description: tool.description,
          inputSchema,
        };
      });

      // Update status to connected and save tools, clear error
      const toolsJson = JSON.stringify(tools);
      await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
        id,
        status: 'connected',
        toolsJson,
        errorMessage: null,
      });
      status = 'connected';
      errorMessage = undefined;
    } catch (error: unknown) {
      console.error('Error connecting to MCP server:', error);
      // Update status to disconnected on error and save error message
      const errorMsg =
        error instanceof Error
          ? error.message
          : error?.toString() || 'Không thể kết nối đến MCP server';
      await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
        id,
        status: 'disconnected',
        toolsJson: null,
        errorMessage: errorMsg,
      });
      status = 'disconnected';
      errorMessage = errorMsg;
    }

    return { id, status, tools, errorMessage };
  }
);

export const updateMCPConnection = createAsyncThunk(
  'mcpConnections/updateMCPConnection',
  async ({
    id,
    connection,
  }: {
    id: string;
    connection: Partial<MCPServerConnection>;
  }) => {
    await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_CONNECTION, {
      id,
      name: connection.name ?? null,
      url: connection.url ?? null,
      type: connection.type ?? null,
      headers: connection.headers ?? null,
      runtimePath: connection.runtime_path ?? null,
    });

    // If URL, type, or headers changed, mark as needing reconnect
    const needsReconnect =
      connection.url ||
      connection.type ||
      connection.headers !== undefined ||
      connection.runtime_path !== undefined;

    // Return immediately with connecting status if reconnect needed
    if (needsReconnect) {
      await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
        id,
        status: 'connecting',
        toolsJson: null,
        errorMessage: null,
      });
      return { id, updates: { ...connection, status: 'connecting' as const } };
    }

    return { id, updates: connection };
  }
);

export const disconnectMCPConnection = createAsyncThunk(
  'mcpConnections/disconnectMCPConnection',
  async (id: string) => {
    // Update status to disconnected and clear tools/error
    await invokeCommand(TauriCommands.UPDATE_MCP_SERVER_STATUS, {
      id,
      status: 'disconnected',
      toolsJson: null,
      errorMessage: null,
    });
    return id;
  }
);

export const removeMCPConnection = createAsyncThunk(
  'mcpConnections/removeMCPConnection',
  async (id: string) => {
    await invokeCommand(TauriCommands.DELETE_MCP_SERVER_CONNECTION, { id });
    return id;
  }
);

const mcpConnectionsSlice = createSlice({
  name: 'mcpConnections',
  initialState,
  reducers: {
    setMCPConnections: (
      state,
      action: PayloadAction<MCPServerConnection[]>
    ) => {
      state.mcpConnections = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch MCP connections
      .addCase(fetchMCPConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMCPConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.mcpConnections = action.payload;
      })
      .addCase(fetchMCPConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch MCP connections';
      })
      // Refresh MCP connections
      .addCase(refreshMCPConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshMCPConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.mcpConnections = action.payload;
      })
      .addCase(refreshMCPConnections.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to refresh MCP connections';
      })
      // Add MCP connection
      .addCase(addMCPConnection.fulfilled, (state, action) => {
        state.mcpConnections.push(action.payload);
      })
      // Connect MCP connection (async update after creation)
      .addCase(connectMCPConnection.pending, (state, action) => {
        const connectionId = action.meta.arg.id;
        const index = state.mcpConnections.findIndex(
          (conn) => conn.id === connectionId
        );
        if (index !== -1) {
          state.mcpConnections[index] = {
            ...state.mcpConnections[index],
            status: 'connecting',
          };
        }
      })
      .addCase(connectMCPConnection.fulfilled, (state, action) => {
        const index = state.mcpConnections.findIndex(
          (conn) => conn.id === action.payload.id
        );
        if (index !== -1) {
          state.mcpConnections[index] = {
            ...state.mcpConnections[index],
            status: action.payload.status,
            tools: action.payload.tools,
            errorMessage: action.payload.errorMessage,
          };
        }
      })
      .addCase(connectMCPConnection.rejected, (state, action) => {
        const connectionId = action.meta.arg.id;
        const index = state.mcpConnections.findIndex(
          (conn) => conn.id === connectionId
        );
        if (index !== -1) {
          state.mcpConnections[index] = {
            ...state.mcpConnections[index],
            status: 'disconnected',
            errorMessage: action.error.message || 'Failed to connect',
          };
        }
      })
      // Update MCP connection
      .addCase(updateMCPConnection.fulfilled, (state, action) => {
        const index = state.mcpConnections.findIndex(
          (conn) => conn.id === action.payload.id
        );
        if (index !== -1) {
          state.mcpConnections[index] = {
            ...state.mcpConnections[index],
            ...action.payload.updates,
          };
        }
      })
      // Disconnect MCP connection
      .addCase(disconnectMCPConnection.fulfilled, (state, action) => {
        const index = state.mcpConnections.findIndex(
          (conn) => conn.id === action.payload
        );
        if (index !== -1) {
          state.mcpConnections[index] = {
            ...state.mcpConnections[index],
            status: 'disconnected',
            tools: undefined,
            errorMessage: undefined,
          };
        }
      })
      // Remove MCP connection
      .addCase(removeMCPConnection.fulfilled, (state, action) => {
        state.mcpConnections = state.mcpConnections.filter(
          (conn) => conn.id !== action.payload
        );
      });
  },
});

export const { setMCPConnections } = mcpConnectionsSlice.actions;
export default mcpConnectionsSlice.reducer;
