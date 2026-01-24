import { memo, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExpandableMessageItemProps {
  isExpanded: boolean;
  onToggle: () => void;
  header: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  actionsClassName?: string;
}

export const ExpandableMessageItem = memo(function ExpandableMessageItem({
  isExpanded,
  onToggle,
  header,
  actions,
  children,
  className,
  headerClassName,
  contentClassName,
  actionsClassName,
}: ExpandableMessageItemProps) {
  return (
    <div className={cn('last:mb-0', className)}>
      <div className="flex items-center justify-between group/expandable">
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors text-xs font-medium py-1 outline-none cursor-pointer',
            headerClassName
          )}
          onClick={onToggle}
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              !isExpanded && '-rotate-90'
            )}
          />
          <div className="flex items-center gap-1.5">{header}</div>
        </button>

        {actions && (
          <div
            className={cn(
              'flex items-center gap-1 opacity-0 group-hover/expandable:opacity-100 transition-opacity',
              actionsClassName
            )}
          >
            {actions}
          </div>
        )}
      </div>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              'mt-1 ml-1.5 pl-4 border-l-2 border-muted/30 transition-[opacity,padding] duration-300 select-text',
              isExpanded ? 'opacity-100 py-2' : 'opacity-0',
              contentClassName
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
