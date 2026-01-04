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
    <div className="w-full">
      <button
        className="flex items-center gap-2 text-left group select-none py-1"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-muted/50 group-hover:text-foreground">
          {isStreaming ? (
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
          ) : (
            <Brain className="h-3 w-3 shrink-0" />
          )}
          <span>Thinking Process</span>
          {isExpanded ? (
            <ChevronUp className="h-3 w-3 shrink-0 opacity-50" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </div>
      </button>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'ml-3 mt-2 border-l-2 border-muted pl-4 text-sm text-muted-foreground transition-all duration-300',
              isExpanded
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 -translate-y-2'
            )}
          >
            {content}
          </div>
        </div>
      </div>
    </div>
  );
});
