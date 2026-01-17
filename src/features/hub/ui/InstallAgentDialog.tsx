import { useTranslation } from 'react-i18next';
import { Loader2, Download, Bot } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { useAppDispatch } from '@/app/hooks';
import {
  showError,
  showSuccess,
} from '@/features/notifications/state/notificationSlice';
import type { HubAgent } from '@/features/agent/types';
import { useInstallAgentFromHubMutation } from '@/features/agent/state/api';
import { logger } from '@/lib/logger';
// import type { InstallAgentDialogProps } from './InstallAgentDialogProps';
// Removing the above bad import line

// Actually, I can just keep the interface here if I didn't delete the props definition
// I accidentally deleted the props definition in the previous step?
// The diff showed removing it. Let's restore it.

export interface InstallAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: HubAgent | null;
  onInstalled: () => void;
}

export function InstallAgentDialog({
  open,
  onOpenChange,
  agent,
  onInstalled,
}: InstallAgentDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const dispatch = useAppDispatch();
  const [installAgent, { isLoading: installing }] =
    useInstallAgentFromHubMutation();
  // Removed local installing state

  const handleInstall = async () => {
    if (!agent) return;

    try {
      // setInstalling(true); // Handled by hook

      await installAgent({
        agentId: agent.id,
        name: agent.name,
        git_install: agent.git_install,
      }).unwrap();

      dispatch(
        showSuccess(
          t('agentInstalled', {
            defaultValue: 'Agent installed successfully',
          }),
          t('agentInstalledDescription', {
            defaultValue: 'The agent has been added to your collection',
          })
        )
      );

      onInstalled();
      onOpenChange(false);
    } catch (err) {
      logger.error('Error installing agent:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to install agent';
      dispatch(showError(errorMessage));
    } finally {
      // setInstalling(false); // Handled by hook
    }
  };

  if (!agent) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            {agent.icon ? (
              <img
                src={agent.icon}
                alt={agent.name}
                className="size-10 object-contain rounded-lg bg-muted/20 p-1.5 shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove(
                    'hidden'
                  );
                }}
              />
            ) : null}
            <div className="hidden rounded-lg bg-primary/10 p-2">
              <Bot className="size-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">
                {t('installAgent', { defaultValue: 'Install Agent' })}
              </DialogTitle>
              <h4 className="text-sm font-medium mt-1">{agent.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {agent.description}
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogBody>
          <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
            <div className="space-y-3 pr-4">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Category
                  </p>
                  <span className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                    {agent.category}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Author</p>
                  <p className="text-sm">{agent.author}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Version
                  </p>
                  <span className="inline-flex items-center bg-muted px-2 py-0.5 rounded font-mono text-xs">
                    {agent.version}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Source</p>
                  <a
                    href={agent.git_install.repository_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate block"
                  >
                    Repository
                  </a>
                </div>
              </div>

              {/* Git Installation Details */}
              <div className="border rounded-lg p-3 bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">
                  Git Installation Details
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[3rem] shrink-0">
                      Repo:
                    </span>
                    <span className="font-mono truncate">
                      {agent.git_install.repository_url}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[3rem] shrink-0">
                      Rev:
                    </span>
                    <span className="font-mono truncate">
                      {agent.git_install.revision}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-muted-foreground min-w-[3rem] shrink-0">
                      Path:
                    </span>
                    <span className="font-mono truncate">
                      {agent.git_install.subpath}
                    </span>
                  </div>
                </div>
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
