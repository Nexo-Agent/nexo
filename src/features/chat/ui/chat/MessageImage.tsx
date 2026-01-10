import { useState, useEffect } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';

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
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Failed to load local image:', src, err);
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

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      loading="lazy"
      onClick={() => onClick?.(displaySrc)}
      onError={(e) => {
        console.error('Image load error for src:', displaySrc, e);
        setError('Image failed to render');
      }}
    />
  );
};
