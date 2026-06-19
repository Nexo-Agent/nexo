// @ts-nocheck
import { Loader2Icon } from 'lucide-react';

export const CodeBlockSkeleton = () => (
  <div
    className="my-2 w-full overflow-hidden rounded-lg border border-border/60 bg-card/70 shadow-xs ring-1 ring-black/3 dark:ring-white/5"
    data-streamdown="code-block-skeleton"
  >
    <div className="flex h-7 items-center justify-between border-b border-border/35 px-2">
      <div className="h-3 w-10 animate-pulse rounded bg-muted/60" />
      <div className="h-5 w-12 animate-pulse rounded bg-muted/60" />
    </div>
    <div className="flex h-24 items-center justify-center bg-[#f6f8fa] dark:bg-[#0d1117]">
      <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
    </div>
  </div>
);
