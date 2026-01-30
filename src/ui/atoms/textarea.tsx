import * as React from 'react';

import { cn } from '@/lib/utils';
import { ScrollArea } from './scroll-area';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <ScrollArea className={cn('border rounded h-[200px]', className)}>
      <textarea
        data-slot="textarea"
        rows={props.value?.toString().split('\n').length || 1}
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content w-full bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'overflow-y-hidden',
          'border-none',
          'resize-none'
        )}
        {...props}
      />
    </ScrollArea>
  );
}

export { Textarea };
