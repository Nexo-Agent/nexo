import { useState, useEffect, useMemo, memo } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { setImagePreviewOpen } from '@/features/ui/state/uiSlice';
import { FileImage } from 'lucide-react';
import { formatFileSize, cn } from '@/lib/utils';
import { getEffectiveFileMime } from '@/lib/text-file';
import {
  getDisplayFileName,
  getFileTypeDescriptor,
  extensionFromPath,
} from '@/lib/file-display';

interface AttachedFileItemProps {
  file: File;
  onRemove: (index: number) => void;
  index: number;
  disabled: boolean;
}

export const AttachedFileItem = memo(
  ({ file, onRemove, index, disabled }: AttachedFileItemProps) => {
    const dispatch = useAppDispatch();

    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const isImage = file.type.startsWith('image/');

    useEffect(() => {
      let url: string | null = null;
      if (isImage) {
        url = URL.createObjectURL(file);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setObjectUrl(url);
      }

      return () => {
        if (url) {
          URL.revokeObjectURL(url);
        }
      };
    }, [file, isImage]);

    const fileInfo = useMemo(() => {
      const mimeType = getEffectiveFileMime(file);
      const ext = extensionFromPath(file.name);
      return getFileTypeDescriptor(mimeType, ext);
    }, [file]);

    const displayName = getDisplayFileName(file.name, file.name, file.type);

    return (
      <div className="relative group">
        {isImage ? (
          <div
            className="relative h-16 w-16 overflow-hidden rounded-md border border-border cursor-pointer hover:opacity-80 transition-opacity bg-black/5 dark:bg-white/5 flex items-center justify-center"
            onClick={(e) => {
              if (objectUrl) {
                e.stopPropagation();
                dispatch(setImagePreviewOpen({ open: true, url: objectUrl }));
              }
            }}
          >
            {objectUrl ? (
              <img
                src={objectUrl}
                alt={file.name}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <FileImage className="h-6 w-6 text-muted-foreground opacity-50" />
            )}
          </div>
        ) : (
          <div className="inline-flex max-w-[14rem] items-center gap-2 rounded-lg bg-muted/70 px-2.5 py-2 ring-1 ring-border/50">
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                fileInfo.iconBgClass
              )}
            >
              <fileInfo.Icon
                className={cn('h-3.5 w-3.5', fileInfo.accentClass)}
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium">{displayName}</div>
              <div className="text-[10px] text-muted-foreground">
                {fileInfo.label.toUpperCase()} · {formatFileSize(file.size)}
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground shadow-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          disabled={disabled}
        >
          ×
        </button>
      </div>
    );
  }
);

AttachedFileItem.displayName = 'AttachedFileItem';
