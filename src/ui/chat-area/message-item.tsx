import { useRef, useEffect, useCallback, memo, useState } from 'react';
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
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import { cn } from '@/lib/utils';
import { MarkdownContent } from '@/ui/markdown-content';
import type { Message } from '@/store/types';

export interface MessageItemProps {
  message: Message;
  userMode: 'normal' | 'developer';
  markdownEnabled: boolean;
  isCopied: boolean;
  isEditing: boolean;
  editingContent: string;
  isStreaming: boolean;
  onToggleMarkdown: (messageId: string) => void;
  onCopy: (content: string, messageId: string) => void;
  onEdit: (messageId: string) => void;
  onCancelEdit: () => void;
  onEditContentChange: (content: string) => void;
  onSaveEdit: (messageId: string, content: string) => void;
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
    onToggleMarkdown,
    onCopy,
    onEdit,
    onCancelEdit,
    onEditContentChange,
    onSaveEdit,
    t,
  }: MessageItemProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isCollapsed, setIsCollapsed] = useState(isStreaming ? false : true);

    // Determine if message is long (more than 500 characters or more than 10 lines)
    const isLongMessage =
      message.content.length > 500 || message.content.split('\n').length > 10;

    // Disable collapse/expand for streaming messages
    const canCollapse = isLongMessage && !isStreaming;
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

    // Auto-focus and resize textarea when editing starts
    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        const scrollHeight = textareaRef.current.scrollHeight;
        const minHeight = 40;
        const maxHeight = 200;
        const newHeight = Math.max(
          minHeight,
          Math.min(scrollHeight, maxHeight)
        );
        textareaRef.current.style.height = `${newHeight}px`;
      }
    }, [isEditing]);

    return (
      <div
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
            <div
              className={cn(
                'relative min-w-0 wrap-break-words rounded-2xl px-4 py-3 text-sm leading-relaxed select-text',
                'group/message',
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
                  className={cn(
                    'overflow-hidden transition-all duration-300',
                    canCollapse && isCollapsed ? 'max-h-[300px]' : ''
                  )}
                >
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
                        ? 'bg-gradient-to-t from-primary to-transparent'
                        : 'bg-gradient-to-t from-muted to-transparent'
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
                    onClick={() => setIsCollapsed(!isCollapsed)}
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

              {/* Action buttons - Overlay on message bubble edge */}
              <div
                className={cn(
                  'absolute flex items-center gap-0.5 z-10 px-1 py-0.5',
                  'opacity-0 group-hover/message:opacity-100 transition-opacity duration-200',
                  'top-0 -translate-y-1/2 -translate-x-1/2 left-full'
                )}
              >
                {message.role === 'user' && (
                  <button
                    className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                    onClick={handleEdit}
                    title={t('edit') || 'Edit'}
                  >
                    <Pencil className="h-3 w-3 transition-opacity" />
                  </button>
                )}
                {message.role === 'assistant' && (
                  <button
                    className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                    onClick={handleToggleMarkdown}
                    title={
                      markdownEnabled ? t('showRawText') : t('showMarkdown')
                    }
                  >
                    {markdownEnabled ? (
                      <FileText className="h-3 w-3 text-current opacity-60 hover:opacity-100 transition-opacity" />
                    ) : (
                      <Code className="h-3 w-3 text-current opacity-60 hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                )}
                <button
                  className="h-5 w-5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
                  onClick={handleCopy}
                  title={t('copy')}
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-current opacity-60 hover:opacity-100 transition-opacity" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Token usage info for developer mode */}
          {userMode === 'developer' &&
            message.role === 'assistant' &&
            message.tokenUsage && (
              <div className="text-xs text-muted-foreground space-y-1 px-1">
                <div className="flex gap-4 flex-wrap">
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
      prevProps.message.codeBlocks === nextProps.message.codeBlocks &&
      prevProps.message.tokenUsage === nextProps.message.tokenUsage &&
      prevProps.userMode === nextProps.userMode &&
      prevProps.markdownEnabled === nextProps.markdownEnabled &&
      prevProps.isCopied === nextProps.isCopied &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.editingContent === nextProps.editingContent &&
      prevProps.isStreaming === nextProps.isStreaming
    );
  }
);
