import { useCallback } from 'react';
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

import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubPrompt } from '@/features/prompt/types';
import { HubCommunitySection } from './HubCommunitySection';
import { logger } from '@/lib/logger';
import {
  useGetHubPromptsQuery,
  useRefreshHubIndexMutation,
} from '../state/api';

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

  // RTK Query hooks
  const {
    data: prompts = [],
    isLoading: loading,
    error: loadError,
    refetch,
  } = useGetHubPromptsQuery();

  const [refreshHubIndex, { isLoading: refreshing }] =
    useRefreshHubIndexMutation();

  const handleRefresh = async () => {
    try {
      await refreshHubIndex().unwrap();
      dispatch(
        showSuccess(
          t('hubIndexRefreshed', {
            defaultValue: 'Hub index refreshed successfully',
          })
        )
      );
    } catch (err) {
      logger.error('Error refreshing hub index:', err);
      dispatch(showError('Failed to refresh hub index'));
    }
  };

  const errorMessage = loadError
    ? (loadError as { message?: string }).message ||
      'Failed to load prompts from hub'
    : null;

  const filterFn = useCallback(
    (prompt: HubPrompt, query: string) =>
      prompt.name.toLowerCase().includes(query.toLowerCase()) ||
      prompt.description.toLowerCase().includes(query.toLowerCase()),
    []
  );

  const renderItem = useCallback(
    (prompt: HubPrompt) => {
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
    },
    [installedPromptIds, onInstall, t]
  );

  return (
    <HubCommunitySection<HubPrompt>
      data={prompts}
      loading={loading}
      refreshing={refreshing}
      error={errorMessage}
      onRefresh={handleRefresh}
      onRetry={refetch}
      searchPlaceholder={t('searchPrompts', {
        defaultValue: 'Search prompts...',
      })}
      noResultsText={t('noPromptsFound', { defaultValue: 'No prompts found.' })}
      emptyIcon={FileText}
      emptyTitle={t('noHubPrompts', { defaultValue: 'No prompts available' })}
      emptyDescription={t('noHubPromptsDescription', {
        defaultValue: 'No prompt templates found in the hub.',
      })}
      filterFn={filterFn}
      renderItem={renderItem}
    />
  );
}

export type { CommunityPromptsSectionProps };
