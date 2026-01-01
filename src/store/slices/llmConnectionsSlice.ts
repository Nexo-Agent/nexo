import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { LLMConnection, LLMModel } from '../types';

// Types matching Rust structs
interface DbLLMConnection {
  id: string;
  name: string;
  base_url: string;
  provider: string;
  api_key: string;
  models_json: string | null;
  default_model: string | null;
  created_at: number;
  updated_at: number;
}

interface LLMConnectionsState {
  llmConnections: LLMConnection[];
  loading: boolean;
  error: string | null;
}

const initialState: LLMConnectionsState = {
  llmConnections: [],
  loading: false,
  error: null,
};

// Convert database LLMConnection to frontend LLMConnection
function dbToFrontendLLMConnection(dbConn: DbLLMConnection): LLMConnection {
  let models: LLMModel[] | undefined;
  if (dbConn.models_json) {
    try {
      models = JSON.parse(dbConn.models_json);
    } catch (e) {
      console.error('Error parsing models_json:', e);
      models = undefined;
    }
  }

  // Validate provider type
  const provider =
    dbConn.provider === 'openai' || dbConn.provider === 'ollama'
      ? dbConn.provider
      : 'openai'; // Default to openai if invalid

  return {
    id: dbConn.id,
    name: dbConn.name,
    baseUrl: dbConn.base_url,
    provider,
    apiKey: dbConn.api_key,
    models,
  };
}

// Thunks
export const fetchLLMConnections = createAsyncThunk(
  'llmConnections/fetchLLMConnections',
  async () => {
    const dbLLMConnections = await invokeCommand<DbLLMConnection[]>(
      TauriCommands.GET_LLM_CONNECTIONS
    );
    return dbLLMConnections.map(dbToFrontendLLMConnection);
  }
);

export const refreshLLMConnections = createAsyncThunk(
  'llmConnections/refreshLLMConnections',
  async () => {
    const dbLLMConnections = await invokeCommand<DbLLMConnection[]>(
      TauriCommands.GET_LLM_CONNECTIONS
    );
    return dbLLMConnections.map(dbToFrontendLLMConnection);
  }
);

export const addLLMConnection = createAsyncThunk(
  'llmConnections/addLLMConnection',
  async (connection: Omit<LLMConnection, 'id'>) => {
    const id = Date.now().toString();
    const modelsJson = connection.models
      ? JSON.stringify(connection.models)
      : null;
    await invokeCommand<DbLLMConnection>(TauriCommands.CREATE_LLM_CONNECTION, {
      id,
      name: connection.name,
      baseUrl: connection.baseUrl,
      provider: connection.provider,
      apiKey: connection.apiKey,
      modelsJson,
      defaultModel: null, // defaultModel is no longer used in LLM connection
    });
    return { ...connection, id };
  }
);

export const updateLLMConnection = createAsyncThunk(
  'llmConnections/updateLLMConnection',
  async ({
    id,
    connection,
  }: {
    id: string;
    connection: Partial<LLMConnection>;
  }) => {
    const modelsJson = connection.models
      ? JSON.stringify(connection.models)
      : null;
    await invokeCommand(TauriCommands.UPDATE_LLM_CONNECTION, {
      id,
      name: connection.name ?? null,
      baseUrl: connection.baseUrl ?? null,
      provider: connection.provider ?? null,
      apiKey: connection.apiKey ?? null,
      modelsJson: modelsJson ?? null,
      defaultModel: null, // defaultModel is no longer used in LLM connection
    });
    return { id, updates: connection };
  }
);

export const removeLLMConnection = createAsyncThunk(
  'llmConnections/removeLLMConnection',
  async (id: string) => {
    await invokeCommand(TauriCommands.DELETE_LLM_CONNECTION, { id });
    return id;
  }
);

const llmConnectionsSlice = createSlice({
  name: 'llmConnections',
  initialState,
  reducers: {
    setLLMConnections: (state, action: PayloadAction<LLMConnection[]>) => {
      state.llmConnections = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch LLM connections
      .addCase(fetchLLMConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLLMConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.llmConnections = action.payload;
      })
      .addCase(fetchLLMConnections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch LLM connections';
      })
      // Refresh LLM connections
      .addCase(refreshLLMConnections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshLLMConnections.fulfilled, (state, action) => {
        state.loading = false;
        state.llmConnections = action.payload;
      })
      .addCase(refreshLLMConnections.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Failed to refresh LLM connections';
      })
      // Add LLM connection
      .addCase(addLLMConnection.fulfilled, (state, action) => {
        state.llmConnections.push(action.payload);
      })
      // Update LLM connection
      .addCase(updateLLMConnection.fulfilled, (state, action) => {
        const index = state.llmConnections.findIndex(
          (conn) => conn.id === action.payload.id
        );
        if (index !== -1) {
          state.llmConnections[index] = {
            ...state.llmConnections[index],
            ...action.payload.updates,
          };
        }
      })
      // Remove LLM connection
      .addCase(removeLLMConnection.fulfilled, (state, action) => {
        state.llmConnections = state.llmConnections.filter(
          (conn) => conn.id !== action.payload
        );
      });
  },
});

export const { setLLMConnections } = llmConnectionsSlice.actions;
export default llmConnectionsSlice.reducer;
