import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import { useConversationView } from './useConversationView';
import { useGetMessagesQuery } from '../state/messagesApi';
import { setConversationPhase } from '../state/conversationRuntimeSlice';
import { logger } from '@/lib/logger';

/**
 * Hook to access and manage messages for the selected chat.
 */
export function useMessages(selectedChatId: string | null) {
  const dispatch = useAppDispatch();
  const { data: messages = [] } = useGetMessagesQuery(selectedChatId || '', {
    skip: !selectedChatId,
  });

  const { streamingMessageId, isStreaming, runtime, phase, queueDepth } =
    useConversationView(selectedChatId);

  const isAgentStreaming =
    isStreaming &&
    messages.some((m) => {
      if (m.id !== streamingMessageId) return false;
      if (!m.metadata) return false;
      try {
        const parsed = JSON.parse(m.metadata);
        return parsed.type === 'agent_card' && parsed.status === 'running';
      } catch {
        return false;
      }
    });

  const handleStopStreaming = () => {
    if (!selectedChatId) return;

    dispatch(
      setConversationPhase({
        chatId: selectedChatId,
        phase: {
          kind: 'cancelled',
          turn_id: runtime?.phase.turn_id ?? null,
          active_message_id:
            runtime?.phase.active_message_id ?? streamingMessageId ?? null,
          iteration: null,
          tool_call_id: null,
          error: null,
        },
      })
    );

    invokeCommand(TauriCommands.CANCEL_MESSAGE, {
      chatId: selectedChatId,
    }).catch((error) => {
      logger.error('[useMessages] CANCEL_MESSAGE failed:', error);
    });
  };

  return {
    messages,
    streamingMessageId,
    isStreaming,
    isAgentStreaming,
    runtime,
    phase,
    queueDepth,
    handleStopStreaming,
  };
}
