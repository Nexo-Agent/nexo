import { useState, useEffect } from 'react';
import { readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { downloadDir, join } from '@tauri-apps/api/path';
import { Download } from 'lucide-react';
import { ContextMenu } from '@/ui/atoms/context-menu';
import { useAppDispatch } from '@/app/hooks';
import {
  showSuccess,
  showError,
} from '@/features/notifications/state/notificationSlice';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

interface MessageImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: (url: string) => void;
}

export const MessageImage = ({
  src,
  alt,
  className,
  onClick,
}: MessageImageProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('common');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    const loadLocalImage = async () => {
      // Handle data URLs and http/s URLs directly
      if (src.startsWith('data:') || src.startsWith('http')) {
        return;
      }

      try {
        // For local file paths, read and create blob URL
        const contents = await readFile(src);

        // Determine mime type from file extension
        const ext = src.split('.').pop()?.toLowerCase() || '';
        const mimeType = (() => {
          switch (ext) {
            case 'jpg':
            case 'jpeg':
              return 'image/jpeg';
            case 'png':
              return 'image/png';
            case 'gif':
              return 'image/gif';
            case 'webp':
              return 'image/webp';
            case 'svg':
              return 'image/svg+xml';
            default:
              return 'image/png';
          }
        })();

        const blob = new Blob([contents], { type: mimeType });
        url = URL.createObjectURL(blob);

        if (active) {
          setObjectUrl(url);
          setError(null);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        logger.error('Failed to load local image:', { src, error: err });
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
        }
      }
    };

    loadLocalImage();

    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [src]);

  // Determine the display source
  const displaySrc = (() => {
    // Direct URLs (data: or http/s:)
    if (src.startsWith('data:') || src.startsWith('http')) {
      return src;
    }

    // Successfully loaded blob URL
    if (objectUrl) {
      return objectUrl;
    }

    // Still loading or error - use a placeholder or the original src
    // Don't use convertFileSrc as it causes encoding issues with spaces
    return '';
  })();

  // Show loading state or error
  if (!displaySrc && !error) {
    return (
      <div
        className={className}
        style={{ minHeight: '100px', background: '#f0f0f0' }}
      >
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={className}
        style={{ minHeight: '100px', background: '#fee', padding: '10px' }}
      >
        Failed to load image: {error}
      </div>
    );
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const downloadsPath = await downloadDir();

      // Ensure the downloads directory exists (it should, but just in case)
      await mkdir(downloadsPath, { recursive: true }).catch(() => {});

      let fileName = `cogito_studio_image_${Date.now()}.png`;
      if (src.startsWith('http') || !src.startsWith('data:')) {
        const parts = src.split('/');
        const lastPart = parts[parts.length - 1]?.split('?')[0];
        if (lastPart && lastPart.includes('.')) {
          fileName = lastPart;
        }
      }

      const filePath = await join(downloadsPath, fileName);

      let data: Uint8Array;
      if (src.startsWith('data:')) {
        const base64Data = src.split(',')[1];
        const binaryString = atob(base64Data);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
      } else if (src.startsWith('http')) {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
      } else {
        // Local file path
        data = await readFile(src);
      }

      await writeFile(filePath, data);
      dispatch(
        showSuccess(t('downloadComplete') || 'Download complete', fileName)
      );
    } catch (err) {
      logger.error('Failed to download image:', { src, error: err });
      dispatch(
        showError(
          t('downloadFailed') || 'Download failed',
          err instanceof Error ? err.message : 'Unknown error'
        )
      );
    } finally {
      setIsDownloading(false);
      setContextMenu(null);
    }
  };

  return (
    <div className="relative group">
      <img
        src={displaySrc}
        alt={alt}
        className={className}
        loading="lazy"
        onClick={() => onClick?.(displaySrc)}
        onContextMenu={handleContextMenu}
        onError={(e) => {
          logger.error('Image load error for src:', {
            src: displaySrc,
            error: e,
          });
          setError('Image failed to render');
        }}
      />
      <ContextMenu
        open={contextMenu !== null}
        position={contextMenu || { x: 0, y: 0 }}
        items={[
          {
            label: t('saveImage') || 'Lưu hình ảnh',
            icon: <Download className="size-4" />,
            onClick: handleDownload,
            disabled: isDownloading,
          },
        ]}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
};
