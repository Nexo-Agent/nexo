import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { ScrollArea } from '@/ui/atoms/scroll-area';

interface VariableInputDialogProps {
  open: boolean;
  title: string;
  variableNames: string[];
  variables: Record<string, string>;
  renderedPreview?: string;
  onClose: () => void;
  onSubmit: () => void;
  onVariableChange: (name: string, value: string) => void;
}

export function VariableInputDialog({
  open,
  title,
  variableNames,
  variables,
  renderedPreview,
  onClose,
  onSubmit,
  onVariableChange,
}: VariableInputDialogProps) {
  const { t } = useTranslation(['chat', 'common']);
  const [showPreview, setShowPreview] = useState(false);

  // Validate all variables are filled
  const allFilled = variableNames.every(
    (name) => variables[name] && variables[name].trim() !== ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allFilled) {
      return;
    }
    onSubmit();
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {t('enterVariableValues', { ns: 'chat' }) ||
                'Enter values for the following variables:'}
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
              <div className="space-y-4 pr-4">
                {variableNames.map((name) => (
                  <div key={name} className="space-y-2">
                    <Label htmlFor={`var-${name}`}>
                      {name.replace(/_/g, ' ')}
                    </Label>
                    <Input
                      id={`var-${name}`}
                      value={variables[name] || ''}
                      onChange={(e) => onVariableChange(name, e.target.value)}
                      placeholder={`Enter value for {{${name}}}`}
                      className="w-full"
                      autoFocus={variableNames.indexOf(name) === 0}
                    />
                  </div>
                ))}

                {variableNames.length > 0 && renderedPreview && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs"
                    >
                      {showPreview
                        ? t('hide', { ns: 'common' })
                        : t('showPreview', { ns: 'common' })}
                    </Button>
                    {showPreview && (
                      <div className="mt-2 p-3 rounded-md bg-muted text-sm whitespace-pre-wrap wrap-break-words">
                        {renderedPreview}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogBody>

          <DialogFooter className="justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="submit" disabled={!allFilled} className="flex-1">
              {t('insert', { ns: 'common' }) || 'Insert'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
