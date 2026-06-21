import { memo } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProviderIcon } from '@/ui/atoms/provider-icon';
import { Button } from '@/ui/atoms/button/button';
import { Switch } from '@/ui/atoms/switch';
import type { LLMConnection } from '../types';
import { cn } from '@/lib/utils';

interface LLMConnectionCardProps {
  connection: LLMConnection;
  onEdit: (connection: LLMConnection) => void;
  onToggleEnabled: (connectionId: string, enabled: boolean) => void;
}

function formatProvider(provider: string) {
  if (provider === 'openai') return 'OpenAI';
  if (provider === 'google') return 'Google';
  if (provider === 'anthropic') return 'Anthropic';
  if (provider === 'deepseek') return 'DeepSeek';
  if (provider === 'openrouter') return 'OpenRouter';
  if (provider === 'vllm') return 'vLLM';
  if (provider === 'litellm') return 'LiteLLM';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

export const LLMConnectionCard = memo(function LLMConnectionCard({
  connection,
  onEdit,
  onToggleEnabled,
}: LLMConnectionCardProps) {
  const { t } = useTranslation('settings');

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3',
        !connection.enabled && 'opacity-70'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ProviderIcon
          provider={connection.provider}
          className="size-4 shrink-0"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{connection.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatProvider(connection.provider)}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(connection)}
          aria-label={t('editConnection')}
        >
          <Settings className="size-4" />
        </Button>
        <Switch
          checked={connection.enabled}
          onCheckedChange={() =>
            onToggleEnabled(connection.id, connection.enabled)
          }
          aria-label={t('toggleConnection', {
            name: connection.name,
            defaultValue: `Toggle ${connection.name}`,
          })}
        />
      </div>
    </div>
  );
});
