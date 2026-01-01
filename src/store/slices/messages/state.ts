import type { Message } from '@/store/types';

export interface MessagesState {
  messagesByChatId: Record<string, Message[]>;
  loading: boolean;
  error: string | null;
  streamingMessageId: string | null; // Track which message is currently streaming (deprecated, use streamingByChatId)
  streamingByChatId: Record<string, string | null>; // Track streaming messageId per chatId
  pausedStreaming: Record<string, boolean>; // Track which chatIds have paused streaming
}

export const initialState: MessagesState = {
  messagesByChatId: {},
  loading: false,
  error: null,
  streamingMessageId: null,
  streamingByChatId: {},
  pausedStreaming: {},
};
