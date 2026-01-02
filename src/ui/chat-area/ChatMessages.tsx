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

  // Track if user is at the bottom of the chat to handle auto-scrolling
  const [isAtBottom, setIsAtBottom] = useState(true);
  const lastSelectedChatIdRef = useRef<string | null>(selectedChatId);

  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current && scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      ) as HTMLElement;

      if (viewport) {
        viewport.scrollTo({
          top: viewport.scrollHeight,
          behavior: instant ? 'auto' : 'smooth',
        });
        return;
      }

      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'auto' : 'smooth',
      });
    }
  }, []);

  // Intersection Observer to detect if user is at bottom
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const viewport = scrollArea.querySelector(
      '[data-slot="scroll-area-viewport"]'
    );

    if (!viewport || !messagesEndRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
      },
      {
        root: viewport,
        threshold: 0,
        rootMargin: '100px', // Allow 100px tolerance
      }
    );

    observer.observe(messagesEndRef.current);

    return () => observer.disconnect();
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    // 1. Handle Chat Switch
    if (
      selectedChatId !== lastSelectedChatIdRef.current &&
      selectedChatId !== null
    ) {
      lastSelectedChatIdRef.current = selectedChatId;
      // Force instant scroll when switching chats
      // Small timeout to ensure content renders
      setTimeout(() => scrollToBottom(true), 50);
      return;
    }

    // 2. Handle Messages Update / Streaming
    const lastMessage = messages[messages.length - 1];

    // If I sent the message, always scroll
    if (lastMessage?.role === 'user') {
      scrollToBottom();
      return;
    }

    // If streaming or receiving new message, scroll only if sticky at bottom
    if (isAtBottom) {
      scrollToBottom(true); // Instant scroll prevents jitter during streaming
    }
  }, [messages, selectedChatId, isAtBottom, scrollToBottom]);

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
    // 1. Sort all messages by timestamp
    const timestampSorted = [...messages].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // 2. Index tool calls by assistant message ID for O(1) lookup
    // This avoids O(N^2) complexity from nested filtering
    const toolCallsMap = new Map<string, typeof messages>();

    for (const m of timestampSorted) {
      if (m.role === 'tool_call' && m.assistantMessageId) {
        if (!toolCallsMap.has(m.assistantMessageId)) {
          toolCallsMap.set(m.assistantMessageId, []);
        }
        const list = toolCallsMap.get(m.assistantMessageId);
        if (list) {
          list.push(m);
        }
      }
    }

    const sorted: typeof messages = [];
    const processedIds = new Set<string>();

    for (const message of timestampSorted) {
      // Skip if already processed (e.g., a tool call already added via its assistant parent)
      if (processedIds.has(message.id)) {
        continue;
      }

      // Add the message itself
      sorted.push(message);
      processedIds.add(message.id);

      // If this is an assistant message, append all its associated tool calls immediately after
      // This ensures Thinking (part of assistant message) -> Tool Call order
      if (message.role === 'assistant') {
        const childToolCalls = toolCallsMap.get(message.id);
        if (childToolCalls) {
          // Tool calls in map are already sorted by timestamp because we iterated timestampSorted
          for (const toolCall of childToolCalls) {
            if (!processedIds.has(toolCall.id)) {
              sorted.push(toolCall);
              processedIds.add(toolCall.id);
            }
          }
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
                userMode={userMode}
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
                    userMode={userMode}
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
