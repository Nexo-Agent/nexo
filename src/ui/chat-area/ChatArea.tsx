import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useMessages } from '@/hooks/useMessages';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { sendMessage } from '@/store/slices/messages';
import { setLoading, clearInput } from '@/store/slices/chatInputSlice';
import { showError } from '@/store/slices/notificationSlice';

export function ChatArea() {
  const { t } = useTranslation(['common', 'settings']);
  const dispatch = useAppDispatch();

  // Use workspaces hook to get selectedWorkspaceId and selectedLLMConnectionId
  const { selectedWorkspace, selectedWorkspaceId, workspaceSettings } =
    useWorkspaces();

  // Get selectedChatId from Redux state
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);

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
  const isLoading = useAppSelector((state) => state.chatInput.isLoading);

  const llmConnections = useAppSelector(
    (state) => state.llmConnections.llmConnections
  );

  // Use messages hook
  const { messages, pausedStreaming, isStreaming, streamingMessageId } =
    useMessages(selectedChatId);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedWorkspace || !selectedChatId)
      return;

    const workspaceSetting = workspaceSettings[selectedWorkspace.id];
    const llmConnectionId = workspaceSetting?.llmConnectionId;

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

    if (!selectedModel) {
      dispatch(showError(t('pleaseSelectModel', { ns: 'settings' })));
      return;
    }

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
            disabled={isLoading}
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
        isLoading={isStreaming && !pausedStreaming[selectedChatId || '']}
        streamingMessageId={streamingMessageId}
      />

      {/* Input Area */}
      <ChatInput
        selectedWorkspaceId={selectedWorkspaceId}
        selectedChatId={selectedChatId}
        selectedLLMConnectionId={selectedLLMConnectionId}
        onSend={handleSend}
        disabled={isLoading}
        dropdownDirection="up"
      />
    </>
  );
}
