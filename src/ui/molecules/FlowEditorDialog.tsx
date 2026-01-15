import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/ui/atoms/dialog';
import { Button } from '@/ui/atoms/button/button';
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
      <DialogContent className="!max-w-none w-[98vw] max-h-[95vh] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Editor</DialogTitle>
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
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              OK
            </Button>
          </DialogFooter>
        ) : (
          <DialogFooter>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
