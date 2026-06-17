import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { stopStreaming } from '../state/messages';
import { useGetMessagesQuery } from '../state/messagesApi';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { logger } from '@/lib/logger';

/**
 * Hook to access and manage messages
 */
export function useMessages(selectedChatId: string | null) {
  const dispatch = useAppDispatch();

  const { data: messages = [] } = useGetMessagesQuery(selectedChatId || '', {
    skip: !selectedChatId,
  });

  const streamingMessageId = useAppSelector(
    (state) => state.messages.streamingMessageId
  );
  const streamingByChatId = useAppSelector(
    (state) => state.messages.streamingByChatId
  );
  const pausedStreaming = useAppSelector(
    (state) => state.messages.pausedStreaming
  );

  const isStreaming = selectedChatId
    ? !!streamingByChatId[selectedChatId]
    : false;

  const isAgentStreaming =
    messages.some((m) => {
      if (m.id !== streamingByChatId[selectedChatId || '']) return false;
      if (!m.metadata) return false;
      try {
        const parsed = JSON.parse(m.metadata);
        return parsed.type === 'agent_card' && parsed.status === 'running';
      } catch {
        return false;
      }
    }) && isStreaming;

  const handleStopStreaming = () => {
    if (selectedChatId) {
      dispatch(stopStreaming(selectedChatId));

      invokeCommand(TauriCommands.CANCEL_MESSAGE, {
        chatId: selectedChatId,
      }).catch((error) => {
        logger.error('[useMessages] CANCEL_MESSAGE failed:', error);
      });
    } else {
      dispatch(stopStreaming());
    }
  };

  return {
    messages,
    streamingMessageId,
    streamingByChatId,
    pausedStreaming,
    isStreaming,
    isAgentStreaming,
    handleStopStreaming,
  };
}
