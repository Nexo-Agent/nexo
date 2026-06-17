import { createSlice } from '@reduxjs/toolkit';
import { initialState } from './state';
import { reducers } from './reducers';
import { buildExtraReducers } from './extraReducers';
import { fetchMessages } from './thunks/fetchMessages';
import { createSendMessageThunkNew } from './thunks/sendMessageNew';
import { createEditAndResendMessageThunk } from './thunks/editAndResendMessage';

// Create a temporary slice to get actions for sendMessage thunk
const tempSlice = createSlice({
  name: 'messages',
  initialState,
  reducers,
  extraReducers: () => {},
});

// Create sendMessage thunk with actions from the temporary slice
// Phase 1: Simplified version that calls Rust command and lets events handle the rest
export const sendMessage = createSendMessageThunkNew({
  setStreamingMessageId: tempSlice.actions.setStreamingMessageId,
  setStreamingByChatId: tempSlice.actions.setStreamingByChatId,
});

// Create editAndResendMessage thunk with actions from the temporary slice
export const editAndResendMessage = createEditAndResendMessageThunk({
  removeMessage: tempSlice.actions.removeMessage,
  removeMessagesAfter: tempSlice.actions.removeMessagesAfter,
  addMessage: tempSlice.actions.addMessage,
  updateMessageWithToolCalls: tempSlice.actions.updateMessageWithToolCalls,
  appendToMessage: tempSlice.actions.appendToMessage,
  updateMessageTokenUsage: tempSlice.actions.updateMessageTokenUsage,
  setStreamingMessageId: tempSlice.actions.setStreamingMessageId,
  setStreamingByChatId: tempSlice.actions.setStreamingByChatId,
  clearStreamingMessageId: tempSlice.actions.clearStreamingMessageId,
  clearStreamingByChatId: tempSlice.actions.clearStreamingByChatId,
  resumeStreaming: tempSlice.actions.resumeStreaming,
});

// Create final slice with all extra reducers
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers,
  extraReducers: (builder) => {
    buildExtraReducers(builder, sendMessage);
  },
});

// Export thunks
export { fetchMessages };
// editAndResendMessage is already exported above on line 32

// Export actions
export const {
  setMessages,
  addMessage,
  updateMessage,
  updateMessageWithToolCalls,
  appendToMessage,
  appendToThinking,
  updateMessageTokenUsage,
  clearMessages,
  removeMessage,
  removeMessagesAfter,
  setStreamingMessageId,
  clearStreamingMessageId,
  stopStreaming,
  setStreamingByChatId,
  clearStreamingByChatId,
  pauseStreaming,
  resumeStreaming,
} = messagesSlice.actions;

// Export reducer
export default messagesSlice.reducer;
