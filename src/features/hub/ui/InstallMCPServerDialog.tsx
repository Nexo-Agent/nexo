import { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Label } from '@/ui/atoms/label';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import { FormDialog } from '@/ui/molecules/FormDialog';
import type { HubMCPServer } from '@/features/mcp/types';
import { logger } from '@/lib/logger';

export interface InstallMCPServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: HubMCPServer | null;
  onInstalled: () => void;
}

export function InstallMCPServerDialog({
  open,
  onOpenChange,
  server,
  onInstalled,
}: InstallMCPServerDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    if (!server) return;

    try {
      setInstalling(true);

      // Variables will be filled when using the connection, not during install
      // So we pass empty variables map
      const variables: Record<string, string> = {};

      await invokeCommand(TauriCommands.INSTALL_MCP_SERVER_FROM_HUB, {
        payload: {
          serverId: server.id,
          name: server.name,
          server_type: server.type,
          config: server.config,
          variables,
        },
      });

      dispatch(
        showSuccess(
          t('mcpServerInstalled', {
            defaultValue: 'MCP server installed successfully',
          }),
          t('mcpServerInstalledDescription', {
            defaultValue: 'The MCP server has been added to your connections',
          })
        )
      );

      onInstalled();
      onOpenChange(false);
    } catch (err) {
      logger.error('Error installing MCP server:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install MCP server';
      dispatch(showError(errorMessage));
    } finally {
      setInstalling(false);
    }
  };

  if (!server) return null;

  const formatConfigPreview = () => {
    if (server.type === 'stdio') {
      const parts: string[] = [];
      if (server.config.command) {
        parts.push(`Command: ${server.config.command}`);
      }
      if (server.config.args && server.config.args.length > 0) {
        parts.push(`Args: ${server.config.args.join(' ')}`);
      }
      if (server.config.env) {
        parts.push(`Env: ${JSON.stringify(server.config.env, null, 2)}`);
      }
      return parts.join('\n');
    } else {
      // sse
      const parts: string[] = [];
      if (server.config.url) {
        parts.push(`URL: ${server.config.url}`);
      }
      if (server.config.headers) {
        parts.push(
          `Headers: ${JSON.stringify(server.config.headers, null, 2)}`
        );
      }
      return parts.join('\n');
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${t('installMCPServer', { defaultValue: 'Install MCP Server' })}: ${server.name}`}
      description={server.description}
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={installing}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="button" onClick={handleInstall} disabled={installing}>
            {installing ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t('installing', { defaultValue: 'Installing...' })}
              </>
            ) : (
              <>
                <Download className="mr-2 size-4" />
                {t('install', { defaultValue: 'Install' })}
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('serverType', { defaultValue: 'Server Type' })}
            </Label>
            <p className="text-sm font-mono font-medium">
              {server.type.toUpperCase()}
            </p>
          </div>
          <div className="space-y-1.5 p-3 rounded-lg border bg-muted/30">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('serverId', { defaultValue: 'Server ID' })}
            </Label>
            <p className="text-sm font-mono truncate">{server.id}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            {t('serverConfig', { defaultValue: 'Server Configuration' })}
          </Label>
          <div className="relative group">
            <pre className="text-xs font-mono bg-zinc-950 text-zinc-300 p-4 rounded-lg overflow-auto max-h-[250px] border border-zinc-800">
              {formatConfigPreview()}
            </pre>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                JS
              </span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-lg p-4">
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
            {t('installNote', {
              defaultValue:
                'Note: After installation, you can configure additional environment variables and headers in the connection settings.',
            })}
          </p>
        </div>
      </div>
    </FormDialog>
  );
}
