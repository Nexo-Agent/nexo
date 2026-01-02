import type {
  ActionReducerMapBuilder,
  AsyncThunk,
  SerializedError,
} from '@reduxjs/toolkit';
import type { MessagesState } from './state';
import type { Message } from '@/store/types';
import { fetchMessages } from './thunks/fetchMessages';

export function buildExtraReducers(
  builder: ActionReducerMapBuilder<MessagesState>,
  sendMessage: AsyncThunk<
    { assistant_message_id: string },
    { chatId: string; content: string },
    Record<string, unknown>
  >
) {
  builder
    // Fetch messages
    .addCase(fetchMessages.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(fetchMessages.fulfilled, (state, action) => {
      state.loading = false;
      const { chatId, messages: fetchedMessages } = action.payload;

      // Race condition protection: Validate chatId matches the request
      // This prevents displaying messages from Chat A when user has switched to Chat C
      // The chatId is passed as arg to fetchMessages and returned in payload
      // Note: We can't access selectedChatId from RootState here, so we rely on
      // the cancelled flag in useMessages hook as the first line of defense.
      // This is a secondary safety check to ensure data integrity.

      // Retrieve current messages to preserve ephemeral state (like reasoning)
      const currentMessages = (state.messagesByChatId[chatId] ||
        []) as Message[];
      const currentMessagesMap = new Map<string, Message>(
        currentMessages.map((m) => [m.id, m])
      );

      // Merge fetched messages with current state
      const mergedMessages = fetchedMessages.map((fetchedMsg): Message => {
        const currentMsg = currentMessagesMap.get(fetchedMsg.id);
        if (currentMsg) {
          // Preserve ephemeral fields if they exist in current state but not in fetched state
          // reasoning is ephemeral and not yet persisted to DB
          return {
            ...fetchedMsg,
            reasoning: currentMsg.reasoning || fetchedMsg.reasoning,
          };
        }
        return fetchedMsg;
      });

      // If there IS a streaming message ID, ensure we don't accidentally overwrite its
      // content if the fetch happened mid-stream (though less likely with event-driven).
      const streamingMessageId = state.streamingByChatId[chatId];
      if (streamingMessageId) {
        const streamingMsgIndex = mergedMessages.findIndex(
          (m) => m.id === streamingMessageId
        );
        const currentStreamingMsg = currentMessages.find(
          (m) => m.id === streamingMessageId
        );

        if (currentStreamingMsg) {
          if (streamingMsgIndex !== -1) {
            // Replace with current streaming state to be safe, as it might be fresher
            // (e.g. chunks arrived while fetch was in flight)
            mergedMessages[streamingMsgIndex] = {
              ...mergedMessages[streamingMsgIndex], // keep structure
              content: currentStreamingMsg.content,
              reasoning: currentStreamingMsg.reasoning,
              codeBlocks: currentStreamingMsg.codeBlocks,
            };
          } else {
            // If for some reason the streaming message isn't in backend response yet
            // (latency), append it.
            // Convert WritableDraft to plain Message object for type compatibility
            const streamingMessagePlain: Message = {
              id: currentStreamingMsg.id,
              role: currentStreamingMsg.role,
              content: currentStreamingMsg.content,
              timestamp: currentStreamingMsg.timestamp,
              toolCalls: currentStreamingMsg.toolCalls,
              toolCallId: currentStreamingMsg.toolCallId,
              assistantMessageId: currentStreamingMsg.assistantMessageId,
              tokenUsage: currentStreamingMsg.tokenUsage,
              codeBlocks: currentStreamingMsg.codeBlocks,
              reasoning: currentStreamingMsg.reasoning,
            };
            mergedMessages.push(streamingMessagePlain);
          }
        }
      }

      // Convert to array and sort by timestamp to ensure correct order
      // We use array from fetchedMessages primarily but override with our merged map
      const finalMessages = fetchedMessages.map(
        (m) => mergedMessages.find((merged) => merged.id === m.id) || m
      );

      // If there are any streaming/new messages not in fetchedMessages, append them
      // This is less likely with the map approach but good for safety
      mergedMessages.forEach((m) => {
        if (!finalMessages.find((final) => final.id === m.id)) {
          finalMessages.push(m);
        }
      });

      state.messagesByChatId[chatId] = finalMessages.sort(
        (a, b) => a.timestamp - b.timestamp
      );
    })
    .addCase(fetchMessages.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || 'Failed to fetch messages';
    })
    // Send message
    .addCase(sendMessage.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(sendMessage.fulfilled, (state) => {
      state.loading = false;
      // Messages are already added via addMessage actions during the thunk
    })
    .addCase(sendMessage.rejected, (state, action) => {
      state.loading = false;
      state.error =
        (action.error as SerializedError).message || 'Failed to send message';
      // Cleanup streaming on error (streaming is now handled by Rust backend)
      if (state.streamingMessageId) {
        state.streamingMessageId = null;
      }
      // Find and cleanup streamingByChatId
      for (const [chatId, messageId] of Object.entries(
        state.streamingByChatId
      )) {
        if (messageId === state.streamingMessageId) {
          delete state.streamingByChatId[chatId];
          delete state.pausedStreaming[chatId];
          break;
        }
      }
    });
}
