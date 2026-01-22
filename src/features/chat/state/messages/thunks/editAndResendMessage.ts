import {
  createAsyncThunk,
  ActionCreatorWithPayload,
  ActionCreatorWithoutPayload,
} from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { RootState } from '@/app/store';
import type { Message, ToolCall, TokenUsage } from '../../../types';
import { validateAndExtractState } from '../helpers/sendMessage/stateValidation';

export function createEditAndResendMessageThunk(actions: {
  removeMessage: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string;
  }>;
  removeMessagesAfter: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string;
  }>;
  addMessage: ActionCreatorWithPayload<{ chatId: string; message: Message }>;
  updateMessageWithToolCalls: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string;
    toolCalls: ToolCall[];
  }>;
  appendToMessage: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string;
    chunk: string;
  }>;
  updateMessageTokenUsage: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string;
    tokenUsage: TokenUsage;
  }>;
  setStreamingMessageId: ActionCreatorWithPayload<string | null>;
  setStreamingByChatId: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string | null;
  }>;
  clearStreamingMessageId: ActionCreatorWithoutPayload;
  clearStreamingByChatId: ActionCreatorWithPayload<string>;
  resumeStreaming: ActionCreatorWithPayload<string>;
}) {
  return createAsyncThunk(
    'messages/editAndResendMessage',
    async (
      {
        chatId,
        messageId,
        newContent,
        files,
        metadata,
      }: {
        chatId: string;
        messageId: string;
        newContent: string;
        files?: string[];
        metadata?: string;
      },
      { getState, dispatch }
    ) => {
      const state = getState() as RootState;

      // 1. Find the message index before removing
      const messages = state.messages.messagesByChatId[chatId] || [];
      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex !== -1) {
        // 2. Remove the message being edited and all messages after it in Redux
        // (Rust backend will delete them in database and create a new message)

        // First, remove all messages AFTER the message being edited
        // (removeMessagesAfter keeps the specified message and removes everything after it)
        dispatch(
          actions.removeMessagesAfter({
            chatId,
            messageId,
          })
        );

        // Then remove the message being edited itself
        dispatch(
          actions.removeMessage({
            chatId,
            messageId,
          })
        );
      }

      // 3. Validate state to get selected model
      const context = validateAndExtractState(state, chatId);

      // Get reasoning effort from chat input state
      const { isThinkingEnabled, reasoningEffort } = state.chatInput;

      // 4. Call Tauri command
      // Rust will:
      // - Update message content
      // - Delete messages after this one
      // - Create assistant message placeholder
      // - Call LLM
      // - Handle tool calls and agent loop if needed
      // - Emit events for streaming and tool execution
      const model = context.llmConnection.models?.find(
        (m) => m.id === context.selectedModel
      );
      const supportsThinking = model?.supportsThinking ?? false;

      const result = await invokeCommand<{ assistant_message_id: string }>(
        TauriCommands.EDIT_AND_RESEND_MESSAGE,
        {
          chatId,
          messageId,
          newContent,
          newFiles: files, // Map files to newFiles expected by backend
          metadata,
          selectedModel: context.selectedModel,
          reasoningEffort:
            isThinkingEnabled && supportsThinking ? reasoningEffort : undefined,
          llmConnectionId: context.llmConnection.id,
        }
      );

      // Result contains assistant_message_id
      // But we don't need to use it directly as events handle everything
      // Events will handle:
      // - Updating messages in Redux (via message-started event)
      // - Streaming chunks (via message-chunk events)
      // - Completion (via message-complete event)
      // - Tool calls (via tool-calls-detected event)
      // - Tool execution (via tool-execution-* events)
      // - Agent loop (via agent-loop-iteration event)

      return {
        chatId,
        messageId,
        assistantMessageId: result.assistant_message_id,
      };
    }
  );
}
