import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/ui/molecules/ConfirmDialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  connectionName?: string;
}

/**
 * Memoized confirmation dialog for deleting LLM connections
 * Uses shared ConfirmDialog for consistent UI
 */
export const DeleteConfirmDialog = memo(function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('deleteConnection')}
      description={`${t('confirmDeleteConnection', { ns: 'common' })}?`}
      onConfirm={onConfirm}
      confirmLabel={t('delete', { ns: 'common' })}
      cancelLabel={t('cancel', { ns: 'common' })}
      variant="destructive"
    />
  );
});
