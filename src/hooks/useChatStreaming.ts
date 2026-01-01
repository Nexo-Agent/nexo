import { useEffect, useRef } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import { useAppDispatch } from '@/store/hooks';
import {
  appendToMessage,
  appendToThinking,
  updateMessage,
  updateMessageTokenUsage,
  updateMessageWithToolCalls,
  setStreamingMessageId,
  setStreamingByChatId,
  clearStreamingMessageId,
  fetchMessages,
} from '@/store/slices/messages';
import type { TokenUsage } from '@/store/types';
import { addPermissionRequest } from '@/store/slices/toolPermissionSlice';

// Event types matching Rust events
interface MessageStartedEvent {
  chat_id: string;
  user_message_id: string;
  assistant_message_id: string;
}

interface MessageChunkEvent {
  chat_id: string;
  message_id: string;
  chunk: string;
}

interface ThinkingChunkEvent {
  chat_id: string;
  message_id: string;
  chunk: string;
}

interface MessageCompleteEvent {
  chat_id: string;
  message_id: string;
  content: string;
  token_usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface MessageErrorEvent {
  chat_id: string;
  message_id: string;
  error: string;
}

interface ToolCallsDetectedEvent {
  chat_id: string;
  message_id: string;
  tool_calls: Array<{
    id: string;
    name: string;
    arguments: unknown;
  }>;
}

interface ToolExecutionStartedEvent {
  chat_id: string;
  message_id: string;
  tool_calls_count: number;
}

interface ToolExecutionProgressEvent {
  chat_id: string;
  message_id: string;
  tool_call_id: string;
  tool_name: string;
  status: 'executing' | 'completed' | 'error';
  result?: unknown;
  error?: string;
}

interface ToolExecutionCompletedEvent {
  chat_id: string;
  message_id: string;
  tool_calls_count: number;
  successful_count: number;
  failed_count: number;
}

interface ToolExecutionErrorEvent {
  chat_id: string;
  message_id: string;
  tool_call_id: string;
  tool_name: string;
  error: string;
}

interface AgentLoopIterationEvent {
  chat_id: string;
  iteration: number;
  max_iterations: number;
  has_tool_calls: boolean;
}

interface ToolPermissionRequestEvent {
  chat_id: string;
  message_id: string;
  tool_calls: Array<{
    id: string;
    name: string;
    arguments: unknown;
  }>;
}

/**
 * Hook to listen to Tauri events for chat streaming
 * This hook sets up event listeners for:
 * - message-chunk: Streaming content chunks
 * - message-complete: Message completion with final content
 * - message-error: Error events
 * - tool-calls-detected: Tool calls detected (for Phase 2)
 * - tool-permission-request: Tool permission request (requires user confirmation)
 */
export function useChatStreaming() {
  const dispatch = useAppDispatch();
  // Track messsage IDs that have associated tool calls
  const hasToolCallsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    // Listen to message started event
    const unlistenStarted = listenToEvent<MessageStartedEvent>(
      TauriEvents.MESSAGE_STARTED,
      async (payload) => {
        // Fetch messages to get the newly created user and assistant messages
        await dispatch(fetchMessages(payload.chat_id));

        // Set up streaming state
        dispatch(
          setStreamingByChatId({
            chatId: payload.chat_id,
            messageId: payload.assistant_message_id,
          })
        );
        dispatch(setStreamingMessageId(payload.assistant_message_id));
      }
    );

    // Listen to message chunk events
    const unlistenChunk = listenToEvent<MessageChunkEvent>(
      TauriEvents.MESSAGE_CHUNK,
      (payload) => {
        dispatch(
          appendToMessage({
            chatId: payload.chat_id,
            messageId: payload.message_id,
            chunk: payload.chunk,
          })
        );
      }
    );

    // Listen to thinking chunk events
    const unlistenThinkingChunk = listenToEvent<ThinkingChunkEvent>(
      TauriEvents.THINKING_CHUNK,
      (payload) => {
        dispatch(
          appendToThinking({
            chatId: payload.chat_id,
            messageId: payload.message_id,
            chunk: payload.chunk,
          })
        );
      }
    );

    // Listen to message complete events
    const unlistenComplete = listenToEvent<MessageCompleteEvent>(
      TauriEvents.MESSAGE_COMPLETE,
      (payload) => {
        // Update message with final content
        dispatch(
          updateMessage({
            chatId: payload.chat_id,
            messageId: payload.message_id,
            content: payload.content,
          })
        );

        // Update token usage if available
        if (payload.token_usage) {
          const tokenUsage: TokenUsage = {
            promptTokens: payload.token_usage.prompt_tokens,
            completionTokens: payload.token_usage.completion_tokens,
            totalTokens: payload.token_usage.total_tokens,
          };
          dispatch(
            updateMessageTokenUsage({
              chatId: payload.chat_id,
              messageId: payload.message_id,
              tokenUsage,
            })
          );
        }

        // Clear streaming state
        dispatch(
          setStreamingByChatId({
            chatId: payload.chat_id,
            messageId: null,
          })
        );
        dispatch(clearStreamingMessageId());
      }
    );

    // Listen to message error events
    const unlistenError = listenToEvent<MessageErrorEvent>(
      TauriEvents.MESSAGE_ERROR,
      (payload) => {
        // Update message with error content
        dispatch(
          updateMessage({
            chatId: payload.chat_id,
            messageId: payload.message_id,
            content: `Error: ${payload.error}`,
          })
        );

        // Clear streaming state
        dispatch(
          setStreamingByChatId({
            chatId: payload.chat_id,
            messageId: null,
          })
        );
        dispatch(clearStreamingMessageId());
      }
    );

    // Listen to tool calls detected events
    const unlistenToolCalls = listenToEvent<ToolCallsDetectedEvent>(
      TauriEvents.TOOL_CALLS_DETECTED,
      (payload) => {
        // Convert tool calls to frontend format
        const toolCalls = payload.tool_calls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        }));

        // Update message with tool calls
        dispatch(
          updateMessageWithToolCalls({
            chatId: payload.chat_id,
            messageId: payload.message_id,
            toolCalls,
          })
        );

        if (payload.tool_calls && payload.tool_calls.length > 0) {
          hasToolCallsRef.current[payload.message_id] = true;
        }
      }
    );

    // Listen to tool execution started event
    const unlistenToolExecutionStarted =
      listenToEvent<ToolExecutionStartedEvent>(
        TauriEvents.TOOL_EXECUTION_STARTED,
        (_) => {
          // Tool execution has started
          // You can show UI indicators here if needed
        }
      );

    // Listen to tool execution progress events
    const unlistenToolExecutionProgress =
      listenToEvent<ToolExecutionProgressEvent>(
        TauriEvents.TOOL_EXECUTION_PROGRESS,
        (payload) => {
          // Update UI for individual tool execution progress
          // The tool_call message should already exist in the database
          // We can fetch messages to update the UI

          // Fetch messages to get updated tool_call message
          dispatch(fetchMessages(payload.chat_id));
        }
      );

    // Listen to tool execution completed event
    const unlistenToolExecutionCompleted =
      listenToEvent<ToolExecutionCompletedEvent>(
        TauriEvents.TOOL_EXECUTION_COMPLETED,
        (payload) => {
          // All tools have been executed

          // Fetch messages to get updated tool results
          dispatch(fetchMessages(payload.chat_id));
        }
      );

    // Listen to tool execution error events
    const unlistenToolExecutionError = listenToEvent<ToolExecutionErrorEvent>(
      TauriEvents.TOOL_EXECUTION_ERROR,
      (payload) => {
        // Tool execution error
        console.error(
          `Tool execution error for ${payload.tool_name} (${payload.tool_call_id}): ${payload.error}`
        );

        // Fetch messages to get updated error state
        dispatch(fetchMessages(payload.chat_id));
      }
    );

    // Listen to agent loop iteration events (optional, for debugging)
    const unlistenAgentLoopIteration = listenToEvent<AgentLoopIterationEvent>(
      TauriEvents.AGENT_LOOP_ITERATION,
      (_) => {
        // Agent loop iteration
      }
    );

    // Listen to tool permission request events
    const unlistenToolPermissionRequest =
      listenToEvent<ToolPermissionRequestEvent>(
        TauriEvents.TOOL_PERMISSION_REQUEST,
        (payload) => {
          // Dispatch to Redux store
          dispatch(
            addPermissionRequest({
              chatId: payload.chat_id,
              messageId: payload.message_id,
              toolCalls: payload.tool_calls,
            })
          );
        }
      );

    // Cleanup function
    return () => {
      unlistenStarted.then((fn) => fn());
      unlistenChunk.then((fn) => fn());
      unlistenThinkingChunk.then((fn) => fn());
      unlistenComplete.then((fn) => fn());
      unlistenError.then((fn) => fn());
      unlistenToolCalls.then((fn) => fn());
      unlistenToolExecutionStarted.then((fn) => fn());
      unlistenToolExecutionProgress.then((fn) => fn());
      unlistenToolExecutionCompleted.then((fn) => fn());
      unlistenToolExecutionError.then((fn) => fn());
      unlistenAgentLoopIteration.then((fn) => fn());
      unlistenToolPermissionRequest.then((fn) => fn());
    };
  }, [dispatch]);
}
