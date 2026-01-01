import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchMessages, stopStreaming } from '@/store/slices/messages';

/**
 * Hook to access and manage messages
 */
export function useMessages(selectedChatId: string | null) {
  const dispatch = useAppDispatch();

  // Selectors
  const messages = useAppSelector((state) => {
    if (!selectedChatId) return [];
    return state.messages.messagesByChatId[selectedChatId] || [];
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

  // Check if current chat is streaming
  const isStreaming = selectedChatId
    ? !!streamingByChatId[selectedChatId]
    : false;

  // Load messages when chat changes
  useEffect(() => {
    if (!selectedChatId) return;
    dispatch(fetchMessages(selectedChatId));
  }, [selectedChatId, dispatch]);

  // Handlers
  const handleStopStreaming = () => {
    if (selectedChatId) {
      dispatch(stopStreaming(selectedChatId));
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
    handleStopStreaming,
  };
}
