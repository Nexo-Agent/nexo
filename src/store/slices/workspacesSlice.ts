import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { Workspace } from '../types';

// Types matching Rust structs
interface DbWorkspace {
  id: string;
  name: string;
  created_at: number;
}

interface WorkspacesState {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: WorkspacesState = {
  workspaces: [],
  selectedWorkspaceId: null,
  loading: false,
  error: null,
};

// Thunks
export const fetchWorkspaces = createAsyncThunk(
  'workspaces/fetchWorkspaces',
  async () => {
    const dbWorkspaces = await invokeCommand<DbWorkspace[]>(
      TauriCommands.GET_WORKSPACES
    );
    return dbWorkspaces.map((w) => ({
      id: w.id,
      name: w.name,
    }));
  }
);

export const createWorkspace = createAsyncThunk(
  'workspaces/createWorkspace',
  async (name: string) => {
    // Use browser's crypto.randomUUID() instead of Node.js crypto
    const id = crypto.randomUUID();
    await invokeCommand<DbWorkspace>(TauriCommands.CREATE_WORKSPACE, {
      id,
      name,
    });
    return { id, name };
  }
);

export const updateWorkspaceName = createAsyncThunk(
  'workspaces/updateWorkspaceName',
  async ({ id, name }: { id: string; name: string }) => {
    await invokeCommand(TauriCommands.UPDATE_WORKSPACE, { id, name });
    return { id, name };
  }
);

export const deleteWorkspace = createAsyncThunk(
  'workspaces/deleteWorkspace',
  async (id: string) => {
    await invokeCommand(TauriCommands.DELETE_WORKSPACE, { id });
    return id;
  }
);

const workspacesSlice = createSlice({
  name: 'workspaces',
  initialState,
  reducers: {
    setWorkspaces: (state, action: PayloadAction<Workspace[]>) => {
      state.workspaces = action.payload;
    },
    setSelectedWorkspace: (state, action: PayloadAction<string | null>) => {
      state.selectedWorkspaceId = action.payload;
    },
    addWorkspace: (state, action: PayloadAction<Workspace>) => {
      state.workspaces.push(action.payload);
    },
    updateWorkspace: (state, action: PayloadAction<Workspace>) => {
      const index = state.workspaces.findIndex(
        (w) => w.id === action.payload.id
      );
      if (index !== -1) {
        state.workspaces[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch workspaces
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
        // Auto-select first workspace if none selected
        if (!state.selectedWorkspaceId && action.payload.length > 0) {
          state.selectedWorkspaceId = action.payload[0].id;
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch workspaces';
      })
      // Create workspace
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.workspaces.push(action.payload);
        state.selectedWorkspaceId = action.payload.id;
      })
      // Update workspace name
      .addCase(updateWorkspaceName.fulfilled, (state, action) => {
        const index = state.workspaces.findIndex(
          (w) => w.id === action.payload.id
        );
        if (index !== -1) {
          state.workspaces[index].name = action.payload.name;
        }
      })
      // Delete workspace
      .addCase(deleteWorkspace.fulfilled, (state, action) => {
        const deletedId = action.payload;
        state.workspaces = state.workspaces.filter((w) => w.id !== deletedId);

        // If the deleted workspace was selected, select the first available workspace
        if (state.selectedWorkspaceId === deletedId) {
          state.selectedWorkspaceId =
            state.workspaces.length > 0 ? state.workspaces[0].id : null;
        }
      });
  },
});

export const {
  setWorkspaces,
  setSelectedWorkspace,
  addWorkspace,
  updateWorkspace,
} = workspacesSlice.actions;
export default workspacesSlice.reducer;
