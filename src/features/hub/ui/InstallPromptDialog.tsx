import { useState, useEffect } from 'react';
import { Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { FormDialog } from '@/ui/molecules/FormDialog';
import type { HubPrompt, ParsedPromptTemplate } from './prompt-types';
import { logger } from '@/lib/logger';

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
      logger.error('Error loading template:', err);
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
      logger.error('Error installing prompt:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install prompt';
      dispatch(showError(errorMessage));
    } finally {
      setInstalling(false);
    }
  };

  if (!prompt) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${t('installPrompt', { defaultValue: 'Install Prompt' })}: ${prompt.name}`}
      description={prompt.description}
      scrollable={false}
      footer={
        <div className="flex w-full justify-end gap-2">
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
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="mr-2 size-4 animate-spin" />
          <p className="text-sm text-muted-foreground">
            {t('loadingTemplate', {
              defaultValue: 'Loading template...',
            })}
          </p>
        </div>
      ) : template ? (
        <div className="space-y-4">
          <Textarea
            value={template.content}
            readOnly
            className="font-mono text-sm h-[50vh]"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[300px]">
          <p className="text-sm text-muted-foreground">
            {t('failedToLoadTemplate', {
              defaultValue: 'Failed to load template',
            })}
          </p>
        </div>
      )}
    </FormDialog>
  );
}
