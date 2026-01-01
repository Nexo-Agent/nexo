import { Component, ErrorInfo, ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Streamdown } from '@/ui/atoms/streamdown';
import { useThrottledDebounce } from '@/ui/atoms/streamdown/hooks/use-throttled-debouce';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { CustomCodeComponent } from './CustomCodeComponent';

export function MarkdownContent({
  content,
  className,
  messageId,
}: MarkdownContentProps) {
  const { t } = useTranslation('common');
  const sanitizedContent =
    typeof content === 'string' ? content : String(content || '');
  const streamingMessageId = useAppSelector(
    (state) => state.messages.streamingMessageId
  );
  const isStreaming = messageId ? streamingMessageId === messageId : false;

  // Throttle/debounce content updates during streaming to improve performance
  // - throttleMs: Update immediately if 100ms has passed since last update (ensures responsiveness)
  // - debounceMs: Otherwise, wait 30ms before updating (batches rapid chunks)
  // This prevents parsing markdown on every single chunk, which can cause UI freezing
  // When not streaming, update immediately (no throttling) to show final content right away
  const throttledContent = useThrottledDebounce(
    sanitizedContent,
    isStreaming ? 100 : 0, // Throttle: update immediately if 100ms passed (only when streaming)
    isStreaming ? 30 : 0 // Debounce: wait 30ms before updating (only when streaming)
  );

  // Override code component to add run button
  const components = useMemo(
    () => ({
      code: CustomCodeComponent,
    }),
    []
  );

  return (
    <MarkdownErrorBoundary
      fallback={(error) => (
        <div className={cn('markdown-content', className)}>
          <div className="whitespace-pre-wrap wrap-break-words text-sm text-muted-foreground">
            {sanitizedContent}
          </div>
          {error && (
            <div className="mt-2 text-xs text-destructive">
              {t('markdownDisplayError')} {error.message}
            </div>
          )}
        </div>
      )}
    >
      <div className={cn('markdown-content', className)}>
        <Streamdown
          mode="streaming"
          isAnimating={isStreaming}
          parseIncompleteMarkdown={true}
          controls
          components={components}
        >
          {throttledContent}
        </Streamdown>
      </div>
    </MarkdownErrorBoundary>
  );
}

interface MarkdownContentProps {
  content: string;
  className?: string;
  messageId?: string; // Message ID to check if it's currently streaming
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class MarkdownErrorBoundary extends Component<
  { children: ReactNode; fallback: (error?: Error) => ReactNode },
  ErrorBoundaryState
> {
  constructor(props: {
    children: ReactNode;
    fallback: (error?: Error) => ReactNode;
  }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Markdown rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <>{this.props.fallback(this.state.error)}</>;
    }
    return <>{this.props.children}</>;
  }
}
