import { useState, useEffect } from 'react';
import { Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubPrompt, ParsedPromptTemplate } from '../types';

export interface InstallPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompt: HubPrompt | null;
  onInstalled: () => void;
}

export function InstallPromptDialog({
  open,
  onOpenChange,
  prompt,
  onInstalled,
}: InstallPromptDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [template, setTemplate] = useState<ParsedPromptTemplate | null>(null);

  useEffect(() => {
    if (open && prompt) {
      loadTemplate();
    } else {
      // Reset state when dialog closes
      setTemplate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prompt]);

  const loadTemplate = async () => {
    if (!prompt) return;

    try {
      setLoading(true);
      const parsed = await invokeCommand<ParsedPromptTemplate>(
        TauriCommands.FETCH_PROMPT_TEMPLATE,
        { path: prompt.path }
      );
      setTemplate(parsed);
    } catch (err) {
      console.error('Error loading template:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load prompt template';
      dispatch(showError(errorMessage));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!prompt || !template) return;

    try {
      setInstalling(true);
      await invokeCommand(TauriCommands.INSTALL_PROMPT_FROM_HUB, {
        payload: {
          promptId: prompt.id,
          name: prompt.name,
          path: prompt.path,
        },
      });

      dispatch(
        showSuccess(
          t('promptInstalled', {
            defaultValue: 'Prompt installed successfully',
          }),
          t('promptInstalledDescription', {
            defaultValue: 'The prompt has been added to your collection',
          })
        )
      );

      onInstalled();
      onOpenChange(false);
    } catch (err) {
      console.error('Error installing prompt:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install prompt';
      dispatch(showError(errorMessage));
    } finally {
      setInstalling(false);
    }
  };

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {t('installPrompt', { defaultValue: 'Install Prompt' })}:{' '}
            {prompt.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{prompt.description}</p>
        </DialogHeader>

        <DialogBody>
          <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
            <div className="space-y-6 pr-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">
                    {t('loadingTemplate', {
                      defaultValue: 'Loading template...',
                    })}
                  </p>
                </div>
              ) : template ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      {t('promptContent', {
                        defaultValue: 'Prompt Content',
                      })}
                    </h4>
                    {template.variables.length > 0 && (
                      <p className="text-xs text-muted-foreground mb-2">
                        {t('variablesWillBeFilledInChat', {
                          defaultValue:
                            'Variables ({{variables}}) will be filled when using this prompt in chat.',
                          variables: template.variables.join(', '),
                        })}
                      </p>
                    )}
                    <Textarea
                      value={template.content}
                      readOnly
                      className="min-h-[200px] font-mono text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">
                    {t('failedToLoadTemplate', {
                      defaultValue: 'Failed to load template',
                    })}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogBody>

        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={installing}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            type="button"
            onClick={handleInstall}
            disabled={loading || installing || !template}
          >
            {installing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('installing', { defaultValue: 'Installing...' })}
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                {t('install', { defaultValue: 'Install' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
