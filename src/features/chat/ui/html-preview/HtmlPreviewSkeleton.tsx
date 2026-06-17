import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { DEFAULT_HTML_PREVIEW_HEIGHT } from '@/features/chat/lib/html-preview';

interface HtmlPreviewSkeletonProps {
  className?: string;
  height?: number;
}

export function HtmlPreviewSkeleton({
  className,
  height = DEFAULT_HTML_PREVIEW_HEIGHT,
}: HtmlPreviewSkeletonProps) {
  const { t } = useTranslation('chat');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md bg-muted/20',
        className
      )}
      style={{ height }}
      data-streamdown="html-preview-skeleton"
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {t('htmlPreview.loading')}
      </span>
    </div>
  );
}
