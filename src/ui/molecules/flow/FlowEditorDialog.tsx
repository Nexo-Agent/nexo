import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/ui/atoms/dialog';
import { Button } from '@/ui/atoms/button/button';
import { Badge } from '@/ui/atoms/badge';
import { FlowEditor, type FlowNodeType } from './FlowEditor';
import type { FlowData } from '@/features/chat/types';

interface FlowEditorDialogProps {
  open: boolean;
  initialFlow?: FlowData;
  availableNodes?: FlowNodeType[];
  onClose: () => void;
  onSave?: (flow: FlowData) => void;
  readOnly?: boolean;
}

export function FlowEditorDialog({
  open,
  initialFlow,
  availableNodes,
  onClose,
  onSave,
  readOnly = false,
}: FlowEditorDialogProps) {
  const { t } = useTranslation(['flow', 'common']);
  const [currentFlow, setCurrentFlow] = useState<FlowData | null>(
    initialFlow || null
  );

  const handleSave = useCallback(() => {
    if (currentFlow && onSave) {
      onSave(currentFlow);
    }
    onClose();
  }, [currentFlow, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-none! w-[98vw] max-h-[95vh] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('workflowEditor')}
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-[10px] px-1.5 py-0 font-bold uppercase tracking-wider"
            >
              {t('experimental')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <FlowEditor
            initialFlow={initialFlow}
            availableNodes={availableNodes}
            onChange={!readOnly ? setCurrentFlow : undefined}
            readOnly={readOnly}
            className="w-full h-full border border-border rounded-lg"
          />
        </div>

        {!readOnly ? (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('common:cancel')}
            </Button>
            <Button type="button" onClick={handleSave}>
              {t('common:confirm')}
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              {t('common:close')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
