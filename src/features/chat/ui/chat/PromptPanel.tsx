import { X, FileText } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import { cn } from '@/lib/utils';

interface PromptPanelProps {
  promptName: string;
  promptContent: string;
  onRemove: () => void;
  className?: string;
}

export function PromptPanel({
  promptName,
  promptContent,
  onRemove,
  className,
}: PromptPanelProps) {
  // Truncate content for preview (first 100 chars)
  const previewContent =
    promptContent.length > 100
      ? promptContent.substring(0, 100) + '...'
      : promptContent;

  return (
    <div
      className={cn(
        'mb-2 rounded-lg border border-primary/30 bg-primary/5 p-3',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="size-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {promptName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {previewContent}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Remove prompt"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
