import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog';
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
      <DialogContent className="p-0 overflow-hidden flex flex-col max-h-[90vh] sm:max-w-2xl border-border/40 bg-background/95 backdrop-blur-lg shadow-xl">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="p-0 m-0">
            {connection ? t('editConnection') : t('addNewConnection')}
          </DialogTitle>
          <DialogDescription>{t('configureConnection')}</DialogDescription>
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
