import * as React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  className?: string;
  iconClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Tooltip({
  content,
  children,
  className,
  iconClassName,
  side = 'top',
  maxWidth = 'md',
}: TooltipProps) {
  const maxWidthClass = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth];

  const sideClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-popover',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 -mb-px border-4 border-transparent border-b-popover',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-px border-4 border-transparent border-l-popover',
    right:
      'right-full top-1/2 -translate-y-1/2 -mr-px border-4 border-transparent border-r-popover',
  }[side];

  return (
    <div className={cn('group relative inline-flex', className)}>
      {children || (
        <Info
          className={cn(
            'size-3.5 text-muted-foreground cursor-help hover:text-foreground transition-colors',
            iconClassName
          )}
        />
      )}
      <div
        className={cn(
          'absolute opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50',
          sideClasses
        )}
      >
        <div
          className={cn(
            'bg-popover text-popover-foreground text-xs rounded-md border shadow-lg px-3 py-2 whitespace-normal',
            maxWidthClass
          )}
        >
          {content}
          <div className={cn('absolute', arrowClasses)}></div>
        </div>
      </div>
    </div>
  );
}
