import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { AgentChatHistoryDialog } from '@/features/agent';
import { useMessages } from '../../hooks/useMessages';
import { useWorkspaces } from '@/features/workspace';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { sendMessage } from '../../state/messages';
import { setLoading, clearInput } from '../../state/chatInputSlice';
import { showError } from '@/features/notifications/state/notificationSlice';
import { setAgentChatHistoryDrawerOpen } from '@/features/ui/state/uiSlice';
import { useGetLLMConnectionsQuery } from '@/features/llm';

export function ChatArea() {
  const { t } = useTranslation(['common', 'settings']);
  const dispatch = useAppDispatch();

  // Use workspaces hook to get selectedWorkspaceId and selectedLLMConnectionId
  const { selectedWorkspace, selectedWorkspaceId, workspaceSettings } =
    useWorkspaces();

  // Get selectedChatId from Redux state
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);

  // Get agent chat history drawer state
  const agentChatHistoryDrawerOpen = useAppSelector(
    (state) => state.ui.agentChatHistoryDrawerOpen
  );
  const agentChatHistorySessionId = useAppSelector(
    (state) => state.ui.agentChatHistorySessionId
  );
  const agentChatHistoryAgentId = useAppSelector(
    (state) => state.ui.agentChatHistoryAgentId
  );

  const selectedLLMConnectionId = selectedWorkspace
    ? workspaceSettings[selectedWorkspace.id]?.llmConnectionId
    : undefined;

  // Get chat input state for handleSend
  const input = useAppSelector((state) => state.chatInput.input);
  const selectedModel = useAppSelector(
    (state) => state.chatInput.selectedModel
  );
  const attachedFiles = useAppSelector(
    (state) => state.chatInput.attachedFiles
  );

  const { data: llmConnections = [] } = useGetLLMConnectionsQuery();

  // Use messages hook
  const {
    messages,
    pausedStreaming,
    isStreaming,
    isAgentStreaming,
    streamingMessageId,
    streamingError,
    timeLeft,
    handleStopStreaming,
    handleRetryStreaming,
  } = useMessages(selectedChatId);

  const handleSend = async () => {
    if (!input.trim() || !selectedWorkspace || !selectedChatId) {
      return;
    }

    if (input.length > MAX_MESSAGE_LENGTH) {
      dispatch(
        showError(
          t('messageTooLong', {
            length: input.length,
            max: MAX_MESSAGE_LENGTH,
            ns: 'chat',
          })
        )
      );
      return;
    }

    const workspaceSetting = workspaceSettings[selectedWorkspace.id];
    let llmConnectionId = workspaceSetting?.llmConnectionId;
    let modelId = selectedModel;

    if (selectedModel?.includes('::')) {
      const [connId, ...modelIdParts] = selectedModel.split('::');
      llmConnectionId = connId;
      modelId = modelIdParts.join('::');
    }

    if (!llmConnectionId) {
      dispatch(showError(t('pleaseSelectLLMConnection', { ns: 'settings' })));
      return;
    }

    const llmConnection = llmConnections.find(
      (conn) => conn.id === llmConnectionId
    );
    if (!llmConnection) {
      dispatch(showError(t('llmConnectionNotFound', { ns: 'settings' })));
      return;
    }

    if (!modelId) {
      dispatch(showError(t('pleaseSelectModel', { ns: 'settings' })));
      return;
    }

    // Track message send
    const { trackMessageSend, setLLMContext, setChatContext } =
      await import('@/lib/sentry-utils');
    trackMessageSend(
      selectedChatId,
      input.trim().length,
      attachedFiles.length > 0
    );
    setLLMContext(llmConnection.provider, modelId);
    setChatContext(selectedChatId);

    // Log attached files for debugging
    if (attachedFiles.length > 0) {
    }

    const userInput = input.trim();

    // Clear input immediately for better UX
    dispatch(clearInput());
    dispatch(setLoading(true));

    try {
      // Send message with streaming support (streaming handled via Tauri events)
      await dispatch(
        sendMessage({
          chatId: selectedChatId,
          content: userInput,
        })
      ).unwrap();

      // Note: Chat last message is updated by Rust core after message completion
      // Events will handle content updates, so we don't need to update it here
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      // Error message is already handled in the thunk
      // Note: Input is already cleared, which is fine for UX
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (messages.length === 0) {
    // Empty state: Show slogan and center the input
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <Sparkles className="size-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {t('chatSlogan', { ns: 'common' })}
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {t('chatSloganDescription', { ns: 'common' })}
          </p>
        </div>
        <div className="w-full max-w-3xl px-4">
          <ChatInput
            selectedWorkspaceId={selectedWorkspaceId}
            selectedChatId={selectedChatId}
            selectedLLMConnectionId={selectedLLMConnectionId}
            onSend={handleSend}
            disabled={false}
            timeLeft={timeLeft}
            streamingError={selectedChatId ? streamingError : undefined}
            onRetryStreaming={handleRetryStreaming}
          />
        </div>
      </div>
    );
  }

  // Has messages: Normal layout
  return (
    <>
      {/* Messages Area */}
      <ChatMessages
        messages={messages}
        isLoading={
          isStreaming &&
          !pausedStreaming[selectedChatId || ''] &&
          !isAgentStreaming
        }
        streamingMessageId={streamingMessageId}
        onCancelToolExecution={handleStopStreaming}
      />

      {/* Input Area */}
      <ChatInput
        selectedWorkspaceId={selectedWorkspaceId}
        selectedChatId={selectedChatId}
        selectedLLMConnectionId={selectedLLMConnectionId}
        onSend={handleSend}
        disabled={false}
        dropdownDirection="up"
        timeLeft={timeLeft}
        streamingError={selectedChatId ? streamingError : undefined}
        onRetryStreaming={handleRetryStreaming}
      />

      {/* Agent Chat History Dialog */}
      <AgentChatHistoryDialog
        open={agentChatHistoryDrawerOpen}
        onOpenChange={(open) =>
          dispatch(
            setAgentChatHistoryDrawerOpen({
              open,
              sessionId: null,
              agentId: null,
            })
          )
        }
        sessionId={agentChatHistorySessionId}
        agentId={agentChatHistoryAgentId}
      />
    </>
  );
}
