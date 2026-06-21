import { memo } from 'react';
import { Settings, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Switch } from '@/ui/atoms/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/atoms/tooltip';
import type { MCPServerConnection } from '../types';
import { cn } from '@/lib/utils';

interface MCPServerConnectionCardProps {
  connection: MCPServerConnection;
  onEdit: (connection: MCPServerConnection) => void;
  onToggle: (connection: MCPServerConnection, enabled: boolean) => void;
}

export const MCPServerConnectionCard = memo(function MCPServerConnectionCard({
  connection,
  onEdit,
  onToggle,
}: MCPServerConnectionCardProps) {
  const { t } = useTranslation('settings');

  const isEnabled =
    connection.status === 'connected' || connection.status === 'connecting';
  const isConnecting = connection.status === 'connecting';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3',
        isConnecting && 'opacity-80'
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{connection.name}</span>
        {connection.errorMessage ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="size-3.5 shrink-0 text-destructive cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-sm">{connection.errorMessage}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
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
          checked={isEnabled}
          disabled={isConnecting}
          onCheckedChange={(checked) => onToggle(connection, checked)}
          aria-label={t('toggleConnection', {
            name: connection.name,
            defaultValue: `Toggle ${connection.name}`,
          })}
        />
      </div>
    </div>
  );
});
