import { memo, useMemo } from 'react';
import { ProviderIcon } from '@/ui/atoms/provider-icon';
import { Switch } from '@/ui/atoms/switch';
import type { LLMConnection } from '../types';
import { filterPopularModels } from './utils';

interface LLMConnectionCardProps {
  connection: LLMConnection;
  onEdit: (connection: LLMConnection) => void;
  onToggleEnabled: (connectionId: string, currentEnabled: boolean) => void;
}

/**
 * Memoized card component for displaying a single LLM connection
 * Optimized to prevent unnecessary re-renders
 */
export const LLMConnectionCard = memo(function LLMConnectionCard({
  connection,
  onEdit,
  onToggleEnabled,
}: LLMConnectionCardProps) {
  // Memoize filtered models to avoid recomputing on every render
  const displayModels = useMemo(
    () =>
      connection.models
        ? filterPopularModels(connection.models, connection.provider)
        : [],
    [connection.models, connection.provider]
  );

  return (
    <div
      className={`group relative rounded-lg border bg-card p-4 hover:shadow-md hover:border-primary/20 transition-[box-shadow,border-color,opacity] duration-200 overflow-hidden ${
        !connection.enabled ? 'opacity-60' : ''
      }`}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="relative space-y-3">
        {/* Header with icon, name, and toggle */}
        <div className="flex items-center justify-between gap-3">
          <div
            onClick={() => onEdit(connection)}
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
          >
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
              <ProviderIcon provider={connection.provider} className="size-5" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-normal truncate py-0">
                  {connection.name}
                </span>
                {!connection.enabled && (
                  <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {connection.provider}
              </p>
            </div>
          </div>
          <Switch
            checked={connection.enabled}
            onCheckedChange={() =>
              onToggleEnabled(connection.id, connection.enabled)
            }
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Models list */}
        {displayModels.length > 0 && (
          <div
            onClick={() => onEdit(connection)}
            className="space-y-1.5 cursor-pointer"
          >
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
                  className="inline-flex items-center rounded-md bg-muted/60 px-2 py-1 text-xs text-foreground/80 group-hover:bg-muted transition-colors"
                >
                  {model.name}
                </span>
              ))}
              {displayModels.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs text-primary font-medium">
                  +{displayModels.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
