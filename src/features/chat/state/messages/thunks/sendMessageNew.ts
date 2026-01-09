import { ActionCreatorWithPayload, createAsyncThunk } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { RootState } from '@/app/store';
import { validateAndExtractState } from '../helpers/sendMessage/stateValidation';

/**
 * Simplified sendMessage thunk for Phase 2
 * Calls Rust command and lets events handle the rest
 * Rust backend handles:
 * - Message creation
 * - LLM calls
 * - Tool execution
 * - Agent loop
 */
export function createSendMessageThunkNew(_actions: {
  setStreamingMessageId: ActionCreatorWithPayload<string | null>;
  setStreamingByChatId: ActionCreatorWithPayload<{
    chatId: string;
    messageId: string | null;
  }>;
}) {
  return createAsyncThunk(
    'messages/sendMessage',
    async (
      {
        chatId,
        content,
      }: {
        chatId: string;
        content: string;
      },
      { getState }
    ) => {
      const state = getState() as RootState;

      // 1. Validate state to get selected model
      const context = validateAndExtractState(state, chatId);

      const { isThinkingEnabled, reasoningEffort } = state.chatInput;

      // 2. Call Tauri command
      // Rust will:
      // - Create user message
      // - Create assistant message placeholder
      // - Call LLM
      // - Handle tool calls and agent loop if needed
      // - Emit events for streaming and tool execution
      const result = await invokeCommand<{ assistant_message_id: string }>(
        TauriCommands.SEND_MESSAGE,
        {
          chatId,
          content,
          selectedModel: context.selectedModel,
          reasoningEffort: isThinkingEnabled ? reasoningEffort : undefined,
          llmConnectionId: context.llmConnection.id,
        }
      );

      // Result contains assistant_message_id
      // But we don't need to use it directly as events handle everything
      // Events will handle:
      // - Adding messages to Redux (via message-started event)
      // - Streaming chunks (via message-chunk events)
      // - Completion (via message-complete event)
      // - Tool calls (via tool-calls-detected event)
      // - Tool execution (via tool-execution-* events)
      // - Agent loop (via agent-loop-iteration event)

      return result;
    }
  );
}
