import { useState, useEffect } from 'react';
import { Download, Loader2, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { EmptyState } from '@/ui/atoms/empty-state';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import { showError } from '@/features/notifications/state/notificationSlice';
import type { HubPrompt } from '../types';

interface CommunityPromptsSectionProps {
  installedPromptIds: string[];
  onInstall: (prompt: HubPrompt) => void;
}

export function CommunityPromptsSection({
  installedPromptIds,
  onInstall,
}: CommunityPromptsSectionProps) {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const [prompts, setPrompts] = useState<HubPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPrompts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invokeCommand<HubPrompt[]>(
        TauriCommands.FETCH_HUB_PROMPTS
      );
      setPrompts(data);
    } catch (err) {
      console.error('Error loading hub prompts:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load prompts from hub';
      setError(errorMessage);
      dispatch(showError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = (prompt: HubPrompt) => {
    onInstall(prompt);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 size-4 animate-spin" />
        <p className="text-sm text-muted-foreground">
          {t('loadingHubPrompts', { defaultValue: 'Loading prompts...' })}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/10">
        <p className="text-sm text-destructive mb-4">{error}</p>
        <Button onClick={loadPrompts} size="sm" variant="outline">
          {t('retry', { ns: 'common', defaultValue: 'Retry' })}
        </Button>
      </div>
    );
  }

  if (prompts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t('noHubPrompts', { defaultValue: 'No prompts available' })}
        description={t('noHubPromptsDescription', {
          defaultValue: 'No prompt templates found in the hub.',
        })}
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {prompts.map((prompt) => {
        const isInstalled = installedPromptIds.includes(prompt.id);
        return (
          <Card
            key={prompt.id}
            className="hover:bg-accent/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                {prompt.icon && (
                  <img
                    src={prompt.icon}
                    alt={prompt.name}
                    className="size-8 rounded object-cover"
                    onError={(e) => {
                      // Hide image on error
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base">{prompt.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {prompt.id}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2">
                {prompt.description}
              </p>
              <Button
                onClick={() => handleInstall(prompt)}
                disabled={isInstalled}
                className="w-full"
                size="sm"
                variant={isInstalled ? 'outline' : 'default'}
              >
                {isInstalled ? (
                  <>
                    <FileText className="mr-2 size-4" />
                    {t('installed', { defaultValue: 'Installed' })}
                  </>
                ) : (
                  <>
                    <Download className="mr-2 size-4" />
                    {t('install', { defaultValue: 'Install' })}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { CommunityPromptsSectionProps };
