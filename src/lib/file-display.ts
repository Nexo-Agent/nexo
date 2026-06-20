import type { LucideIcon } from 'lucide-react';
import {
  Braces,
  Code2,
  File as FileIcon,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from 'lucide-react';
import { getEffectiveFileMime, mimeFromFileName } from '@/lib/text-file';

export interface FileTypeDescriptor {
  Icon: LucideIcon;
  label: string;
  extension: string;
  accentClass: string;
  iconBgClass: string;
}

const UUID_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i;

export function isStorageFileName(name: string): boolean {
  return UUID_FILE_NAME.test(name);
}

export function extensionFromPath(path: string): string {
  const base = path.split(/[/?#]/)[0] ?? path;
  const dot = base.lastIndexOf('.');
  if (dot === -1) return '';
  return base.slice(dot + 1).toLowerCase();
}

export function resolveFileMime(path: string, mimeType?: string): string {
  if (mimeType && mimeType !== 'application/octet-stream') {
    return mimeType;
  }
  if (path.startsWith('data:')) {
    const match = path.match(/data:(.*?);/);
    if (match?.[1]) return match[1];
  }
  return (
    mimeFromFileName(path.split('/').pop() ?? path) ??
    'application/octet-stream'
  );
}

export function getFileTypeDescriptor(
  mimeType?: string,
  extension?: string
): FileTypeDescriptor {
  const mime = (mimeType ?? '').toLowerCase();
  const ext = (extension ?? '').toLowerCase();

  if (
    mime.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
  ) {
    return {
      Icon: FileImage,
      label: 'Image',
      extension: ext || 'img',
      accentClass: 'text-sky-500',
      iconBgClass: 'bg-sky-500/15',
    };
  }

  if (
    mime.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'avi', 'mpeg'].includes(ext)
  ) {
    return {
      Icon: FileVideo,
      label: 'Video',
      extension: ext || 'mp4',
      accentClass: 'text-violet-500',
      iconBgClass: 'bg-violet-500/15',
    };
  }

  if (
    mime.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'weba'].includes(ext)
  ) {
    return {
      Icon: FileAudio,
      label: 'Audio',
      extension: ext || 'mp3',
      accentClass: 'text-emerald-500',
      iconBgClass: 'bg-emerald-500/15',
    };
  }

  if (mime === 'application/pdf' || ext === 'pdf') {
    return {
      Icon: FileText,
      label: 'PDF',
      extension: 'pdf',
      accentClass: 'text-rose-500',
      iconBgClass: 'bg-rose-500/15',
    };
  }

  if (
    mime === 'application/json' ||
    ['json', 'jsonl', 'ndjson'].includes(ext)
  ) {
    return {
      Icon: Braces,
      label: 'JSON',
      extension: ext || 'json',
      accentClass: 'text-amber-500',
      iconBgClass: 'bg-amber-500/15',
    };
  }

  if (ext === 'csv' || mime === 'text/csv') {
    return {
      Icon: FileSpreadsheet,
      label: 'CSV',
      extension: 'csv',
      accentClass: 'text-lime-600',
      iconBgClass: 'bg-lime-500/15',
    };
  }

  if (
    mime.startsWith('text/') ||
    ['txt', 'md', 'markdown', 'yaml', 'yml', 'xml', 'html', 'htm'].includes(ext)
  ) {
    return {
      Icon: FileText,
      label: ext === 'md' || ext === 'markdown' ? 'Markdown' : 'Text',
      extension: ext || 'txt',
      accentClass: 'text-slate-500',
      iconBgClass: 'bg-slate-500/15',
    };
  }

  if (
    [
      'js',
      'jsx',
      'ts',
      'tsx',
      'py',
      'rs',
      'go',
      'java',
      'kt',
      'sql',
      'sh',
      'toml',
    ].includes(ext)
  ) {
    return {
      Icon: Code2,
      label: 'Code',
      extension: ext,
      accentClass: 'text-indigo-500',
      iconBgClass: 'bg-indigo-500/15',
    };
  }

  return {
    Icon: FileIcon,
    label: 'File',
    extension: ext || 'file',
    accentClass: 'text-muted-foreground',
    iconBgClass: 'bg-muted',
  };
}

export function getDisplayFileName(
  path: string,
  displayName?: string,
  mimeType?: string
): string {
  const ext = extensionFromPath(path);
  const mime = resolveFileMime(path, mimeType);
  const descriptor = getFileTypeDescriptor(mime, ext);

  if (displayName && !isStorageFileName(displayName)) {
    return displayName;
  }

  if (ext && !isStorageFileName(path.split('/').pop() ?? '')) {
    const base = path.split('/').pop() ?? path;
    if (!isStorageFileName(base)) return base;
  }

  if (ext) {
    return `${descriptor.label}.${ext}`;
  }

  return descriptor.label;
}

export interface MessageFileEntry {
  path: string;
  name?: string;
  mimeType?: string;
}

export function parseMessageFileEntries(metadata: {
  files?: unknown;
  images?: unknown;
  fileEntries?: unknown;
}): MessageFileEntry[] {
  if (Array.isArray(metadata.fileEntries)) {
    return metadata.fileEntries
      .map((entry) => {
        if (typeof entry === 'string') {
          return { path: entry };
        }
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          const path =
            (typeof record.path === 'string' && record.path) ||
            (typeof record.src === 'string' && record.src) ||
            '';
          if (!path) return null;
          return {
            path,
            name: typeof record.name === 'string' ? record.name : undefined,
            mimeType:
              typeof record.mimeType === 'string' ? record.mimeType : undefined,
          };
        }
        return null;
      })
      .filter((entry): entry is MessageFileEntry => entry !== null);
  }

  const legacySource =
    Array.isArray(metadata.files) && metadata.files.length > 0
      ? metadata.files
      : metadata.images;

  if (!Array.isArray(legacySource)) {
    return [];
  }

  return legacySource
    .map((item: unknown) => {
      if (typeof item === 'string') return { path: item };
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const path = typeof record.path === 'string' ? record.path : '';
        if (!path) return null;
        return {
          path,
          mimeType:
            typeof record.mimeType === 'string' ? record.mimeType : undefined,
        };
      }
      return null;
    })
    .filter((entry): entry is MessageFileEntry => entry !== null);
}

export function buildFileDetailsMetadata(
  files: File[],
  existingMetadata?: string
): string | undefined {
  if (files.length === 0) {
    return existingMetadata;
  }

  let base: Record<string, unknown> = {};
  if (existingMetadata) {
    try {
      base = JSON.parse(existingMetadata) as Record<string, unknown>;
    } catch {
      base = {};
    }
  }

  base.fileDetails = files.map((file) => ({
    name: file.name,
    mimeType: getEffectiveFileMime(file),
  }));

  return JSON.stringify(base);
}
