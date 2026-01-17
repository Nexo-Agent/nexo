import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/atoms/avatar';
import { Button } from '@/ui/atoms/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubPrompt } from '@/features/prompt/types';
import { HubCommunitySection } from './HubCommunitySection';
import { logger } from '@/lib/logger';

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
  const [refreshing, setRefreshing] = useState(false);

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
      logger.error('Error loading hub prompts:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load prompts from hub';
      setError(errorMessage);
      dispatch(showError(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await invokeCommand(TauriCommands.REFRESH_HUB_INDEX);
      await loadPrompts();
      dispatch(
        showSuccess(
          t('hubIndexRefreshed', {
            defaultValue: 'Hub index refreshed successfully',
          })
        )
      );
    } catch (err) {
      logger.error('Error refreshing hub index:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh hub index';
      dispatch(showError(errorMessage));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <HubCommunitySection<HubPrompt>
      data={prompts}
      loading={loading}
      refreshing={refreshing}
      error={error}
      onRefresh={handleRefresh}
      onRetry={loadPrompts}
      searchPlaceholder={t('searchPrompts', {
        defaultValue: 'Search prompts...',
      })}
      noResultsText={t('noPromptsFound', { defaultValue: 'No prompts found.' })}
      emptyIcon={FileText}
      emptyTitle={t('noHubPrompts', { defaultValue: 'No prompts available' })}
      emptyDescription={t('noHubPromptsDescription', {
        defaultValue: 'No prompt templates found in the hub.',
      })}
      filterFn={(prompt, query) =>
        prompt.name.toLowerCase().includes(query.toLowerCase()) ||
        prompt.description.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(prompt) => {
        const isInstalled = installedPromptIds.includes(prompt.id);
        return (
          <Card
            key={prompt.id}
            className="flex flex-col h-full hover:bg-accent/50 transition-colors"
          >
            <CardHeader className="flex-row items-center gap-3 pb-3 space-y-0">
              <Avatar className="size-10 rounded-md">
                <AvatarImage
                  src={prompt.icon}
                  alt={prompt.name}
                  className="object-cover"
                />
                <AvatarFallback className="rounded bg-muted">
                  <FileText className="size-5 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <CardTitle className="text-base truncate m-0 p-0">
                  {prompt.name}
                </CardTitle>
                <CardDescription className="text-xs mt-1 truncate">
                  {prompt.id}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {prompt.description}
              </p>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                onClick={() => onInstall(prompt)}
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
            </CardFooter>
          </Card>
        );
      }}
    />
  );
}

export type { CommunityPromptsSectionProps };
