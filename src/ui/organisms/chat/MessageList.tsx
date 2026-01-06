import { useMemo, useState, useCallback } from 'react';
import type { Message } from '@/store/types';
import type { PermissionRequest } from '@/store/slices/toolPermissionSlice';
import { ToolCallItem } from '@/ui/organisms/chat/ToolCallItem';
import { ThinkingItem } from '@/ui/organisms/chat/ThinkingItem';
import { MessageItem } from '@/ui/organisms/chat/MessageItem';
import { sortMessages } from './utils/messageSorting';

interface MessageListProps {
  // Data
  messages: Message[];

  // State (optional - if not provided, MessageList manages internally)
  markdownEnabled?: Record<string, boolean>;
  copiedId?: string | null;
  editingMessageId?: string | null;
  editingContent?: string;
  expandedToolCalls?: Record<string, boolean>;
  onMarkdownEnabledChange?: (markdownEnabled: Record<string, boolean>) => void;
  onCopiedIdChange?: (copiedId: string | null) => void;
  onEditingMessageIdChange?: (editingMessageId: string | null) => void;
  onEditingContentChange?: (editingContent: string) => void;
  onExpandedToolCallsChange?: (
    expandedToolCalls: Record<string, boolean>
  ) => void;

  // Feature flags (optional - default from ChatMessages behavior)
  enableStreaming?: boolean; // default: true
  enableThinkingItem?: boolean; // default: true
  enablePendingPermissions?: boolean; // default: true
  streamingMessageId?: string | null;
  pendingRequests?: Record<string, PermissionRequest>;

  // Callbacks (optional - MessageList provides default implementations)
  onSaveEdit?: (messageId: string, content: string) => void | Promise<void>;
  // Default no-op handler if not provided
  onPermissionRespond?: (
    messageId: string,
    toolId: string,
    toolName: string,
    approved: boolean
  ) => void | Promise<void>;
  onViewAgentDetails?: (sessionId: string, agentId: string) => void;

  // Other
  userMode: 'normal' | 'developer';
  t: (key: string) => string;
  isLoading?: boolean;
}

export function MessageList({
  messages,
  markdownEnabled: externalMarkdownEnabled,
  copiedId: externalCopiedId,
  editingMessageId: externalEditingMessageId,
  editingContent: externalEditingContent,
  expandedToolCalls: externalExpandedToolCalls,
  onMarkdownEnabledChange,
  onCopiedIdChange,
  onEditingMessageIdChange,
  onEditingContentChange,
  onExpandedToolCallsChange,
  enableStreaming = true,
  enableThinkingItem = true,
  enablePendingPermissions = true,
  streamingMessageId = null,
  pendingRequests = {},
  onSaveEdit,
  onPermissionRespond,
  onViewAgentDetails,
  userMode,
  t,
}: MessageListProps) {
  // Internal state management (if not controlled from parent)
  const [internalMarkdownEnabled, setInternalMarkdownEnabled] = useState<
    Record<string, boolean>
  >({});
  const [internalCopiedId, setInternalCopiedId] = useState<string | null>(null);
  const [internalEditingMessageId, setInternalEditingMessageId] = useState<
    string | null
  >(null);
  const [internalEditingContent, setInternalEditingContent] =
    useState<string>('');
  const [internalExpandedToolCalls, setInternalExpandedToolCalls] = useState<
    Record<string, boolean>
  >({});

  // Use external state if provided, otherwise use internal state
  const markdownEnabled = externalMarkdownEnabled ?? internalMarkdownEnabled;
  const copiedId = externalCopiedId ?? internalCopiedId;
  const editingMessageId = externalEditingMessageId ?? internalEditingMessageId;
  const editingContent = externalEditingContent ?? internalEditingContent;
  const expandedToolCalls =
    externalExpandedToolCalls ?? internalExpandedToolCalls;

  // Common handlers - shared logic
  const handleCopy = useCallback(
    async (content: string, messageId: string) => {
      try {
        await navigator.clipboard.writeText(content);
        if (onCopiedIdChange) {
          onCopiedIdChange(messageId);
        } else {
          setInternalCopiedId(messageId);
        }
        setTimeout(() => {
          if (onCopiedIdChange) {
            onCopiedIdChange(null);
          } else {
            setInternalCopiedId(null);
          }
        }, 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    },
    [onCopiedIdChange]
  );

  const toggleMarkdown = useCallback(
    (messageId: string) => {
      // If undefined, treat as true (markdown enabled by default)
      const currentValue = markdownEnabled[messageId] ?? true;
      const newValue = {
        ...markdownEnabled,
        [messageId]: !currentValue,
      };
      if (onMarkdownEnabledChange) {
        onMarkdownEnabledChange(newValue);
      } else {
        setInternalMarkdownEnabled(newValue);
      }
    },
    [markdownEnabled, onMarkdownEnabledChange]
  );

  const toggleToolCall = useCallback(
    (id: string) => {
      const newValue = {
        ...expandedToolCalls,
        [id]: !expandedToolCalls[id],
      };
      if (onExpandedToolCallsChange) {
        onExpandedToolCallsChange(newValue);
      } else {
        setInternalExpandedToolCalls(newValue);
      }
    },
    [expandedToolCalls, onExpandedToolCallsChange]
  );

  const handleEdit = useCallback(
    (messageId: string) => {
      const message = messages.find((m) => m.id === messageId);
      if (message) {
        if (onEditingMessageIdChange) {
          onEditingMessageIdChange(messageId);
        } else {
          setInternalEditingMessageId(messageId);
        }
        if (onEditingContentChange) {
          onEditingContentChange(message.content);
        } else {
          setInternalEditingContent(message.content);
        }
      }
    },
    [messages, onEditingMessageIdChange, onEditingContentChange]
  );

  const handleCancelEdit = useCallback(() => {
    if (onEditingMessageIdChange) {
      onEditingMessageIdChange(null);
    } else {
      setInternalEditingMessageId(null);
    }
    if (onEditingContentChange) {
      onEditingContentChange('');
    } else {
      setInternalEditingContent('');
    }
  }, [onEditingMessageIdChange, onEditingContentChange]);

  const handleEditContentChange = useCallback(
    (content: string) => {
      if (onEditingContentChange) {
        onEditingContentChange(content);
      } else {
        setInternalEditingContent(content);
      }
    },
    [onEditingContentChange]
  );

  // Default save handler (no-op if not provided)
  const handleSaveEdit = useCallback(
    (messageId: string, content: string) => {
      if (onSaveEdit) {
        onSaveEdit(messageId, content);
      }
      // If no handler provided, just cancel editing
      handleCancelEdit();
    },
    [onSaveEdit, handleCancelEdit]
  );

  // Memoize sorted messages - only recalculate when messages array changes
  const sortedMessages = useMemo(() => sortMessages(messages), [messages]);

  return (
    <>
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
          enablePendingPermissions && message.role === 'assistant'
            ? pendingRequests[message.id]
            : null;

        return (
          <div key={message.id} className="flex min-w-0 w-full flex-col gap-2">
            {enableThinkingItem &&
              message.role === 'assistant' &&
              message.reasoning && (
                <ThinkingItem
                  content={message.reasoning}
                  isStreaming={
                    enableStreaming &&
                    streamingMessageId === message.id &&
                    !message.content
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
                onViewAgentDetails={onViewAgentDetails}
                isStreaming={
                  enableStreaming && streamingMessageId === message.id
                }
                t={t}
              />
            )}

            {/* Render Pending Tool Calls */}
            {enablePendingPermissions &&
              pending &&
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
                  onRespond={
                    onPermissionRespond
                      ? (allow) =>
                          onPermissionRespond(message.id, tc.id, tc.name, allow)
                      : undefined
                  }
                  userMode={userMode}
                />
              ))}
          </div>
        );
      })}
    </>
  );
}
