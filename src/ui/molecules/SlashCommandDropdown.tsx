import { useEffect, useRef } from 'react';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import type { SkillRecord } from '@/features/skill/types';
import { useTranslation } from 'react-i18next';

interface SlashCommandDropdownProps {
  skills: SkillRecord[];
  selectedIndex: number;
  onSelect: (skill: SkillRecord) => void;
  position?: { top: number; left: number };
  direction?: 'up' | 'down';
  isEmptyWorkspace?: boolean;
  onOpenWorkspaceSettings?: () => void;
}

export function SlashCommandDropdown({
  skills,
  selectedIndex,
  onSelect,
  position,
  direction = 'down',
  isEmptyWorkspace = false,
  onOpenWorkspaceSettings,
}: SlashCommandDropdownProps) {
  const { t } = useTranslation('chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (scrollAreaRef.current && skills.length > 0 && selectedIndex >= 0) {
      const selectedElement = itemRefs.current[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex, skills.length]);

  const isUpward = direction === 'up';

  if (isEmptyWorkspace) {
    return (
      <div
        className={cn(
          'absolute z-50 w-full max-w-md rounded-lg border bg-popover shadow-lg p-3 text-sm text-muted-foreground',
          isUpward ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
      >
        {t('slashNoSkillsHint')}{' '}
        {onOpenWorkspaceSettings && (
          <button
            type="button"
            className="text-primary underline underline-offset-2"
            onClick={onOpenWorkspaceSettings}
          >
            {t('slashOpenWorkspaceSettings')}
          </button>
        )}
      </div>
    );
  }

  if (skills.length === 0) {
    return null;
  }

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
          {skills.map((skill, index) => {
            const isSelected = index === selectedIndex;

            return (
              <div
                key={skill.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                onClick={() => onSelect(skill)}
                className={cn(
                  'flex items-start gap-2 rounded-md px-3 py-2 transition-colors',
                  'hover:bg-accent',
                  isSelected && 'bg-accent'
                )}
              >
                <Wand2 className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {skill.name}
                  </div>
                  {skill.description && (
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {skill.description}
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
