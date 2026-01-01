import { PayloadAction } from '@reduxjs/toolkit';
import type { Message, ToolCall, TokenUsage } from '@/store/types';
import type { MessagesState } from './state';
import { extractCodeBlocks } from '@/lib/code-block-extractor';

export const reducers = {
  setMessages: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messages: Message[] }>
  ) => {
    state.messagesByChatId[action.payload.chatId] = action.payload.messages;
  },
  addMessage: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; message: Message }>
  ) => {
    if (!state.messagesByChatId[action.payload.chatId]) {
      state.messagesByChatId[action.payload.chatId] = [];
    }
    state.messagesByChatId[action.payload.chatId].push(action.payload.message);
  },
  updateMessage: (
    state: MessagesState,
    action: PayloadAction<{
      chatId: string;
      messageId: string;
      content: string;
    }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      const message = messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        // Extract code blocks from content (content is not modified)
        const codeBlocks = extractCodeBlocks(action.payload.content);
        message.content = action.payload.content; // Keep original content
        message.codeBlocks = codeBlocks.length > 0 ? codeBlocks : undefined;
      }
    }
  },
  updateMessageWithToolCalls: (
    state: MessagesState,
    action: PayloadAction<{
      chatId: string;
      messageId: string;
      toolCalls: ToolCall[];
    }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      const message = messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        message.toolCalls = action.payload.toolCalls;
      }
    }
  },
  appendToMessage: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messageId: string; chunk: string }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      const message = messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        message.content += action.payload.chunk;
        // Re-extract code blocks when content is updated during streaming
        // This ensures code highlighting works correctly as content streams in
        const codeBlocks = extractCodeBlocks(message.content);
        message.codeBlocks = codeBlocks.length > 0 ? codeBlocks : undefined;
      }
    }
  },
  appendToThinking: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messageId: string; chunk: string }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      const message = messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        if (!message.reasoning) {
          message.reasoning = '';
        }
        message.reasoning += action.payload.chunk;
      }
    }
  },

  updateMessageTokenUsage: (
    state: MessagesState,
    action: PayloadAction<{
      chatId: string;
      messageId: string;
      tokenUsage: TokenUsage;
    }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      const message = messages.find((m) => m.id === action.payload.messageId);
      if (message) {
        message.tokenUsage = action.payload.tokenUsage;
      }
    }
  },
  clearMessages: (state: MessagesState, action: PayloadAction<string>) => {
    delete state.messagesByChatId[action.payload];
  },
  removeMessage: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messageId: string }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      state.messagesByChatId[action.payload.chatId] = messages.filter(
        (m) => m.id !== action.payload.messageId
      );
    }
  },
  removeMessagesAfter: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messageId: string }>
  ) => {
    const messages = state.messagesByChatId[action.payload.chatId];
    if (messages) {
      // Find the index of the message to keep
      const messageIndex = messages.findIndex(
        (m) => m.id === action.payload.messageId
      );
      if (messageIndex !== -1) {
        // Keep only messages up to and including this message
        state.messagesByChatId[action.payload.chatId] = messages.slice(
          0,
          messageIndex + 1
        );
      }
    }
  },
  setStreamingMessageId: (
    state: MessagesState,
    action: PayloadAction<string | null>
  ) => {
    state.streamingMessageId = action.payload;
  },
  clearStreamingMessageId: (state: MessagesState) => {
    state.streamingMessageId = null;
  },
  stopStreaming: (
    state: MessagesState,
    action: PayloadAction<string | undefined>
  ) => {
    // Note: Streaming is now handled by Rust backend, so we only cleanup UI state here
    // TODO: Implement cancel_streaming Tauri command if needed
    // If chatId provided, stop streaming for that specific chat
    if (action.payload) {
      const messageId = state.streamingByChatId[action.payload];
      if (messageId) {
        delete state.streamingByChatId[action.payload];
        delete state.pausedStreaming[action.payload];
        if (state.streamingMessageId === messageId) {
          state.streamingMessageId = null;
        }
      }
    } else {
      // Legacy: stop current streaming (backward compatibility)
      if (state.streamingMessageId) {
        // Find and cleanup from streamingByChatId
        for (const [chatId, messageId] of Object.entries(
          state.streamingByChatId
        )) {
          if (messageId === state.streamingMessageId) {
            delete state.streamingByChatId[chatId];
            delete state.pausedStreaming[chatId];
            break;
          }
        }
        state.streamingMessageId = null;
      }
    }
  },
  setStreamingByChatId: (
    state: MessagesState,
    action: PayloadAction<{ chatId: string; messageId: string | null }>
  ) => {
    if (action.payload.messageId === null) {
      delete state.streamingByChatId[action.payload.chatId];
    } else {
      state.streamingByChatId[action.payload.chatId] = action.payload.messageId;
    }
  },
  clearStreamingByChatId: (
    state: MessagesState,
    action: PayloadAction<string>
  ) => {
    delete state.streamingByChatId[action.payload];
    delete state.pausedStreaming[action.payload];
  },
  pauseStreaming: (state: MessagesState, action: PayloadAction<string>) => {
    // Mark this chatId as paused (streaming continues but UI doesn't update)
    if (state.streamingByChatId[action.payload]) {
      state.pausedStreaming[action.payload] = true;
    }
  },
  resumeStreaming: (state: MessagesState, action: PayloadAction<string>) => {
    // Remove from paused (UI will update again)
    delete state.pausedStreaming[action.payload];
  },
};
