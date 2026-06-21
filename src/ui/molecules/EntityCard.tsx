import React from 'react';
import { cn } from '@/lib/utils';

interface EntityCardProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
}

/**
 * A generalized card component for various entities (LLM, MCP, Prompts, etc.)
 * Follows a consistent layout: Icon -> Info -> Actions
 */
export function EntityCard({
  icon,
  title,
  subtitle,
  description,
  extra,
  actions,
  badge,
  footer,
  onClick,
  className,
  disabled = false,
  active = false,
}: EntityCardProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={cn(
        'group relative rounded-xl border bg-card p-4 transition-all duration-200 overflow-hidden flex flex-col h-full',
        !disabled && onClick && 'hover:shadow-md hover:border-primary/20',
        disabled && 'opacity-60 grayscale-[0.5]',
        active && 'border-primary/40 bg-primary/5',
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      {!disabled && (
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      )}

      <div className="relative flex-1 flex flex-col space-y-3">
        {/* Header with icon, name, and actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
              <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors shrink-0">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate text-foreground">
                  {title}
                </span>
                {badge && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-widest leading-none">
                    {badge}
                  </span>
                )}
                {active && !badge && (
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase">
                    Active
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-[11px] text-muted-foreground truncate font-mono mt-0.5 opacity-80">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div
              className="shrink-0 flex items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>

        {/* Content/Description */}
        {description && (
          <div className="text-sm text-muted-foreground line-clamp-2 leading-relaxed opacity-90">
            {description}
          </div>
        )}

        {/* Extra info (like models list, tags, etc.) */}
        {extra && <div className="pt-1 flex-1">{extra}</div>}

        {/* Footer actions (usually for large buttons) */}
        {footer && (
          <div className="pt-2 mt-auto" onClick={(e) => e.stopPropagation()}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
