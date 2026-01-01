import { configureStore } from '@reduxjs/toolkit';
import llmConnectionsReducer from './slices/llmConnectionsSlice';
import mcpConnectionsReducer from './slices/mcpConnectionsSlice';
import workspacesReducer from './slices/workspacesSlice';
import chatsReducer from './slices/chatsSlice';
import messagesReducer from './slices/messages';
import workspaceSettingsReducer from './slices/workspaceSettingsSlice';
import uiReducer from './slices/uiSlice';
import chatInputReducer from './slices/chatInputSlice';
import notificationReducer from './slices/notificationSlice';
import chatSearchReducer from './slices/chatSearchSlice';
import toolPermissionReducer from './slices/toolPermissionSlice';

export const store = configureStore({
  reducer: {
    llmConnections: llmConnectionsReducer,
    mcpConnections: mcpConnectionsReducer,
    workspaces: workspacesReducer,
    chats: chatsReducer,
    messages: messagesReducer,
    workspaceSettings: workspaceSettingsReducer,
    ui: uiReducer,
    chatInput: chatInputReducer,
    notifications: notificationReducer,
    chatSearch: chatSearchReducer,
    toolPermission: toolPermissionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
