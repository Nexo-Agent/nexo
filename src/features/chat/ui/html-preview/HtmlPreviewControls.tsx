import { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/ui/atoms/dialog';
import { CODE_BLOCK_ACTION_CLASS } from '@/ui/atoms/streamdown/lib/code-block/constants';
import { cn } from '@/lib/utils';
import {
  DEFAULT_HTML_PREVIEW_HEIGHT,
  HTML_PREVIEW_SANDBOX,
} from '@/features/chat/lib/html-preview';

interface HtmlPreviewControlsProps {
  code: string;
  srcdoc: string;
  className?: string;
  disabled?: boolean;
}

function downloadHtmlFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function HtmlPreviewControls({
  code,
  srcdoc,
  className,
  disabled = false,
}: HtmlPreviewControlsProps) {
  const { t } = useTranslation('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      <div className={cn('flex items-center gap-0.5', className)}>
        <button
          type="button"
          className={CODE_BLOCK_ACTION_CLASS}
          disabled={disabled}
          onClick={() => downloadHtmlFile('preview.html', code)}
          title={t('htmlPreview.download')}
        >
          <Download size={14} />
        </button>
        <button
          type="button"
          className={CODE_BLOCK_ACTION_CLASS}
          disabled={disabled}
          onClick={() => setIsFullscreen(true)}
          title={t('htmlPreview.fullscreen')}
        >
          <Maximize2 size={14} />
        </button>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-none! w-[98vw] max-h-[95vh] h-[95vh] p-0 border-none bg-background/95 backdrop-blur-sm flex flex-col">
          <DialogTitle className="sr-only">
            {t('htmlPreview.fullscreen')}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('htmlPreview.fullscreenDescription')}
          </DialogDescription>
          <iframe
            sandbox={HTML_PREVIEW_SANDBOX}
            srcDoc={srcdoc}
            title={t('htmlPreview.fullscreen')}
            className="h-full w-full flex-1 border-0"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

interface HtmlPreviewFrameProps {
  srcdoc: string;
  title: string;
  height?: number;
  className?: string;
}

export function HtmlPreviewFrame({
  srcdoc,
  title,
  height = DEFAULT_HTML_PREVIEW_HEIGHT,
  className,
}: HtmlPreviewFrameProps) {
  return (
    <iframe
      sandbox={HTML_PREVIEW_SANDBOX}
      srcDoc={srcdoc}
      title={title}
      className={cn('w-full border-0 bg-background', className)}
      style={{ height }}
      data-streamdown="html-preview-frame"
    />
  );
}
