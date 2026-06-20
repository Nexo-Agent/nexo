import { memo } from 'react';
import { Server, AlertCircle, PowerOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { EntityCard } from '@/ui/molecules/EntityCard';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/atoms/tooltip';
import type { MCPServerConnection, MCPToolType } from '../types';
import { cn } from '@/lib/utils';

interface MCPServerConnectionCardProps {
  connection: MCPServerConnection;
  onEdit: (connection: MCPServerConnection) => void;
  handleDisconnect: (connection: MCPServerConnection) => void;
  handleReload: (connection: MCPServerConnection) => void;
}

/**
 * Card component for displaying a single MCP server connection
 * Uses shared EntityCard for consistent UI
 */
export const MCPServerConnectionCard = memo(function MCPServerConnectionCard({
  connection,
  onEdit,
  handleDisconnect,
  handleReload,
}: MCPServerConnectionCardProps) {
  const { t } = useTranslation('settings');

  const statusColor = {
    connected:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    connecting:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    disconnected: 'bg-muted text-muted-foreground',
  }[connection.status || 'disconnected'];

  return (
    <EntityCard
      onClick={() => onEdit(connection)}
      icon={<Server className="size-5 text-primary" />}
      title={
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{connection.name}</span>
          {connection.errorMessage && (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertCircle className="size-4 text-destructive shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{connection.errorMessage}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      }
      subtitle={connection.type}
      actions={
        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
          {connection.status === 'connected' && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => handleDisconnect(connection)}
              title={t('disconnectConnection')}
            >
              <PowerOff className="size-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => handleReload(connection)}
            title={t('reloadConnection')}
            disabled={connection.status === 'connecting'}
          >
            <RefreshCw
              className={cn(
                'size-3.5',
                connection.status === 'connecting' && 'animate-spin'
              )}
            />
          </Button>
        </div>
      }
      extra={
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-tighter',
                statusColor
              )}
            >
              {connection.status === 'connected'
                ? t('connected')
                : connection.status === 'connecting'
                  ? t('connecting')
                  : t('disconnected')}
            </span>
            <span className="text-[10px] text-muted-foreground truncate flex-1">
              {connection.url}
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-hidden min-h-[24px]">
            {connection.tools && connection.tools.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {connection.tools
                    .slice(0, 3)
                    .map((tool: MCPToolType, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-md bg-muted/60 px-2 py-1 text-[10px] text-foreground/80 group-hover:bg-muted transition-colors border border-border/40"
                      >
                        {tool.name}
                      </span>
                    ))}
                  {connection.tools.length > 3 && (
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-[10px] text-primary font-medium">
                      +{connection.tools.length - 3}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">
                {t('noTools', { defaultValue: 'No tools available' })}
              </span>
            )}
          </div>
        </div>
      }
    />
  );
});
