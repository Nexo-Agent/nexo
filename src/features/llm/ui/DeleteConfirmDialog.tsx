import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  connectionName?: string;
}

/**
 * Memoized confirmation dialog for deleting LLM connections
 */
export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('deleteConnection')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('confirmDeleteConnection', { ns: 'common' })}?
          </p>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            {t('delete', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
