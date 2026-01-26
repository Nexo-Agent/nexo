import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode; // For action buttons
  className?: string;
}

/**
 * A standardized header for sections within settings or pages.
 */
export function SectionHeader({
  title,
  description,
  children,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between gap-4 mb-4', className)}
    >
      <div className="space-y-0.5">
        {title && (
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        )}
        {description && (
          <p className="text-xs text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
