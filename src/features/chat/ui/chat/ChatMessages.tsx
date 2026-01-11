import { useEffect, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStickToBottom } from 'use-stick-to-bottom';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { editAndResendMessage } from '../../state/messages';
import { removePermissionRequest } from '@/features/tools/state/toolPermissionSlice';
import { setLoading } from '../../state/chatInputSlice';
import { showError } from '@/features/notifications/state/notificationSlice';
import { setAgentChatHistoryDrawerOpen } from '@/features/ui/state/uiSlice';
import { MessageList } from './MessageList';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import type { Message } from '../../types';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { messagesApi } from '../../state/messagesApi';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessageId: string | null;
  onCancelToolExecution?: () => void;
  onEditMessage?: (messageId: string | null) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  streamingMessageId,
  onCancelToolExecution,
  onEditMessage,
}: ChatMessagesProps) {
  // Track render performance
  useComponentPerformance({
    componentName: 'ChatMessages',
    threshold: 50,
  });

  const { t } = useTranslation('chat');
  const { userMode } = useAppSettings();
  const dispatch = useAppDispatch();
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const pendingRequests = useAppSelector(
    (state) => state.toolPermission.pendingRequests
  );

  const handlePermissionRespond = useCallback(
    async (
      messageId: string,
      toolId: string,
      toolName: string,
      approved: boolean
    ) => {
      try {
        await invokeCommand(TauriCommands.RESPOND_TOOL_PERMISSION, {
          messageId,
          approved,
          allowedToolIds: approved ? [toolId] : [],
        });

        if (!approved && selectedChatId) {
          const content = `**System Notification:** Tool \`${toolName}\` denied by user. Flow cancelled.`;
          const id = crypto.randomUUID();
          const timestamp = Date.now();

          // Persist message to backend
          await invokeCommand(TauriCommands.CREATE_MESSAGE, {
            id,
            chatId: selectedChatId,
            role: 'assistant',
            content,
            timestamp,
            assistantMessageId: null,
            toolCallId: null,
          });

          // Refresh messages (Server State)
          dispatch(
            messagesApi.util.invalidateTags([
              { type: 'Message', id: `LIST_${selectedChatId}` },
            ])
          );
        }

        dispatch(removePermissionRequest(messageId));
      } catch (error) {
        console.error('Failed to respond to tool permission:', error);
      }
    },
    [dispatch, selectedChatId]
  );

  // Countdown for pending permissions
  const [permissionTimeLeft, setPermissionTimeLeft] = useState<
    Record<string, number>
  >({});

  // Track which requests have already been timed out to prevent infinite loop
  const processedTimeoutsRef = useRef<Set<string>>(new Set());

  // Timeout for pending permissions
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const TIMEOUT_MS = 60 * 1000; // 60s

      if (pendingRequests) {
        const newTimeLeft: Record<string, number> = {};

        Object.values(pendingRequests).forEach((req) => {
          if (req.timestamp) {
            const elapsed = now - req.timestamp;
            const remaining = Math.max(0, TIMEOUT_MS - elapsed);
            newTimeLeft[req.messageId] = Math.ceil(remaining / 1000);

            // Only process timeout once per request
            if (
              elapsed > TIMEOUT_MS &&
              !processedTimeoutsRef.current.has(req.messageId)
            ) {
              processedTimeoutsRef.current.add(req.messageId);

              // Reject all tools in the request (this will auto-remove from pendingRequests)
              req.toolCalls.forEach((tc) => {
                handlePermissionRespond(req.messageId, tc.id, tc.name, false);
              });

              dispatch(
                showError(
                  t('toolPermissionTimeout', { ns: 'chat' }) ||
                    'Tool permission request timed out'
                )
              );
            }
          }
        });

        setPermissionTimeLeft(newTimeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingRequests, handlePermissionRespond, dispatch, t]);

  const handleViewAgentDetails = useCallback(
    (sessionId: string, agentId: string) => {
      dispatch(
        setAgentChatHistoryDrawerOpen({
          open: true,
          sessionId,
          agentId,
        })
      );
    },
    [dispatch]
  );

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      if (!selectedChatId) return;

      if (!content.trim()) {
        dispatch(
          showError(t('messageCannotBeEmpty') || 'Message cannot be empty')
        );
        return;
      }

      const message = messages.find((m) => m.id === messageId);
      if (!message) return;

      dispatch(setLoading(true));
      try {
        if (message.role === 'user') {
          // For user messages: edit and resend
          await dispatch(
            editAndResendMessage({
              chatId: selectedChatId,
              messageId,
              newContent: content,
            })
          ).unwrap();
        } else if (message.role === 'assistant') {
          // For assistant messages: just update the content
          await invokeCommand(TauriCommands.UPDATE_MESSAGE, {
            id: messageId,
            content,
            reasoning: message.reasoning || null,
            timestamp: null, // Keep original timestamp
          });

          // Refresh messages to show updated content
          dispatch(
            messagesApi.util.invalidateTags([
              { type: 'Message', id: `LIST_${selectedChatId}` },
            ])
          );
        }
      } catch (error: unknown) {
        console.error('Error editing message:', error);
        dispatch(
          showError(
            error instanceof Error
              ? error.message
              : t('errorEditingMessage') || 'Error editing message'
          )
        );
      } finally {
        dispatch(setLoading(false));
      }
    },
    [selectedChatId, dispatch, t, messages]
  );

  // Setup auto scroll hook
  const { scrollRef, contentRef } = useStickToBottom({
    resize: 'smooth',
    initial: 'smooth',
    damping: 0.7,
    stiffness: 0.05,
    mass: 1.25,
  });

  // Refs for ScrollArea
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Attach scrollRef to ScrollArea viewport
  useEffect(() => {
    if (scrollAreaRef.current && typeof scrollRef === 'function') {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        scrollRef(viewport);
      }
    }
  }, [scrollRef]);

  // Ensure viewport is attached when ScrollArea is ready
  useEffect(() => {
    if (scrollAreaRef.current && typeof scrollRef === 'function') {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        scrollRef(viewport);
      }
    }
  });

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 py-4">
      <MessageList
        ref={contentRef}
        messages={messages}
        enableStreaming={true}
        enableThinkingItem={true}
        enablePendingPermissions={true}
        streamingMessageId={streamingMessageId}
        pendingRequests={pendingRequests}
        onSaveEdit={handleSaveEdit}
        onPermissionRespond={handlePermissionRespond}
        onViewAgentDetails={handleViewAgentDetails}
        onCancelToolExecution={onCancelToolExecution}
        onEditingMessageIdChange={onEditMessage}
        permissionTimeLeft={permissionTimeLeft}
        userMode={userMode}
        t={t}
        isLoading={isLoading && !streamingMessageId}
        className="max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto px-4"
      />
    </ScrollArea>
  );
}
