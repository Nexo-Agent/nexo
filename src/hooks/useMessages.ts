import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchMessages,
  stopStreaming,
  setStreamingError,
  clearStreamingError,
  setStreamingStartTime,
  clearStreamingStartTime,
} from '@/store/slices/messages';
import { showError } from '@/store/slices/notificationSlice';
import { useTranslation } from 'react-i18next';

const STREAMING_TIMEOUT = 60000; // 60 seconds

/**
 * Hook to access and manage messages
 */
export function useMessages(selectedChatId: string | null) {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('chat');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

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
  const streamingErrors = useAppSelector(
    (state) => state.messages.streamingErrors
  );
  const streamingStartTimes = useAppSelector(
    (state) => state.messages.streamingStartTimes
  );

  // Check if current chat is streaming
  const isStreaming = selectedChatId
    ? !!streamingByChatId[selectedChatId]
    : false;

  // Get streaming error for current chat
  const streamingError = selectedChatId
    ? streamingErrors[selectedChatId]
    : undefined;

  // Load messages when chat changes
  useEffect(() => {
    if (!selectedChatId) return;

    // Race condition protection: cancelled flag to ignore stale responses
    let cancelled = false;

    const loadMessages = async () => {
      try {
        await dispatch(fetchMessages(selectedChatId)).unwrap();

        // If cancelled (user switched chat), don't do anything
        // The reducer will also validate chatId to be safe
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load messages:', error);
          // Error is already handled in the reducer
        }
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedChatId, dispatch]);

  // Timeout mechanism for streaming
  useEffect(() => {
    if (!selectedChatId) return;

    const currentStreamingMessageId = streamingByChatId[selectedChatId];

    // If not streaming for this chat, return early
    if (!currentStreamingMessageId) {
      return;
    }

    const startTime = streamingStartTimes[selectedChatId];

    // Set initial start time if not already set
    if (!startTime) {
      dispatch(
        setStreamingStartTime({ chatId: selectedChatId, timestamp: Date.now() })
      );
      return; // Let the next render handle the rest
    }

    // Timeout timer
    const timeoutId = setTimeout(() => {
      // Still streaming after timeout -> trigger error
      if (streamingByChatId[selectedChatId]) {
        // Show error notification
        dispatch(
          showError(
            t('streamingTimeout') || 'Streaming timeout. Please try again.'
          )
        );

        // Set streaming error state
        dispatch(
          setStreamingError({
            chatId: selectedChatId,
            messageId: currentStreamingMessageId,
            error: 'timeout',
            canRetry: true,
          })
        );

        // Stop streaming
        dispatch(stopStreaming(selectedChatId));

        // Clear start time
        dispatch(clearStreamingStartTime(selectedChatId));
      }
    }, STREAMING_TIMEOUT);

    // Cleanup on streaming complete or chat switch
    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedChatId, streamingByChatId, streamingStartTimes, dispatch, t]);

  // Separate effect for countdown display (runs every second)
  // Note: setState in effect is intentional here for real-time countdown updates
  useEffect(() => {
    if (!selectedChatId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(null);
      return;
    }

    const startTime = streamingStartTimes[selectedChatId];
    const isCurrentlyStreaming = !!streamingByChatId[selectedChatId];

    if (!isCurrentlyStreaming || !startTime) {
      setTimeLeft(null);
      return;
    }

    // Update countdown every second
    const countdownInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, STREAMING_TIMEOUT - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 1000);

    // Set initial value immediately
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, STREAMING_TIMEOUT - elapsed);

    setTimeLeft(Math.ceil(remaining / 1000));

    return () => {
      clearInterval(countdownInterval);
    };
  }, [selectedChatId, streamingByChatId, streamingStartTimes]);

  // Clear error when chat changes or streaming starts again
  useEffect(() => {
    if (selectedChatId && streamingError && isStreaming) {
      dispatch(clearStreamingError(selectedChatId));
    }
  }, [selectedChatId, streamingError, isStreaming, dispatch]);

  // Handlers
  const handleStopStreaming = () => {
    if (selectedChatId) {
      dispatch(stopStreaming(selectedChatId));
      dispatch(clearStreamingStartTime(selectedChatId));
      setTimeLeft(null);
    } else {
      dispatch(stopStreaming());
    }
  };

  const handleRetryStreaming = () => {
    if (selectedChatId && streamingError) {
      dispatch(clearStreamingError(selectedChatId));
      // Retry logic will be handled by user re-sending the message
    }
  };

  return {
    messages,
    streamingMessageId,
    streamingByChatId,
    pausedStreaming,
    isStreaming,
    streamingError,
    timeLeft,
    handleStopStreaming,
    handleRetryStreaming,
  };
}
