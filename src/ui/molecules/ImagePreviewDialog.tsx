import { useState } from 'react';
import { Dialog, DialogContent } from '@/ui/atoms/dialog/component';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setImagePreviewOpen } from '@/features/ui/state/uiSlice';
import { X, Download } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import { readFile, writeFile, mkdir } from '@tauri-apps/plugin-fs';
import { downloadDir, join } from '@tauri-apps/api/path';
import { ContextMenu } from '@/ui/atoms/context-menu';
import {
  showSuccess,
  showError,
} from '@/features/notifications/state/notificationSlice';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

export function ImagePreviewDialog() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation('common');
  const open = useAppSelector((state) => state.ui.imagePreviewOpen);
  const imageUrl = useAppSelector((state) => state.ui.imagePreviewUrl);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleClose = () => {
    dispatch(setImagePreviewOpen({ open: false }));
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      setIsDownloading(true);
      const downloadsPath = await downloadDir();

      // Ensure the downloads directory exists
      await mkdir(downloadsPath, { recursive: true }).catch(() => {});

      let fileName = `nexo_image_${Date.now()}.png`;
      if (
        imageUrl.startsWith('http') ||
        (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:'))
      ) {
        const parts = imageUrl.split('/');
        const lastPart = parts[parts.length - 1]?.split('?')[0];
        if (lastPart && lastPart.includes('.')) {
          fileName = lastPart;
        }
      }

      const filePath = await join(downloadsPath, fileName);

      let data: Uint8Array;
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        const binaryString = atob(base64Data);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
      } else if (imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
      } else if (imageUrl.startsWith('http')) {
        const response = await fetch(imageUrl);
        const arrayBuffer = await response.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
      } else {
        // Local file path
        data = await readFile(imageUrl);
      }

      await writeFile(filePath, data);
      dispatch(
        showSuccess(t('downloadComplete') || 'Download complete', fileName)
      );
    } catch (err) {
      logger.error('Failed to download image from preview:', {
        url: imageUrl,
        error: err,
      });
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

  if (!imageUrl) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="p-0 border-none bg-transparent shadow-none overflow-hidden flex items-center justify-center sm:max-w-none max-w-[95vw] max-h-[95vh]"
        onClick={handleClose}
        showCloseButton={false}
      >
        <div
          className="relative flex items-center justify-center w-full h-full cursor-zoom-out"
          onClick={handleClose}
        >
          <div
            className="relative group w-fit h-fit cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 z-50 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                disabled={isDownloading}
                className="rounded-full bg-background/50 hover:bg-background/80 text-foreground backdrop-blur-sm shadow-sm"
                title={t('saveImage') || 'Lưu hình ảnh'}
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-full bg-background/50 hover:bg-background/80 text-foreground backdrop-blur-sm shadow-sm"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <img
              src={imageUrl}
              alt="Preview"
              className="rounded-lg shadow-2xl max-w-full max-h-full object-contain"
              onContextMenu={handleContextMenu}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
