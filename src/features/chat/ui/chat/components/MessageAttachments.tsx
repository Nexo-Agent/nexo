import { memo } from 'react';
import { MessageImage } from '../MessageImage';
import { MessageFile } from '../MessageFile';
import { useAppDispatch } from '@/app/hooks';
import { setImagePreviewOpen } from '@/features/ui/state/uiSlice';
import {
  type MessageFileEntry,
  parseMessageFileEntries,
  resolveFileMime,
} from '@/lib/file-display';

interface MessageAttachmentsProps {
  files?: Array<string | { path: string; mimeType: string }>;
  images?: Array<string | { path: string; mimeType: string }>;
  fileEntries?: MessageFileEntry[];
  role?: 'user' | 'assistant';
}

export const MessageAttachments = memo(function MessageAttachments({
  files,
  images,
  fileEntries,
  role = 'assistant',
}: MessageAttachmentsProps) {
  const dispatch = useAppDispatch();
  const isUser = role === 'user';

  const entries =
    fileEntries ??
    parseMessageFileEntries({
      files,
      images,
      fileEntries,
    });

  if (entries.length === 0) {
    return null;
  }

  const imageEntries: MessageFileEntry[] = [];
  const fileOnlyEntries: MessageFileEntry[] = [];

  for (const entry of entries) {
    const mime = resolveFileMime(entry.path, entry.mimeType);
    const isImage =
      mime.startsWith('image/') ||
      (!entry.mimeType &&
        (entry.path.match(/\.(jpg|jpeg|png|gif|webp)$/i) ||
          (entry.path.startsWith('data:') && entry.path.includes('image/'))));

    if (isImage) {
      imageEntries.push(entry);
    } else {
      fileOnlyEntries.push(entry);
    }
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      {imageEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageEntries.map((entry, index) => (
            <div
              key={`${entry.path}-${index}`}
              className={cnImageThumb(isUser)}
            >
              <MessageImage
                src={entry.path}
                alt={entry.name ?? `Attached image ${index + 1}`}
                className="max-h-28 w-auto max-w-[220px] cursor-pointer object-contain"
                onClick={(url) =>
                  dispatch(
                    setImagePreviewOpen({
                      open: true,
                      url,
                    })
                  )
                }
              />
            </div>
          ))}
        </div>
      )}

      {fileOnlyEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fileOnlyEntries.map((entry, index) => (
            <MessageFile
              key={`${entry.path}-${index}`}
              src={entry.path}
              mimeType={entry.mimeType}
              displayName={entry.name}
              variant={role}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function cnImageThumb(isUser: boolean): string {
  return [
    'overflow-hidden rounded-lg transition-opacity hover:opacity-90',
    isUser
      ? 'ring-1 ring-primary-foreground/20 bg-primary-foreground/10'
      : 'ring-1 ring-border/50 bg-background/50',
  ].join(' ');
}
