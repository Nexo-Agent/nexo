import { memo, useMemo } from 'react';
import { ProviderIcon } from '@/ui/atoms/provider-icon';
import { Switch } from '@/ui/atoms/switch';
import { EntityCard } from '@/ui/molecules/EntityCard';
import type { LLMConnection } from '../types';
import { filterPopularModels } from './utils';

interface LLMConnectionCardProps {
  connection: LLMConnection;
  onEdit: (connection: LLMConnection) => void;
  onToggleEnabled: (connectionId: string, currentEnabled: boolean) => void;
}

/**
 * Memoized card component for displaying a single LLM connection
 * Uses shared EntityCard for consistent UI
 */
export const LLMConnectionCard = memo(function LLMConnectionCard({
  connection,
  onEdit,
  onToggleEnabled,
}: LLMConnectionCardProps) {
  const displayModels = useMemo(
    () =>
      connection.models
        ? filterPopularModels(connection.models, connection.provider)
        : [],
    [connection.models, connection.provider]
  );

  return (
    <EntityCard
      onClick={() => onEdit(connection)}
      disabled={!connection.enabled}
      icon={<ProviderIcon provider={connection.provider} className="size-5" />}
      title={connection.name}
      subtitle={connection.provider}
      actions={
        <Switch
          checked={connection.enabled}
          onCheckedChange={() =>
            onToggleEnabled(connection.id, connection.enabled)
          }
          onClick={(e) => e.stopPropagation()}
        />
      }
      extra={
        displayModels.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium">
                {displayModels.length}{' '}
                {displayModels.length === 1 ? 'model' : 'models'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {displayModels.slice(0, 3).map((model) => (
                <span
                  key={model.id}
                  className="inline-flex items-center rounded-md bg-muted/60 px-2 py-1 text-[10px] text-foreground/80 group-hover:bg-muted transition-colors border border-border/40"
                >
                  {model.name}
                </span>
              ))}
              {displayModels.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-[10px] text-primary font-medium">
                  +{displayModels.length - 3}
                </span>
              )}
            </div>
          </div>
        )
      }
    />
  );
});
