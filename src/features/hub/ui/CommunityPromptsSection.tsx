import { useCallback } from 'react';
import { Download, FileText, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EntityCard } from '@/ui/molecules/EntityCard';

import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubPrompt } from './prompt-types';
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

      const icon = prompt.icon ? (
        <img
          src={prompt.icon}
          alt={prompt.name}
          className="size-10 rounded-md object-cover bg-muted/20 p-1"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <FileText className="size-5 text-primary" />
      );

      return (
        <EntityCard
          key={prompt.id}
          icon={icon}
          title={prompt.name}
          subtitle={prompt.id}
          description={prompt.description}
          footer={
            <Button
              onClick={() => onInstall(prompt)}
              disabled={isInstalled}
              className="w-full h-9"
              size="sm"
              variant={isInstalled ? 'secondary' : 'default'}
            >
              {isInstalled ? (
                <>
                  <Check className="mr-2 size-4" />
                  {t('installed', { defaultValue: 'Installed' })}
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  {t('install', { defaultValue: 'Install' })}
                </>
              )}
            </Button>
          }
        />
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
