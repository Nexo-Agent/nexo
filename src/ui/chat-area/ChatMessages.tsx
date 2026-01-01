import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { editAndResendMessage, addMessage } from '@/store/slices/messages';
import { removePermissionRequest } from '@/store/slices/toolPermissionSlice';
import { setLoading } from '@/store/slices/chatInputSlice';
import { showError } from '@/store/slices/notificationSlice';
import type { Message } from '@/store/types';
import { ToolCallItem } from './toolcall-item';
import { ThinkingItem } from './thinking-item';
import { MessageItem } from './message-item';
import { throttle } from '@/lib/utils';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
  streamingMessageId: string | null;
}

export function ChatMessages({
  messages,
  isLoading,
  streamingMessageId,
}: ChatMessagesProps) {
  const { t } = useTranslation('chat');
  const { userMode } = useAppSettings();
  const dispatch = useAppDispatch();
  const selectedChatId = useAppSelector((state) => state.chats.selectedChatId);
  const pendingRequests = useAppSelector(
    (state) => state.toolPermission.pendingRequests
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [markdownEnabled, setMarkdownEnabled] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedToolCalls, setExpandedToolCalls] = useState<
    Record<string, boolean>
  >({});
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');

  // Track last message count, ID, and content to optimize scroll
  const lastMessageCountRef = useRef(messages.length);
  const lastMessageIdRef = useRef(
    messages.length > 0 ? messages[messages.length - 1].id : null
  );
  const lastMessageContentRef = useRef(
    messages.length > 0 ? messages[messages.length - 1].content : ''
  );
  const lastSelectedChatIdRef = useRef<string | null>(selectedChatId);
  const isUserScrolledUpRef = useRef(false);
  const lastScrollTimeRef = useRef(0);

  // Check if user is scrolled near bottom (within 150px threshold)
  const isNearBottom = useCallback(() => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const viewport = scrollArea.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;
      if (viewport) {
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        return scrollHeight - scrollTop - clientHeight < 150;
      }
    }
    return true;
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      // Find the viewport element inside ScrollArea
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const viewport = scrollArea.querySelector(
          '[data-slot="scroll-area-viewport"]'
        ) as HTMLElement;
        if (viewport && messagesEndRef.current) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: instant ? 'auto' : 'smooth',
          });
          isUserScrolledUpRef.current = false;
          return;
        }
      }
      // Fallback to scrollIntoView
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
      });
      isUserScrolledUpRef.current = false;
    }
  }, []);

  // Throttled scroll for streaming - max once per 100ms

  const throttledScrollToBottom = useMemo(
    () =>
      throttle(() => {
        const now = Date.now();
        // Only scroll if user is near bottom & hasn't manually scrolled up
        if (!isUserScrolledUpRef.current && isNearBottom()) {
          const scrollArea = scrollAreaRef.current;
          if (scrollArea) {
            const viewport = scrollArea.querySelector(
              '[data-slot="scroll-area-viewport"]'
            ) as HTMLElement;
            if (viewport) {
              // Use instant scroll during streaming to prevent janky animations
              viewport.scrollTop = viewport.scrollHeight;
              lastScrollTimeRef.current = now;
            }
          }
        }
      }, 100),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Track user scroll events to detect manual scrolling
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector(
      '[data-slot="scroll-area-viewport"]'
    ) as HTMLElement;
    if (!viewport) return;

    const handleScroll = () => {
      const now = Date.now();
      // If scroll happened recently by auto-scroll, ignore
      if (now - lastScrollTimeRef.current < 200) return;

      // User manually scrolled - check if they scrolled up
      isUserScrolledUpRef.current = !isNearBottom();
    };

    viewport.addEventListener('scroll', handleScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // Scroll to bottom when chat changes (chat opened)
  useEffect(() => {
    // Check if chat has changed
    if (
      selectedChatId !== lastSelectedChatIdRef.current &&
      selectedChatId !== null
    ) {
      lastSelectedChatIdRef.current = selectedChatId;

      // Reset message tracking refs when switching chats
      lastMessageCountRef.current = messages.length;
      lastMessageIdRef.current =
        messages.length > 0 ? messages[messages.length - 1].id : null;
      lastMessageContentRef.current =
        messages.length > 0 ? messages[messages.length - 1].content : '';

      // Scroll to bottom when opening a chat
      // Use requestAnimationFrame + setTimeout to ensure DOM is ready after chat switch
      requestAnimationFrame(() => {
        setTimeout(() => {
          const viewport = scrollAreaRef.current?.querySelector(
            '[data-slot="scroll-area-viewport"]'
          ) as HTMLElement;
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          } else {
            scrollToBottom(true); // Instant scroll when opening chat
          }
        }, 100); // Delay to ensure messages are loaded and rendered
      });
    }
  }, [selectedChatId, scrollToBottom, messages]);

  // Scroll to bottom when messages change, content updates, or loading state changes
  useEffect(() => {
    const currentMessageCount = messages.length;
    const currentLastMessageId =
      messages.length > 0 ? messages[messages.length - 1].id : null;
    const currentLastMessageContent =
      messages.length > 0 ? messages[messages.length - 1].content : '';

    const hasNewMessage =
      currentMessageCount > lastMessageCountRef.current ||
      (currentLastMessageId !== null &&
        currentLastMessageId !== lastMessageIdRef.current);

    const hasContentUpdate =
      currentLastMessageId !== null &&
      currentLastMessageId === lastMessageIdRef.current &&
      currentLastMessageContent !== lastMessageContentRef.current;

    // Also scroll if there are new pending permissions
    const hasNewPermissionRequest = Object.keys(pendingRequests).length > 0;

    // Update refs
    lastMessageCountRef.current = currentMessageCount;
    lastMessageIdRef.current = currentLastMessageId;
    lastMessageContentRef.current = currentLastMessageContent;

    // For new messages, always scroll (user expects to see new content)
    if (hasNewMessage || hasNewPermissionRequest) {
      // Reset user scroll state for new messages
      isUserScrolledUpRef.current = false;
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
    // For content updates during streaming, use throttled scroll
    else if (hasContentUpdate || isLoading) {
      // Use throttled scroll to reduce re-renders and layout shifts
      throttledScrollToBottom();
    }
  }, [
    messages,
    isLoading,
    scrollToBottom,
    throttledScrollToBottom,
    pendingRequests,
  ]);

  const handleCopy = useCallback(async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const toggleMarkdown = useCallback((messageId: string) => {
    setMarkdownEnabled((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

  const toggleToolCall = useCallback((messageId: string) => {
    setExpandedToolCalls((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  }, []);

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
          const content = `🚫 **System Notification:** Tool \`${toolName}\` denied by user. Flow cancelled.`;
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

          // Update Redux state
          dispatch(
            addMessage({
              chatId: selectedChatId,
              message: {
                id,
                role: 'assistant',
                content,
                timestamp,
              },
            })
          );
        }

        dispatch(removePermissionRequest(messageId));
      } catch (error) {
        console.error('Failed to respond to tool permission:', error);
      }
    },
    [dispatch, selectedChatId]
  );

  const handleEdit = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message && message.role === 'user') {
        setEditingMessageId(messageId);
        setEditingContent(message.content);
      }
    },
    [messages]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditingContent('');
  }, []);

  const handleEditContentChange = useCallback((content: string) => {
    setEditingContent(content);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string, content: string) => {
      if (!selectedChatId) return;

      if (!content.trim()) {
        dispatch(
          showError(t('messageCannotBeEmpty') || 'Message cannot be empty')
        );
        return;
      }

      dispatch(setLoading(true));
      try {
        await dispatch(
          editAndResendMessage({
            chatId: selectedChatId,
            messageId,
            newContent: content,
          })
        ).unwrap();

        setEditingMessageId(null);
        setEditingContent('');
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
    [selectedChatId, dispatch, t]
  );

  // Memoize sorted messages - only recalculate when messages array changes
  const sortedMessages = useMemo(() => {
    // Sort messages: tool_call messages should appear before their associated assistant message
    // First, sort all messages by timestamp
    const timestampSorted = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Then, reorganize to place tool_call messages before their assistant messages
    const sorted: typeof messages = [];
    const processedIds = new Set<string>();

    for (const message of timestampSorted) {
      // Skip if already processed
      if (processedIds.has(message.id)) {
        continue;
      }

      // Add the message itself first
      sorted.push(message);
      processedIds.add(message.id);

      // If this is an assistant message, then add all its tool_call messages after it
      // This ensures Thinking (part of assistant message) -> Tool Call order
      if (message.role === 'assistant') {
        const toolCalls = messages.filter(
          (m) =>
            m.role === 'tool_call' &&
            m.assistantMessageId === message.id &&
            !processedIds.has(m.id)
        );

        // Sort tool calls by timestamp and add them after the assistant message
        const sortedToolCalls = toolCalls.sort(
          (a, b) => a.timestamp - b.timestamp
        );

        for (const toolCall of sortedToolCalls) {
          sorted.push(toolCall);
          processedIds.add(toolCall.id);
        }
      }
    }

    return sorted;
  }, [messages]);

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 gap-2 grid">
        {sortedMessages.map((message) => {
          // Skip tool result messages (role="tool") - they are only used internally
          // Tool results are displayed within tool_call messages
          if (message.role === 'tool') {
            return null;
          }

          // Handle tool_call messages separately (completed/executing)
          if (message.role === 'tool_call') {
            return (
              <ToolCallItem
                key={message.id}
                message={message}
                isExpanded={expandedToolCalls[message.id] || false}
                onToggle={toggleToolCall}
                t={t}
              />
            );
          }

          // Regular messages (user/assistant)
          const isMarkdownEnabled = markdownEnabled[message.id] !== false;
          const isEditing = editingMessageId === message.id;
          const pending =
            message.role === 'assistant' ? pendingRequests[message.id] : null;

          return (
            <div
              key={message.id}
              className="flex min-w-0 w-full flex-col gap-2"
            >
              {message.role === 'assistant' && message.reasoning && (
                <ThinkingItem
                  content={message.reasoning}
                  isStreaming={
                    streamingMessageId === message.id && !message.content
                  }
                />
              )}
              {(message.role !== 'assistant' || message.content) && (
                <MessageItem
                  message={message}
                  userMode={userMode}
                  markdownEnabled={isMarkdownEnabled}
                  isCopied={copiedId === message.id}
                  isEditing={isEditing}
                  editingContent={editingContent}
                  onToggleMarkdown={toggleMarkdown}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onCancelEdit={handleCancelEdit}
                  onEditContentChange={handleEditContentChange}
                  onSaveEdit={handleSaveEdit}
                  isStreaming={streamingMessageId === message.id}
                  t={t}
                />
              )}

              {/* Render Pending Tool Calls */}
              {pending &&
                pending.toolCalls.map((tc) => (
                  <ToolCallItem
                    key={tc.id}
                    data={{
                      id: tc.id,
                      name: tc.name,
                      arguments: tc.arguments,
                      status: 'pending_permission',
                    }}
                    isExpanded={expandedToolCalls[tc.id] !== false} // Default to expanded
                    onToggle={toggleToolCall}
                    t={t}
                    onRespond={(allow) =>
                      handlePermissionRespond(message.id, tc.id, tc.name, allow)
                    }
                  />
                ))}
            </div>
          );
        })}

        {isLoading && (
          <div className="mb-6 flex justify-start w-full">
            <div className="flex min-w-0 w-full flex-col gap-2">
              <div className="min-w-0 wrap-break-words rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50" />
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:0.2s]" />
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
