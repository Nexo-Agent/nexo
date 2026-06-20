import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/ui/atoms/dialog';
import { Button } from '@/ui/atoms/button/button';
import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  icon?: React.ReactNode;
  /** Compact layout matching add/rename workspace dialogs */
  compact?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  isLoading = false,
  icon,
  compact = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation(['common']);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (_error) {
      // Errors should be handled by the parent
    }
  };

  const resolvedConfirmLabel =
    confirmLabel ||
    (variant === 'destructive' ? t('common:delete') : t('common:confirm'));

  if (compact) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="items-stretch gap-0 p-4 sm:max-w-xs">
          <div className="flex flex-col gap-3">
            <DialogTitle className="m-0 text-sm font-medium leading-none">
              {title}
            </DialogTitle>
            <DialogDescription className="m-0 text-xs text-muted-foreground leading-relaxed">
              {description}
            </DialogDescription>
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {cancelLabel || t('common:cancel')}
              </Button>
              <Button
                type="button"
                variant={variant}
                size="sm"
                className="h-7 px-3"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                ) : null}
                {resolvedConfirmLabel}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-none shadow-2xl">
        <div className="p-6 pt-8 flex flex-col items-center text-center gap-4">
          <div
            className={cn(
              'p-3 rounded-full mb-2',
              variant === 'destructive'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            {icon ||
              (variant === 'destructive' ? (
                <Trash2 className="size-6" />
              ) : (
                <AlertTriangle className="size-6" />
              ))}
          </div>

          <div className="space-y-2">
            <DialogTitle className="text-xl font-bold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground leading-relaxed px-2">
              {description}
            </DialogDescription>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t flex flex-row gap-3 sm:justify-center">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded h-11"
            disabled={isLoading}
          >
            {cancelLabel || t('common:cancel')}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            className="flex-1 rounded h-11 shadow-sm font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : null}
            {resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
