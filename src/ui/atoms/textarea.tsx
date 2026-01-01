import * as React from 'react';

import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, onKeyDown, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const internalRef = ref || textareaRef;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd+A / Ctrl+A for select all - manually trigger selectAll
    if ((e.metaKey || e.ctrlKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const textarea =
        (typeof internalRef === 'object' && internalRef?.current) ||
        e.currentTarget;
      textarea.select();
      return;
    }

    // Call custom onKeyDown handler for other keys
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <textarea
      ref={internalRef}
      data-slot="textarea"
      className={cn(
        'border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };
