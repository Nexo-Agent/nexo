import { useState, memo } from 'react';
import { ChevronDown, ChevronUp, Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ThinkingItemProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingItem = memo(function ThinkingItem({
  content,
  isStreaming = false,
}: ThinkingItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!content) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-sm select-text">
      <button
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isStreaming ? (
            <Loader2 className="h-4 w-4 shrink-0 text-muted-foreground animate-spin" />
          ) : (
            <Brain className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium truncate text-muted-foreground">
            Thinking Process
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'pt-2 transition-opacity duration-300 whitespace-pre-wrap text-muted-foreground',
              isExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
});
