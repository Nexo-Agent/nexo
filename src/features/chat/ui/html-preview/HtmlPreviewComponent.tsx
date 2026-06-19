import { Suspense, lazy, useContext, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
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

const PreviewCodeBlock = lazy(() =>
  import('@/ui/atoms/streamdown/lib/code-block/preview-code-block').then(
    (mod) => ({
      default: mod.PreviewCodeBlock,
    })
  )
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
    if (!trimmedCode || isStreamingIncomplete) {
      return { srcdoc: null, error: null as string | null };
    }

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
  }, [trimmedCode, t, currentTheme, isStreamingIncomplete]);

  const previewAvailable = Boolean(previewState.srcdoc) && !previewState.error;

  return (
    <div className={cn('my-1', className)} data-streamdown="html-preview-block">
      <Suspense fallback={<CodeBlockSkeleton />}>
        <PreviewCodeBlock
          code={trimmedCode}
          language="html"
          codeLabel={t('htmlPreview.tabCode')}
          previewLabel={t('htmlPreview.tabPreview')}
          previewAvailable={previewAvailable}
          previewLoading={
            <HtmlPreviewSkeleton className="my-0 rounded-none border-0 shadow-none ring-0" />
          }
          previewHeaderActions={
            previewState.srcdoc ? (
              <HtmlPreviewControls
                code={trimmedCode}
                srcdoc={previewState.srcdoc}
                disabled={isAnimating}
              />
            ) : null
          }
          preview={
            previewState.srcdoc ? (
              <HtmlPreviewFrame
                srcdoc={previewState.srcdoc}
                title={t('htmlPreview.title')}
                height={DEFAULT_HTML_PREVIEW_HEIGHT}
                className="rounded-none"
              />
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {t('htmlPreview.previewUnavailable')}
              </div>
            )
          }
        />
      </Suspense>

      {previewState.error ? (
        <div className="mt-1.5 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span>{previewState.error}</span>
        </div>
      ) : null}
    </div>
  );
}
