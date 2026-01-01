import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';

interface AddWorkspaceDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAddWorkspace?: (name: string) => void;
}

export function AddWorkspaceDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onAddWorkspace: onAddWorkspaceCallback,
}: AddWorkspaceDialogProps = {}) {
  const { t } = useTranslation(['settings', 'common']);
  const [internalOpen, setInternalOpen] = useState(false);
  const [name, setName] = useState('');

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const workspaceName = name.trim();
      setName('');
      setOpen(false);
      if (onAddWorkspaceCallback) {
        onAddWorkspaceCallback(workspaceName);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle>{t('addNewWorkspace')}</DialogTitle>
            <DialogDescription>
              {t('addNewWorkspaceDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-2">
              <Label htmlFor="workspace-name">{t('workspaceName')}</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('enterWorkspaceName')}
                className="w-full"
                autoFocus
              />
            </div>
          </DialogBody>
          <DialogFooter className="justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName('');
              }}
              className="flex-1"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={!name.trim()} className="flex-1">
              {t('add', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
