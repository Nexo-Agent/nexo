import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { parsePromptVariables } from '@/lib/prompt-utils';
import type { Prompt } from '@/store/types';

interface SlashCommandDropdownProps {
  prompts: Prompt[];
  selectedIndex: number;
  onSelect: (prompt: Prompt) => void;
  position?: { top: number; left: number };
  direction?: 'up' | 'down';
}

export function SlashCommandDropdown({
  prompts,
  selectedIndex,
  onSelect,
  position,
  direction = 'down',
}: SlashCommandDropdownProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll selected item into view
  useEffect(() => {
    if (scrollAreaRef.current && prompts.length > 0 && selectedIndex >= 0) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, prompts.length]);

  if (prompts.length === 0) {
    return null;
  }

  const handleClick = (prompt: Prompt) => {
    onSelect(prompt);
  };

  const isUpward = direction === 'up';

  return (
    <div
      className={cn(
        'absolute z-50 w-full max-w-md rounded-lg border bg-popover shadow-lg',
        isUpward ? 'bottom-full mb-2' : 'top-full mt-2'
      )}
      style={{
        left: position?.left ? `${position.left}px` : '0',
      }}
    >
      <ScrollArea className="max-h-[200px]">
        <div className="p-1" ref={scrollAreaRef}>
          {prompts.map((prompt, index) => {
            const hasVariables =
              parsePromptVariables(prompt.content).length > 0;
            const isSelected = index === selectedIndex;

            return (
              <div
                key={prompt.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => handleClick(prompt)}
                className={cn(
                  'flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer transition-colors',
                  'hover:bg-accent',
                  isSelected && 'bg-accent'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {prompt.name}
                    </span>
                    {hasVariables && (
                      <Sparkles className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  {prompt.content && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {prompt.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
