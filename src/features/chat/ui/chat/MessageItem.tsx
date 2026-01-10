import { useRef, useCallback, memo, useState } from 'react';
import {
  Copy,
  Code,
  FileText,
  Check,
  Pencil,
  X,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { MessageImage } from './MessageImage';
import { MessageFile } from './MessageFile';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '@/ui/organisms/markdown/MarkdownContent';
import { AgentCard } from './AgentCard';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import { useAppDispatch } from '@/app/hooks';
import { setImagePreviewOpen } from '@/features/ui/state/uiSlice';
import type { Message } from '../../types';

export interface MessageItemProps {
  message: Message;
  userMode: 'normal' | 'developer';
  markdownEnabled: boolean;
  isCopied: boolean;
  isEditing: boolean;
  editingContent: string;
  isStreaming: boolean;
  isLastMessage?: boolean;
  onToggleMarkdown: (messageId: string) => void;
  onCopy: (content: string, messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onViewAgentDetails?: (sessionId: string, agentId: string) => void;
  t: (key: string) => string;
}

export const MessageItem = memo(
  function MessageItem({
    message,
    userMode,
    markdownEnabled,
    isCopied,
    isEditing,
    editingContent,
    isStreaming,
    isLastMessage = false,
    onToggleMarkdown,
    onCopy,
    onEdit,
    onCancelEdit,
    onEditContentChange,
    onSaveEdit,
    onViewAgentDetails,
    t,
  }: MessageItemProps) {
    // Track render performance
    useComponentPerformance({
      componentName: 'MessageItem',
      threshold: 30,
    });
    const dispatch = useAppDispatch();
    // Determine if message is long (more than 500 characters or more than 10 lines)
    const isLongMessage =
      message.content.length > 500 || message.content.split('\n').length > 10;
    // Disable collapse/expand for streaming messages
    const canCollapse = isLongMessage && !isStreaming;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const messageRef = useRef<HTMLDivElement>(null);

    // Don't collapse by default if it's the last message or if streaming
    const [isCollapsed, setIsCollapsed] = useState(
      !isStreaming && !isLastMessage
    );

    const handleToggleCollapse = useCallback(() => {
      const newCollapsed = !isCollapsed;
      setIsCollapsed(newCollapsed);

      // If we're collapsing the message, scroll the top of the message into view
      if (newCollapsed && messageRef.current) {
        messageRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, [isCollapsed]);

    const handleCopy = useCallback(() => {
      onCopy(message.content, message.id);
    }, [message.content, message.id, onCopy]);

    const handleToggleMarkdown = useCallback(() => {
      onToggleMarkdown(message.id);
    }, [message.id, onToggleMarkdown]);

    const handleEdit = useCallback(() => {
      onEdit(message.id);
    }, [message.id, onEdit]);

    const handleSave = useCallback(() => {
      if (editingContent.trim()) {
        onSaveEdit(message.id, editingContent.trim());
      }
    }, [message.id, editingContent, onSaveEdit]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleSave();
        } else if (e.key === 'Escape') {
          onCancelEdit();
        }
      },
      [handleSave, onCancelEdit]
    );

    // Check for Agent Card metadata
    let agentCardData = null;
    if (message.metadata) {
      try {
        const parsed = JSON.parse(message.metadata);
        if (parsed && parsed.type === 'agent_card') {
          agentCardData = parsed;
        }
      } catch (_) {
        // Ignore JSON parse errors
      }
    }

    if (agentCardData) {
      return (
        <div className="flex w-full justify-start my-2">
          <AgentCard
            agentId={agentCardData.agent_id}
            sessionId={agentCardData.session_id}
            status={agentCardData.status}
            onViewDetails={(sessionId) => {
              onViewAgentDetails?.(sessionId, agentCardData.agent_id);
            }}
          >
            {agentCardData.summary && (
              <MarkdownContent
                content={agentCardData.summary}
                messageId={message.id}
              />
            )}
          </AgentCard>
        </div>
      );
    }

    return (
      <div
        ref={messageRef}
        className={cn(
          'group flex min-w-0 w-full',
          message.role === 'user' ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'flex min-w-0 w-full flex-col gap-2',
            message.role === 'user' && 'items-end'
          )}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2 w-full max-w-3xl">
              <Textarea
                ref={textareaRef}
                value={editingContent}
                onChange={(e) => onEditContentChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[40px] max-h-[200px] resize-none"
                placeholder={t('enterMessage')}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancelEdit}
                  className="h-7"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={!editingContent.trim()}
                  className="h-7"
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {t('save') || 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative flex flex-col gap-1 group">
              <div
                className={cn(
                  'relative min-w-0 wrap-break-words rounded-lg px-3 py-2 text-sm leading-relaxed select-text',
                  isStreaming && 'will-change-contents',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
                style={
                  isStreaming
                    ? {
                        contain: 'layout style',
                      }
                    : undefined
                }
              >
                <div className="relative">
                  <div
                    ref={contentRef}
                    className={cn(
                      'overflow-hidden transition-[max-height] duration-300 ease-in-out',
                      canCollapse && isCollapsed
                        ? 'max-h-[300px]'
                        : 'max-h-[9999px]'
                    )}
                  >
                    {/* Check for Files/Images in metadata */}
                    {message.metadata &&
                      (() => {
                        try {
                          const parsed = JSON.parse(message.metadata);

                          // Try new format first (files array)
                          let fileList: Array<
                            string | { path: string; mimeType: string }
                          > = [];
                          if (
                            parsed &&
                            Array.isArray(parsed.files) &&
                            parsed.files.length > 0
                          ) {
                            fileList = parsed.files;
                          }
                          // Fallback to old format (images array)
                          else if (
                            parsed &&
                            Array.isArray(parsed.images) &&
                            parsed.images.length > 0
                          ) {
                            fileList = parsed.images;
                          }

                          if (fileList.length === 0) {
                            return null;
                          }

                          return (
                            <div className="mb-3 flex flex-col gap-2">
                              {fileList.map((fileData, index) => {
                                // Parse file data
                                let filePath: string;
                                let mimeType: string | undefined;

                                if (typeof fileData === 'string') {
                                  filePath = fileData;
                                  // Try to guess mime type from data URL or extension
                                  if (fileData.startsWith('data:')) {
                                    const match = fileData.match(/data:(.*?);/);
                                    mimeType = match ? match[1] : undefined;
                                  }
                                } else if (
                                  typeof fileData === 'object' &&
                                  fileData.path
                                ) {
                                  filePath = fileData.path;
                                  mimeType = fileData.mimeType;
                                } else {
                                  return null;
                                }

                                // Determine if it's an image
                                const isImage =
                                  mimeType?.startsWith('image/') ||
                                  (!mimeType &&
                                    (filePath.match(
                                      /\.(jpg|jpeg|png|gif|webp)$/i
                                    ) ||
                                      (filePath.startsWith('data:') &&
                                        filePath.includes('image/'))));

                                if (isImage) {
                                  // Render image with preview
                                  return (
                                    <div
                                      key={index}
                                      className="relative w-fit max-w-[400px] overflow-hidden rounded-lg border border-border/50 bg-background/50 cursor-pointer hover:opacity-90 transition-opacity"
                                    >
                                      <MessageImage
                                        src={filePath}
                                        alt={`Attached image ${index + 1}`}
                                        className="max-h-[300px] w-auto h-auto object-contain"
                                        onClick={(url) =>
                                          dispatch(
                                            setImagePreviewOpen({
                                              open: true,
                                              url,
                                            })
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                } else {
                                  // Render file card
                                  return (
                                    <MessageFile
                                      key={index}
                                      src={filePath}
                                      mimeType={mimeType}
                                      className="max-w-[400px]"
                                    />
                                  );
                                }
                              })}
                            </div>
                          );
                        } catch (_) {
                          return null;
                        }
                      })()}

                    {message.role === 'assistant' ? (
                      <>
                        {markdownEnabled ? (
                          <MarkdownContent
                            content={message.content}
                            messageId={message.id}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap wrap-break-words">
                            {message.content}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="whitespace-pre-wrap wrap-break-words">
                        {message.content}
                      </div>
                    )}
                  </div>

                  {/* Gradient fade overlay when collapsed */}
                  {canCollapse && isCollapsed && (
                    <div
                      className={cn(
                        'absolute bottom-0 left-0 right-0 h-16 pointer-events-none',
                        message.role === 'user'
                          ? 'bg-linear-to-t from-primary to-transparent'
                          : 'bg-linear-to-t from-muted to-transparent'
                      )}
                    />
                  )}
                </div>

                {/* Collapse/Expand button */}
                {canCollapse && (
                  <div
                    className={cn(
                      'flex items-center mt-2 pt-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <button
                      className="text-xs opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                      onClick={handleToggleCollapse}
                    >
                      {isCollapsed ? (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          {t('showMore')}
                        </>
                      ) : (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          {t('showLess')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Control buttons - positioned at bottom right corner, overlapping 50% into message */}
              <div
                className={cn(
                  'absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2',
                  'flex items-center gap-0.5',
                  'rounded-md backdrop-blur-md',
                  'bg-background/95 border border-border shadow-lg',
                  'p-0.5',
                  'opacity-0 group-hover:opacity-100 transition-opacity duration-150'
                )}
              >
                {message.role === 'user' && (
                  <button
                    className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors group/btn"
                    onClick={handleEdit}
                    title={t('edit') || 'Edit'}
                  >
                    <Pencil className="h-3.5 w-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                )}
                {message.role === 'assistant' && (
                  <>
                    <button
                      className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors group/btn"
                      onClick={handleEdit}
                      title={t('edit') || 'Edit'}
                    >
                      <Pencil className="h-3.5 w-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors group/btn"
                      onClick={handleToggleMarkdown}
                      title={
                        markdownEnabled ? t('showRawText') : t('showMarkdown')
                      }
                    >
                      {markdownEnabled ? (
                        <FileText className="h-3.5 w-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                      ) : (
                        <Code className="h-3.5 w-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                      )}
                    </button>
                  </>
                )}
                <button
                  className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors group/btn"
                  onClick={handleCopy}
                  title={t('copy')}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>

              {/* Footer: Only show token usage for developer mode */}
              {userMode === 'developer' &&
                message.role === 'assistant' &&
                message.tokenUsage && (
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 select-text mt-1 pl-2">
                    {message.tokenUsage.promptTokens !== undefined && (
                      <span>
                        {t('promptTokens')}:{' '}
                        {message.tokenUsage.promptTokens.toLocaleString()}
                      </span>
                    )}
                    {message.tokenUsage.completionTokens !== undefined && (
                      <span>
                        {t('completionTokens')}:{' '}
                        {message.tokenUsage.completionTokens.toLocaleString()}
                      </span>
                    )}
                    {message.tokenUsage.totalTokens !== undefined && (
                      <span>
                        {t('totalTokens')}:{' '}
                        {message.tokenUsage.totalTokens.toLocaleString()}
                      </span>
                    )}
                    {message.tokenUsage.tokensPerSecond !== undefined && (
                      <span>
                        {t('tokensPerSecond')}:{' '}
                        {message.tokenUsage.tokensPerSecond.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if relevant props change
    // Note: onToggleMarkdown and onCopy are stable callbacks from useCallback, so we don't need to compare them
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.reasoning === nextProps.message.reasoning &&
      prevProps.message.codeBlocks === nextProps.message.codeBlocks &&
      prevProps.message.tokenUsage === nextProps.message.tokenUsage &&
      prevProps.message.metadata === nextProps.message.metadata && // Include metadata for agent card updates
      prevProps.userMode === nextProps.userMode &&
      prevProps.markdownEnabled === nextProps.markdownEnabled &&
      prevProps.isCopied === nextProps.isCopied &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.editingContent === nextProps.editingContent &&
      prevProps.isStreaming === nextProps.isStreaming &&
      prevProps.isLastMessage === nextProps.isLastMessage
    );
  }
);
