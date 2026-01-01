import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PendingToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface PermissionRequest {
  chatId: string;
  messageId: string;
  toolCalls: PendingToolCall[];
}

interface ToolPermissionState {
  pendingRequests: Record<string, PermissionRequest>; // Key by messageId
}

const initialState: ToolPermissionState = {
  pendingRequests: {},
};

const toolPermissionSlice = createSlice({
  name: 'toolPermission',
  initialState,
  reducers: {
    addPermissionRequest: (state, action: PayloadAction<PermissionRequest>) => {
      state.pendingRequests[action.payload.messageId] = action.payload;
    },
    removePermissionRequest: (state, action: PayloadAction<string>) => {
      delete state.pendingRequests[action.payload];
    },
    clearAllRequests: (state) => {
      state.pendingRequests = {};
    },
  },
});

export const {
  addPermissionRequest,
  removePermissionRequest,
  clearAllRequests,
} = toolPermissionSlice.actions;

export default toolPermissionSlice.reducer;
