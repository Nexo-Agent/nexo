import { useState, useEffect } from 'react';
import { Download, FileText, RefreshCw, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/atoms/avatar';
import { Button } from '@/ui/atoms/button/button';
import { Input } from '@/ui/atoms/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/atoms/card';
import { EmptyState } from '@/ui/atoms/empty-state';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubPrompt } from '../types';
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleInstall = (prompt: HubPrompt) => {
    onInstall(prompt);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      // Refresh hub index first
      await invokeCommand(TauriCommands.REFRESH_HUB_INDEX);
      // Then reload prompts
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

  const filteredPrompts = prompts.filter(
    (prompt) =>
      prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPrompts', {
                defaultValue: 'Search prompts...',
              })}
              className="pl-9"
              disabled
            />
          </div>
          <Button disabled size="sm" variant="outline">
            <RefreshCw className="mr-2 size-4" />
            {t('refresh', { defaultValue: 'Refresh' })}
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="flex flex-col h-full animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="size-10 rounded-md bg-muted" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 mb-4">
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="h-9 bg-muted rounded w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </ScrollArea>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('searchPrompts', {
              defaultValue: 'Search prompts...',
            })}
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`mr-2 size-4 ${refreshing ? 'animate-spin' : ''}`}
          />
          {t('refresh', { defaultValue: 'Refresh' })}
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-280px)]">
        {filteredPrompts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">
              {t('noPromptsFound', { defaultValue: 'No prompts found.' })}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
            {filteredPrompts.map((prompt) => {
              const isInstalled = installedPromptIds.includes(prompt.id);
              return (
                <Card
                  key={prompt.id}
                  className="flex flex-col h-full hover:bg-accent/50 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
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
                        <CardTitle className="text-base truncate">
                          {prompt.name}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 truncate">
                          {prompt.id}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {prompt.description}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0">
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
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export type { CommunityPromptsSectionProps };
