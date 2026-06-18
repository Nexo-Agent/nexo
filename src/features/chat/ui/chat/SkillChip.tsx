import { Wand2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillChipProps {
  name: string;
  description?: string;
  onRemove?: () => void;
  mode?: 'input' | 'message';
  disabled?: boolean;
  className?: string;
}

export function SkillChip({
  name,
  description,
  onRemove,
  mode = 'input',
  disabled = false,
  className,
}: SkillChipProps) {
  const isMessage = mode === 'message';

  return (
    <div
      className={cn(
        'relative group inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs max-w-[280px]',
        isMessage
          ? 'border-primary-foreground/25 bg-primary-foreground/10'
          : 'border-primary/25 bg-primary/5',
        className
      )}
    >
      <Wand2
        className={cn(
          'size-4 shrink-0',
          isMessage ? 'text-primary-foreground/90' : 'text-primary'
        )}
      />
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span
          className={cn(
            'truncate font-medium',
            isMessage ? 'text-primary-foreground' : 'text-foreground'
          )}
        >
          {name}
        </span>
        {description && (
          <span
            className={cn(
              'truncate text-[10px] leading-tight',
              isMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {description}
          </span>
        )}
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className={cn(
            'absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm transition-opacity',
            isMessage
              ? 'bg-primary-foreground text-primary opacity-0 group-hover:opacity-100'
              : 'bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Remove skill"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
