import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from '@/ui/atoms/dialog/component';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/atoms/scroll-area';

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?:
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | 'max-w-[420px]';
  className?: string;
  scrollable?: boolean;
  scrollableHeightClass?: string;
}

/**
 * A standardized Dialog wrapper for forms with consistent header, body (scrollable), and footer layout.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  maxWidth = '2xl',
  className,
  scrollable = true,
  scrollableHeightClass = '',
}: FormDialogProps) {
  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    'max-w-[420px]': 'sm:max-w-[420px]',
  }[maxWidth];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 overflow-hidden flex flex-col max-h-[90vh] border-border/40 bg-background/95 backdrop-blur-lg shadow-xl',
          maxWidthClass,
          className
        )}
      >
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="p-0 m-0">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <DialogBody className="flex-1 overflow-hidden p-0">
          {scrollable ? (
            <ScrollArea className={scrollableHeightClass}>
              <div className="space-y-6 pb-4">{children}</div>
            </ScrollArea>
          ) : (
            <div className="h-full px-2 py-4 space-y-6">{children}</div>
          )}
        </DialogBody>

        {footer && (
          <DialogFooter className="px-6 py-4 bg-muted/30 border-t flex flex-row gap-3">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
