import { useState, useEffect } from 'react';
import * as opener from '@tauri-apps/plugin-opener';
import { ExternalLink } from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  getDisplayFileName,
  getFileTypeDescriptor,
  resolveFileMime,
  extensionFromPath,
} from '@/lib/file-display';

interface MessageFileProps {
  src: string;
  mimeType?: string;
  displayName?: string;
  variant?: 'user' | 'assistant';
  className?: string;
}

const getFileSize = async (src: string): Promise<number | null> => {
  try {
    if (src.startsWith('data:')) {
      const base64 = src.split(',')[1];
      if (base64) {
        return Math.floor((base64.length * 3) / 4);
      }
    } else {
      const { stat } = await import('@tauri-apps/plugin-fs');
      const fileInfo = await stat(src);
      return fileInfo.size;
    }
  } catch (e) {
    logger.error('Failed to get file size:', e);
  }
  return null;
};

export const MessageFile = ({
  src,
  mimeType,
  displayName,
  variant = 'assistant',
  className,
}: MessageFileProps) => {
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const resolvedMime = resolveFileMime(src, mimeType);
  const extension = extensionFromPath(displayName ?? src);
  const fileInfo = getFileTypeDescriptor(resolvedMime, extension);
  const fileName = getDisplayFileName(src, displayName, mimeType);
  const isUser = variant === 'user';

  useEffect(() => {
    getFileSize(src).then(setFileSize);
  }, [src]);

  const handleClick = async () => {
    if (isOpening) return;

    setIsOpening(true);
    try {
      if (!src.startsWith('data:') && !src.startsWith('http')) {
        await opener.openPath(src);
      }
    } catch (error) {
      logger.error('Failed to open file:', error);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'group inline-flex max-w-[min(100%,16rem)] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors',
        isUser
          ? 'bg-primary-foreground/12 hover:bg-primary-foreground/18 text-primary-foreground'
          : 'bg-muted/60 hover:bg-muted/80 text-foreground ring-1 ring-border/40',
        isOpening && 'opacity-70',
        className
      )}
      onClick={handleClick}
      disabled={isOpening}
      title={fileName}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          isUser ? 'bg-primary-foreground/15' : fileInfo.iconBgClass
        )}
      >
        <fileInfo.Icon
          className={cn(
            'h-4 w-4',
            isUser ? 'text-primary-foreground/90' : fileInfo.accentClass
          )}
          strokeWidth={2}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'truncate text-[13px] font-medium leading-tight',
            isUser ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {fileName}
        </div>
        <div
          className={cn(
            'mt-0.5 flex items-center gap-1 text-[11px] leading-none',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          <span>{fileInfo.label.toUpperCase()}</span>
          {fileSize !== null && (
            <>
              <span aria-hidden>·</span>
              <span>{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      </div>

      <ExternalLink
        className={cn(
          'h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60',
          isUser ? 'text-primary-foreground' : 'text-muted-foreground'
        )}
      />
    </button>
  );
};
