import { Suspense, lazy, useContext, useMemo } from 'react';
import { AlertCircle, Code2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/app/hooks';
import { StreamdownContext } from '@/ui/atoms/streamdown/lib/context';
import { CodeBlockSkeleton } from '@/ui/atoms/streamdown/lib/code-block/skeleton';
import { cn } from '@/lib/utils';
import {
  buildSandboxSrcdoc,
  DEFAULT_HTML_PREVIEW_HEIGHT,
  HtmlPreviewValidationError,
  isCompleteHtmlDocument,
} from '@/features/chat/lib/html-preview';
import { HtmlPreviewControls, HtmlPreviewFrame } from './HtmlPreviewControls';
import { HtmlPreviewSkeleton } from './HtmlPreviewSkeleton';

const CodeBlock = lazy(() =>
  import('@/ui/atoms/streamdown/lib/code-block').then((mod) => ({
    default: mod.CodeBlock,
  }))
);

interface HtmlPreviewComponentProps {
  code: string;
  className?: string;
}

export function HtmlPreviewComponent({
  code,
  className,
}: HtmlPreviewComponentProps) {
  const { t } = useTranslation('chat');
  const { isAnimating } = useContext(StreamdownContext);
  const currentTheme = useAppSelector((state) => state.ui.theme);

  const trimmedCode = code.trim();
  const isStreamingIncomplete =
    isAnimating && !isCompleteHtmlDocument(trimmedCode);

  const previewState = useMemo(() => {
    try {
      return {
        srcdoc: buildSandboxSrcdoc(trimmedCode),
        error: null as string | null,
      };
    } catch (error) {
      const message =
        error instanceof HtmlPreviewValidationError
          ? error.message
          : t('htmlPreview.renderError');
      return { srcdoc: null, error: message };
    }
  }, [trimmedCode, t, currentTheme]);

  if (isStreamingIncomplete) {
    return (
      <div
        className={cn('my-2', className)}
        data-streamdown="html-preview-block"
      >
        <HtmlPreviewSkeleton />
      </div>
    );
  }

  if (previewState.error || !previewState.srcdoc) {
    return (
      <div
        className={cn('group relative my-2', className)}
        data-streamdown="html-preview-block"
      >
        <div className="mb-2 flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{previewState.error}</span>
        </div>
        <Suspense fallback={<CodeBlockSkeleton />}>
          <CodeBlock
            className="overflow-x-auto border-border border-t"
            code={trimmedCode}
            language="html"
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div
      className={cn('group relative my-2', className)}
      data-streamdown="html-preview-block"
    >
      <HtmlPreviewControls
        code={trimmedCode}
        srcdoc={previewState.srcdoc}
        disabled={isAnimating}
        className="absolute right-0 top-0 z-10 flex items-center gap-1 rounded-md bg-background/80 p-0.5 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100"
      />
      <HtmlPreviewFrame
        srcdoc={previewState.srcdoc}
        title={t('htmlPreview.title')}
        height={DEFAULT_HTML_PREVIEW_HEIGHT}
      />
      <details className="mt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Code2 className="size-3.5" />
          {t('htmlPreview.viewSource')}
        </summary>
        <div className="mt-2">
          <Suspense fallback={<CodeBlockSkeleton />}>
            <CodeBlock
              className="overflow-x-auto border-border border-t"
              code={trimmedCode}
              language="html"
            />
          </Suspense>
        </div>
      </details>
    </div>
  );
}
