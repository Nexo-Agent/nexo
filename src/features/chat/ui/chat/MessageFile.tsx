import { useState, useEffect } from 'react';
import * as opener from '@tauri-apps/plugin-opener';
import {
  FileText,
  FileVideo,
  FileAudio,
  FileImage,
  File as FileIcon,
  Download,
} from 'lucide-react';
import { cn, formatFileSize } from '@/lib/utils';

interface MessageFileProps {
  src: string;
  mimeType?: string;
  className?: string;
}

const getFileInfo = (src: string, mimeType?: string) => {
  // Try to get mime type from src if not provided
  let mime = mimeType;
  if (!mime && src.startsWith('data:')) {
    const match = src.match(/data:(.*?);/);
    mime = match ? match[1] : 'application/octet-stream';
  }

  // Get extension from path
  const ext = src.split('.').pop()?.toLowerCase() || '';

  // Determine icon, label, and styling
  if (
    mime?.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
  ) {
    return {
      Icon: FileImage,
      label: 'Image',
      iconColor: 'text-info',
      bgColor: 'bg-info/5',
      borderColor: 'border-info/10',
    };
  }
  if (
    mime?.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'avi'].includes(ext)
  ) {
    return {
      Icon: FileVideo,
      label: 'Video',
      iconColor: 'text-info',
      bgColor: 'bg-info/5',
      borderColor: 'border-info/10',
    };
  }
  if (mime?.startsWith('audio/') || ['mp3', 'wav', 'ogg'].includes(ext)) {
    return {
      Icon: FileAudio,
      label: 'Audio',
      iconColor: 'text-success',
      bgColor: 'bg-success/5',
      borderColor: 'border-success/10',
    };
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      Icon: FileText,
      label: 'PDF',
      iconColor: 'text-error',
      bgColor: 'bg-error/5',
      borderColor: 'border-error/10',
    };
  }
  if (mime?.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext)) {
    return {
      Icon: FileText,
      label: 'Text',
      iconColor: 'text-muted-foreground',
      bgColor: 'bg-muted/30',
      borderColor: 'border-border',
    };
  }

  return {
    Icon: FileIcon,
    label: 'File',
    iconColor: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
    borderColor: 'border-border',
  };
};

const getFileName = (src: string): string => {
  // If it's a data URL, return a generic name
  if (src.startsWith('data:')) {
    return 'attachment';
  }

  // Extract filename from path
  const parts = src.split('/');
  return parts[parts.length - 1] || 'file';
};

const getFileSize = async (src: string): Promise<number | null> => {
  try {
    if (src.startsWith('data:')) {
      // Estimate size from base64
      const base64 = src.split(',')[1];
      if (base64) {
        return Math.floor((base64.length * 3) / 4);
      }
    } else {
      // For file paths, try to get actual file size
      const { stat } = await import('@tauri-apps/plugin-fs');
      const fileInfo = await stat(src);
      return fileInfo.size;
    }
  } catch (e) {
    console.error('Failed to get file size:', e);
  }
  return null;
};

export const MessageFile = ({ src, mimeType, className }: MessageFileProps) => {
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  const fileInfo = getFileInfo(src, mimeType);
  const fileName = getFileName(src);

  useEffect(() => {
    getFileSize(src).then(setFileSize);
  }, [src]);

  const handleClick = async () => {
    if (isOpening) return;

    setIsOpening(true);
    try {
      // For local file paths, open with default OS application
      if (!src.startsWith('data:') && !src.startsWith('http')) {
        await opener.openPath(src);
      }
      // Note: Data URLs and remote files cannot be opened directly
    } catch (error) {
      console.error('Failed to open file:', error);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'group relative flex items-center gap-3 w-full rounded-xl border transition-all duration-200',
        'hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]',
        fileInfo.bgColor,
        fileInfo.borderColor,
        isOpening && 'opacity-50 cursor-wait scale-95',
        !isOpening && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
      disabled={isOpening}
    >
      {/* Icon container with subtle background */}
      <div
        className={cn(
          'flex items-center justify-center w-12 h-12 rounded-lg shrink-0 transition-transform group-hover:scale-110',
          fileInfo.iconColor
        )}
      >
        <fileInfo.Icon className="h-6 w-6" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1 py-2 pr-3 text-left">
        <div
          className="font-medium text-sm truncate text-foreground"
          title={fileName}
        >
          {fileName}
        </div>
        <div className="text-xs text-muted-foreground/80 flex items-center gap-1.5 font-normal">
          <span className="font-medium">{fileInfo.label}</span>
          {fileSize !== null && (
            <>
              <span className="text-[10px]">•</span>
              <span>{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      </div>

      {/* Hover indicator */}
      <div className="shrink-0 pr-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background/50">
          <Download className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </div>
    </button>
  );
};
