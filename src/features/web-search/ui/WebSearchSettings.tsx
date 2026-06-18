import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Key, Loader2, Search } from 'lucide-react';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import {
  useGetAppSettingQuery,
  useSaveAppSettingMutation,
} from '@/features/settings/state/api';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { useAppDispatch } from '@/app/hooks';
import { Label } from '@/ui/atoms/label';
import { Input } from '@/ui/atoms/input';
import { Button } from '@/ui/atoms/button/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { cn } from '@/lib/utils';
import {
  DEFAULT_WEB_SEARCH_PROVIDER,
  WEB_SEARCH_DASHBOARD_URLS,
  WEB_SEARCH_KEYS,
  type WebSearchProvider,
} from '../lib/constants';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function WebSearchSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();

  const { data: savedTavilyKey } = useGetAppSettingQuery(
    WEB_SEARCH_KEYS.TAVILY_API_KEY
  );
  const { data: savedExaKey } = useGetAppSettingQuery(
    WEB_SEARCH_KEYS.EXA_API_KEY
  );
  const { data: savedProvider } = useGetAppSettingQuery(
    WEB_SEARCH_KEYS.PROVIDER
  );

  const [saveSetting] = useSaveAppSettingMutation();

  const [provider, setProvider] = useState<WebSearchProvider>(
    DEFAULT_WEB_SEARCH_PROVIDER
  );
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [exaApiKey, setExaApiKey] = useState('');
  const [tavilyTestStatus, setTavilyTestStatus] = useState<TestStatus>('idle');
  const [exaTestStatus, setExaTestStatus] = useState<TestStatus>('idle');

  useEffect(() => {
    if (savedTavilyKey !== undefined) {
      setTavilyApiKey(savedTavilyKey ?? '');
    }
  }, [savedTavilyKey]);

  useEffect(() => {
    if (savedExaKey !== undefined) {
      setExaApiKey(savedExaKey ?? '');
    }
  }, [savedExaKey]);

  useEffect(() => {
    if (savedProvider === 'tavily' || savedProvider === 'exa') {
      setProvider(savedProvider);
    }
  }, [savedProvider]);

  const persistSetting = useCallback(
    async (key: string, value: string) => {
      try {
        await saveSetting({ key, value }).unwrap();
      } catch {
        dispatch(showError(t('webSearchSaveFailed')));
      }
    },
    [dispatch, saveSetting, t]
  );

  const handleProviderChange = async (value: WebSearchProvider) => {
    setProvider(value);
    await persistSetting(WEB_SEARCH_KEYS.PROVIDER, value);
  };

  const handleTavilyBlur = () => {
    void persistSetting(WEB_SEARCH_KEYS.TAVILY_API_KEY, tavilyApiKey.trim());
  };

  const handleExaBlur = () => {
    void persistSetting(WEB_SEARCH_KEYS.EXA_API_KEY, exaApiKey.trim());
  };

  const testConnection = async (
    targetProvider: WebSearchProvider,
    apiKey: string,
    setStatus: (status: TestStatus) => void
  ) => {
    if (!apiKey.trim()) {
      dispatch(showError(t('webSearchApiKeyRequired')));
      return;
    }

    setStatus('testing');
    try {
      await invokeCommand(TauriCommands.TEST_WEB_SEARCH_CONNECTION, {
        provider: targetProvider,
        apiKey: apiKey.trim(),
      });
      setStatus('success');
      dispatch(
        showSuccess(
          t('webSearchTestSuccess'),
          t('webSearchTestSuccessDescription', { provider: targetProvider })
        )
      );
      await persistSetting(
        targetProvider === 'tavily'
          ? WEB_SEARCH_KEYS.TAVILY_API_KEY
          : WEB_SEARCH_KEYS.EXA_API_KEY,
        apiKey.trim()
      );
    } catch {
      setStatus('error');
      dispatch(showError(t('webSearchTestFailed')));
    }
  };

  const openDashboard = async (url: string) => {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  };

  const activeKey = provider === 'tavily' ? tavilyApiKey : exaApiKey;
  const isActiveProviderConfigured = activeKey.trim().length > 0;

  return (
    <div className="space-y-8 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        {t('webSearchDescription')}
      </p>

      <div className="space-y-3">
        <Label htmlFor="web-search-provider">{t('webSearchProvider')}</Label>
        <Select
          value={provider}
          onValueChange={(value) =>
            void handleProviderChange(value as WebSearchProvider)
          }
        >
          <SelectTrigger id="web-search-provider" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="tavily">Tavily</SelectItem>
            <SelectItem value="exa">Exa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Search className="size-3.5" />
          <span
            className={cn(
              isActiveProviderConfigured
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            )}
          >
            {isActiveProviderConfigured
              ? t('webSearchProviderReady', { provider })
              : t('webSearchProviderMissingKey', { provider })}
          </span>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="tavily-api-key">{t('tavilyApiKey')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => void openDashboard(WEB_SEARCH_DASHBOARD_URLS.tavily)}
          >
            <ExternalLink className="size-3.5 mr-1" />
            {t('getApiKey')}
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
            <Input
              id="tavily-api-key"
              type="password"
              className="pl-9 font-mono text-sm"
              value={tavilyApiKey}
              onChange={(e) => {
                setTavilyApiKey(e.target.value);
                setTavilyTestStatus('idle');
              }}
              onBlur={handleTavilyBlur}
              placeholder="tvly-..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void testConnection('tavily', tavilyApiKey, setTavilyTestStatus)
            }
            disabled={tavilyTestStatus === 'testing'}
          >
            {tavilyTestStatus === 'testing' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t('testConnection', { ns: 'common' })
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="exa-api-key">{t('exaApiKey')}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => void openDashboard(WEB_SEARCH_DASHBOARD_URLS.exa)}
          >
            <ExternalLink className="size-3.5 mr-1" />
            {t('getApiKey')}
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Key className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
            <Input
              id="exa-api-key"
              type="password"
              className="pl-9 font-mono text-sm"
              value={exaApiKey}
              onChange={(e) => {
                setExaApiKey(e.target.value);
                setExaTestStatus('idle');
              }}
              onBlur={handleExaBlur}
              placeholder="exa-..."
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void testConnection('exa', exaApiKey, setExaTestStatus)
            }
            disabled={exaTestStatus === 'testing'}
          >
            {exaTestStatus === 'testing' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t('testConnection', { ns: 'common' })
            )}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t('webSearchAvailabilityNote')}
      </p>
    </div>
  );
}
