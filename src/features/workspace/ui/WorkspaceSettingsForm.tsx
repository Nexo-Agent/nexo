import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Separator } from '@/ui/atoms/separator';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import type { Workspace, WorkspaceSettings } from '../types';
import type { LLMConnection, MCPServerConnection } from '@/app/types';
import { BasicSettings } from './settings/BasicSettings';
import { ModelSettings } from './settings/ModelSettings';
import { MCPSettings } from './settings/MCPSettings';
import { AdvancedSettings } from './settings/AdvancedSettings';
import { SkillSettings } from './settings/SkillSettings';
import { DangerZone } from './settings/DangerZone';

interface WorkspaceSettingsFormProps {
  workspace: Workspace;
  initialSettings?: WorkspaceSettings;
  llmConnections: LLMConnection[];
  allMcpConnections: MCPServerConnection[];
  hasChats: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (settings: WorkspaceSettings) => Promise<void>;
  onDeleteWorkspace: (workspaceId: string) => Promise<void>;
  onClearAllChats: (workspaceId: string) => Promise<void>;
}

export function WorkspaceSettingsForm({
  workspace,
  initialSettings,
  llmConnections,
  allMcpConnections,
  hasChats,
  onOpenChange,
  onSave,
  onDeleteWorkspace,
  onClearAllChats,
}: WorkspaceSettingsFormProps) {
  const { t } = useTranslation(['settings', 'common']);

  const [clearChatsDialogOpen, setClearChatsDialogOpen] = useState(false);
  const [deleteWorkspaceDialogOpen, setDeleteWorkspaceDialogOpen] =
    useState(false);

  const [name, setName] = useState(workspace.name);
  const [systemMessage, setSystemMessage] = useState(
    initialSettings?.systemMessage || ''
  );
  const [selectedTools, setSelectedTools] = useState<Record<string, string>>(
    initialSettings?.mcpToolIds || {}
  );
  const [llmConnectionId, setLlmConnectionId] = useState<string | undefined>(
    initialSettings?.llmConnectionId
  );
  const [defaultModel, setDefaultModel] = useState<string>(
    initialSettings?.defaultModel || ''
  );
  const [streamEnabled, setStreamEnabled] = useState<boolean>(
    initialSettings?.streamEnabled ?? true
  );
  const [maxAgentIterations, setMaxAgentIterations] = useState<number>(
    initialSettings?.maxAgentIterations ?? 25
  );
  const [internalToolsEnabled, setInternalToolsEnabled] = useState<boolean>(
    initialSettings?.internalToolsEnabled ?? false
  );
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>(
    initialSettings?.selectedSkillIds || []
  );

  const [toolPermissionConfig, setToolPermissionConfig] = useState<
    Record<string, 'require' | 'auto'>
  >(initialSettings?.toolPermissionConfig || {});

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearingChats, setIsClearingChats] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newSettings: WorkspaceSettings = {
        id: workspace.id,
        name: name.trim(),
        systemMessage: systemMessage.trim(),
        mcpToolIds:
          Object.keys(selectedTools).length > 0 ? selectedTools : undefined,
        llmConnectionId: llmConnectionId || undefined,
        defaultModel: defaultModel.trim() || undefined,
        streamEnabled,
        toolPermissionConfig:
          Object.keys(toolPermissionConfig).length > 0
            ? toolPermissionConfig
            : undefined,
        maxAgentIterations,
        internalToolsEnabled,
        selectedSkillIds,
      };
      await onSave(newSettings);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAllChats = async () => {
    setIsClearingChats(true);
    try {
      await onClearAllChats(workspace.id);
      setClearChatsDialogOpen(false);
    } finally {
      setIsClearingChats(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteWorkspace(workspace.id);
      setDeleteWorkspaceDialogOpen(false);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <div className="flex-1 overflow-hidden px-6 py-4 min-h-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 pr-4">
              <BasicSettings
                name={name}
                onNameChange={setName}
                systemMessage={systemMessage}
                onSystemMessageChange={setSystemMessage}
              />

              <div className="space-y-4">
                <ModelSettings
                  llmConnections={llmConnections}
                  llmConnectionId={llmConnectionId}
                  defaultModel={defaultModel}
                  onModelChange={(connId, modelId) => {
                    setLlmConnectionId(connId);
                    setDefaultModel(modelId);
                  }}
                />

                <MCPSettings
                  allMcpConnections={allMcpConnections}
                  selectedTools={selectedTools}
                  onSelectedToolsChange={setSelectedTools}
                  toolPermissionConfig={toolPermissionConfig}
                  onToolPermissionConfigChange={setToolPermissionConfig}
                />
              </div>

              <AdvancedSettings
                streamEnabled={streamEnabled}
                onStreamEnabledChange={setStreamEnabled}
                maxAgentIterations={maxAgentIterations}
                onMaxAgentIterationsChange={setMaxAgentIterations}
                internalToolsEnabled={internalToolsEnabled}
                onInternalToolsEnabledChange={setInternalToolsEnabled}
              />

              <Separator />

              <SkillSettings
                selectedSkillIds={selectedSkillIds}
                onChange={setSelectedSkillIds}
              />

              <Separator />

              <DangerZone
                hasChats={hasChats}
                isClearingChats={isClearingChats}
                onClearAllChats={() => setClearChatsDialogOpen(true)}
                isDeleting={isDeleting}
                onDelete={() => setDeleteWorkspaceDialogOpen(true)}
              />
            </div>
          </ScrollArea>
        </div>
        <div className="flex items-center justify-end gap-3 shrink-0 px-6 py-4 border-t border-border bg-background/50 backdrop-blur-md">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-muted"
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isSaving}
            className="min-w-[120px] shadow-sm font-medium"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="size-4 mr-2" />
            )}
            {t('save', { ns: 'common' })}
          </Button>
        </div>
      </form>

      {/* Clear All Chats Confirmation Dialog */}
      <Dialog
        open={clearChatsDialogOpen}
        onOpenChange={setClearChatsDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clearAllChats', { ns: 'settings' })}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t('confirmClearAllChats', { ns: 'settings' })}
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearChatsDialogOpen(false)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleClearAllChats}
              disabled={isClearingChats}
            >
              {isClearingChats && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              {t('clear', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <Dialog
        open={deleteWorkspaceDialogOpen}
        onOpenChange={setDeleteWorkspaceDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('deleteWorkspace', { ns: 'settings' })}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {t('confirmDeleteWorkspace', { ns: 'settings' })}
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteWorkspaceDialogOpen(false)}
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="size-4 animate-spin mr-2" />}
              {t('delete', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
