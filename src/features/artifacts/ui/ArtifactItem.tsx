import { formatDistanceToNow } from 'date-fns';
import {
  FileText,
  FileCode,
  FileImage,
  FileJson,
  Trash2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Artifact } from '../types';

interface ArtifactItemProps {
  artifact: Artifact;
  onOpen: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ArtifactFileIcon({ filename }: { filename: string }) {
  const iconClass =
    'size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200';
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  if (['html', 'htm', 'svg'].includes(ext)) {
    return <FileImage className={iconClass} />;
  }
  if (['json', 'csv', 'yaml', 'yml', 'toml', 'xml'].includes(ext)) {
    return <FileJson className={iconClass} />;
  }
  if (
    ['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'css', 'sql', 'sh'].includes(ext)
  ) {
    return <FileCode className={iconClass} />;
  }
  return <FileText className={iconClass} />;
}

export function ArtifactItem({
  artifact,
  onOpen,
  onDelete,
}: ArtifactItemProps) {
  return (
    <div
      onClick={onOpen}
      className={cn(
        'group flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-[background-color,border-color,box-shadow] duration-200',
        'border-border/40 bg-secondary/15 shadow-none hover:border-border/80 hover:bg-secondary/30 hover:shadow-xs'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <ArtifactFileIcon filename={artifact.filename} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h4 className="truncate text-[13px] font-medium leading-tight text-foreground/85">
              {artifact.title}
            </h4>
            <span className="shrink-0 text-[10px] font-normal text-muted-foreground/40">
              {formatDistanceToNow(artifact.created_at, { addSuffix: false })}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted-foreground/60">
            {artifact.filename}
          </p>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="invisible flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:visible"
      >
        <Trash2 className="size-3.5 shrink-0" />
      </button>
    </div>
  );
}

export function ArtifactsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
      <Package className="mb-2 size-8 text-muted-foreground" />
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-1 max-w-[200px] text-[11px] text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
