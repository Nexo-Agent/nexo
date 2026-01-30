import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { FormDialog } from '@/ui/molecules/FormDialog';
import type { LLMConnection } from '../types';
import { LLMConnectionForm } from './LLMConnectionForm';

interface LLMConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: LLMConnection | null;
  onSave: (connection: Omit<LLMConnection, 'id'>) => void;
  onDelete?: () => void;
}

/**
 * Memoized dialog wrapper for LLM connection form
 * Uses shared FormDialog for consistent UI
 */
export const LLMConnectionDialog = memo(function LLMConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
  onDelete,
}: LLMConnectionDialogProps) {
  const { t } = useTranslation(['settings', 'common']);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={connection ? t('editConnection') : t('addNewConnection')}
      description={t('configureConnection')}
      maxWidth="2xl"
      scrollable={false}
    >
      <LLMConnectionForm
        connection={connection}
        onSave={onSave}
        onDelete={onDelete}
        onClose={() => onOpenChange(false)}
      />
    </FormDialog>
  );
});
