import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {connection ? t('editConnection') : t('addNewConnection')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('configureConnection')}
          </p>
        </DialogHeader>

        <LLMConnectionForm
          connection={connection}
          onSave={onSave}
          onDelete={onDelete}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
});
