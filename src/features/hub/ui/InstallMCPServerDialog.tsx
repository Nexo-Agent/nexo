import { useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Label } from '@/ui/atoms/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {t('installMCPServer', { defaultValue: 'Install MCP Server' })}:{' '}
            {server.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{server.description}</p>
        </DialogHeader>

        <DialogBody className="overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label>
                  {t('serverType', { defaultValue: 'Server Type' })}
                </Label>
                <p className="text-sm font-mono bg-muted px-3 py-2 rounded">
                  {server.type.toUpperCase()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  {t('serverConfig', { defaultValue: 'Server Configuration' })}
                </Label>
                <pre className="text-xs font-mono bg-muted p-3 rounded overflow-auto max-h-[300px]">
                  {formatConfigPreview()}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogBody>

        <DialogFooter className="shrink-0">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
