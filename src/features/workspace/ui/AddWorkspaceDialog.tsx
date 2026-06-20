import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import {
  Dialog,
  DialogContent,
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setName('');
    }
    setOpen(nextOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const workspaceName = name.trim();
    if (!workspaceName) return;

    setName('');
    setOpen(false);
    onAddWorkspaceCallback?.(workspaceName);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="items-stretch gap-0 p-4 sm:max-w-xs">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <DialogTitle className="m-0 text-sm font-medium leading-none">
            {t('addNewWorkspace')}
          </DialogTitle>

          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('enterWorkspaceName')}
            className="h-8"
            autoFocus
            aria-label={t('workspaceName')}
            data-tour="workspace-name-input"
          />

          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleOpenChange(false)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-7 px-3"
              disabled={!name.trim()}
              data-tour="workspace-add-btn"
            >
              {t('add', { ns: 'common' })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
