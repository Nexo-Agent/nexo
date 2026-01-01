import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Checkbox } from '@/ui/atoms/checkbox';
import { Input } from '@/ui/atoms/input';
import { Label } from '@/ui/atoms/label';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Switch } from '@/ui/atoms/switch';
import { Separator } from '@/ui/atoms/separator';
import { Tooltip } from '@/ui/atoms/tooltip';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { cn } from '@/lib/utils';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import { SlashCommandDropdown } from '@/ui/chat-area/SlashCommandDropdown';
import { VariableInputDialog } from '@/ui/chat-area/VariableInputDialog';
import { parsePromptVariables, renderPrompt } from '@/lib/prompt-utils';
import type {
  Workspace,
  WorkspaceSettings,
  LLMConnection,
  MCPServerConnection,
  Prompt,
} from '@/store/types';

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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // State for slash commands
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptVariables, setPromptVariables] = useState<
    Record<string, string>
  >({});

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

  const [toolPermissionConfig, setToolPermissionConfig] = useState<
    Record<string, 'require' | 'auto'>
  >(initialSettings?.toolPermissionConfig || {});
  const [showAllMcpConnections, setShowAllMcpConnections] =
    useState<boolean>(false);
  const [collapsedServers, setCollapsedServers] = useState<Set<string>>(
    () => new Set(allMcpConnections.map((conn) => conn.id))
  );
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

  // Insert prompt content into system message area
  const insertPromptContent = (content: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Only replace if systemMessage starts with "/"
    if (!systemMessage.startsWith('/')) return;

    // Get text after the slash command (if any)
    const afterSlash = systemMessage.substring(1);
    const spaceIndex = afterSlash.indexOf(' ');
    const additionalText =
      spaceIndex === -1 ? '' : afterSlash.substring(spaceIndex + 1);

    // Replace slash command with prompt content
    const newInput = content + (additionalText ? ' ' + additionalText : '');
    setSystemMessage(newInput);

    // Set cursor position to end
    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newInput.length, newInput.length);
      }
    }, 0);
  };

  // Handle prompt selection
  const handleSelectPrompt = (prompt: Prompt) => {
    const variableNames = parsePromptVariables(prompt.content);

    if (variableNames.length > 0) {
      const initialVariables: Record<string, string> = {};
      variableNames.forEach((name) => {
        initialVariables[name] = '';
      });
      setPromptVariables(initialVariables);
      slashCommand.close();
      setSelectedPrompt(prompt);
      setVariableDialogOpen(true);
    } else {
      slashCommand.close();
      // Use setTimeout to ensure close() state is set before input changes
      setTimeout(() => {
        insertPromptContent(prompt.content);
      }, 0);
    }
  };

  const slashCommand = useSlashCommand({
    input: systemMessage,
    onSelectPrompt: handleSelectPrompt,
  });

  const handleVariableDialogSubmit = () => {
    if (!selectedPrompt) return;
    const renderedContent = renderPrompt(
      selectedPrompt.content,
      promptVariables
    );
    insertPromptContent(renderedContent);
    setVariableDialogOpen(false);
    setSelectedPrompt(null);
    setPromptVariables({});
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashCommand.isActive) {
      const handled = slashCommand.handleKeyDown(e);
      if (handled) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        slashCommand.close();
        return;
      }
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="size-5" />
            {t('workspaceSettings')}
          </DialogTitle>
          <DialogDescription>
            {t('configureWorkspace', { name: workspace.name })}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ScrollArea className="h-full [&_[data-slot='scroll-area-scrollbar']]:hidden">
            <div className="space-y-6 pr-4">
              {/* Basic Settings Section */}
              <div className="space-y-4">
                <div className="space-y-2 w-full">
                  <Label htmlFor="workspace-name">{t('workspaceName')}</Label>
                  <Input
                    id="workspace-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('enterWorkspaceName')}
                    className="w-full"
                    required
                  />
                </div>
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="system-message">{t('systemMessage')}</Label>
                    <Tooltip content={t('systemMessageDescription')} />
                  </div>
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      id="system-message"
                      value={systemMessage}
                      onChange={(e) => setSystemMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t('enterSystemMessage')}
                      className="w-full min-h-32"
                      rows={6}
                    />
                    {/* Slash Command Dropdown */}
                    {slashCommand.isActive &&
                      slashCommand.filteredPrompts.length > 0 && (
                        <SlashCommandDropdown
                          prompts={slashCommand.filteredPrompts}
                          selectedIndex={slashCommand.selectedIndex}
                          onSelect={slashCommand.handleSelect}
                          direction="down"
                        />
                      )}
                  </div>
                </div>
              </div>

              {/* Connections Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="llm-connection">
                        {t('llmConnections')}
                      </Label>
                      <Tooltip content={t('llmConnectionDescription')} />
                    </div>
                    <Select
                      value={llmConnectionId}
                      onValueChange={(value) => {
                        setLlmConnectionId(value || undefined);
                        // Clear default model when LLM connection changes
                        if (value !== llmConnectionId) {
                          setDefaultModel('');
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('llmConnectionOptional')} />
                      </SelectTrigger>
                      <SelectContent>
                        {llmConnections.length === 0 ? (
                          <SelectGroup>
                            <SelectLabel className="text-muted-foreground">
                              {t('noLLMConnections')}
                            </SelectLabel>
                          </SelectGroup>
                        ) : (
                          llmConnections.map((conn) => (
                            <SelectItem key={conn.id} value={conn.id}>
                              {conn.name} ({conn.provider})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Default Model Selector - only show when LLM connection is selected */}
                  {llmConnectionId &&
                    (() => {
                      try {
                        const selectedConnection = llmConnections.find(
                          (conn) => conn?.id === llmConnectionId
                        );

                        // Safely get models array
                        let availableModels: Array<{
                          id: string;
                          name?: string;
                        }> = [];
                        if (selectedConnection?.models) {
                          if (Array.isArray(selectedConnection.models)) {
                            availableModels = selectedConnection.models.filter(
                              (m) => m && typeof m === 'object' && m.id
                            );
                          }
                        }

                        // Safely get model name
                        const getModelName = (
                          modelId: string | undefined | null
                        ): string => {
                          if (
                            !modelId ||
                            modelId === '__none__' ||
                            availableModels.length === 0
                          ) {
                            return t('noDefaultModel');
                          }
                          try {
                            const model = availableModels.find(
                              (m) => m?.id === modelId
                            );
                            return (
                              model?.name || modelId || t('noDefaultModel')
                            );
                          } catch {
                            return modelId || t('noDefaultModel');
                          }
                        };

                        // Safely get current value - ensure it exists in available models or use __none__
                        let currentValue = '__none__';
                        if (
                          defaultModel &&
                          defaultModel !== '' &&
                          defaultModel !== '__none__'
                        ) {
                          // Only use defaultModel if it exists in availableModels
                          const modelExists = availableModels.some(
                            (m) => m?.id === defaultModel
                          );
                          currentValue = modelExists
                            ? defaultModel
                            : '__none__';
                          // Clear invalid defaultModel
                          if (!modelExists && defaultModel) {
                            setTimeout(() => setDefaultModel(''), 0);
                          }
                        }

                        return (
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor="default-model">
                                {t('defaultModel')}
                              </Label>
                              <Tooltip content={t('defaultModelDescription')} />
                            </div>
                            <Select
                              value={currentValue}
                              onValueChange={(value) => {
                                try {
                                  setDefaultModel(
                                    value === '__none__' ? '' : value
                                  );
                                } catch (error) {
                                  console.error(
                                    'Error setting default model:',
                                    error
                                  );
                                  setDefaultModel('');
                                }
                              }}
                            >
                              <SelectTrigger
                                className="w-full"
                                id="default-model"
                              >
                                <SelectValue
                                  placeholder={t('selectDefaultModel')}
                                >
                                  {getModelName(defaultModel)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  {t('noDefaultModel')}
                                </SelectItem>
                                {availableModels.length > 0 ? (
                                  availableModels
                                    .map((model) => {
                                      if (!model || !model.id) return null;
                                      return (
                                        <SelectItem
                                          key={model.id}
                                          value={model.id}
                                        >
                                          {model.name || model.id}
                                        </SelectItem>
                                      );
                                    })
                                    .filter(Boolean)
                                ) : (
                                  <SelectGroup>
                                    <SelectLabel className="text-muted-foreground">
                                      {t('noModels', { ns: 'chat' }) ||
                                        'No models available'}
                                    </SelectLabel>
                                  </SelectGroup>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      } catch (error) {
                        console.error(
                          'Error rendering default model selector:',
                          error
                        );
                        // Fallback: show empty component
                        return (
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor="default-model">
                                {t('defaultModel')}
                              </Label>
                              <Tooltip content={t('defaultModelDescription')} />
                            </div>
                            <Select
                              value="__none__"
                              onValueChange={(value) => {
                                setDefaultModel(
                                  value === '__none__' ? '' : value
                                );
                              }}
                            >
                              <SelectTrigger
                                className="w-full"
                                id="default-model"
                                disabled
                              >
                                <SelectValue
                                  placeholder={t('selectDefaultModel')}
                                >
                                  {t('noDefaultModel')}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  {t('noDefaultModel')}
                                </SelectItem>
                                <SelectGroup>
                                  <SelectLabel className="text-muted-foreground">
                                    {t('noModels', { ns: 'chat' }) ||
                                      'No models available'}
                                  </SelectLabel>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                    })()}
                </div>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label>{t('mcpServerConnectionsLabel')}</Label>
                      <Tooltip content={t('mcpConnectionsDescription')} />
                    </div>
                    {allMcpConnections.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() =>
                          setShowAllMcpConnections(!showAllMcpConnections)
                        }
                      >
                        {showAllMcpConnections ? (
                          <>
                            <ChevronUp className="size-3 mr-1" />
                            {t('showOnlyConnected', { ns: 'settings' }) ||
                              'Show only connected'}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="size-3 mr-1" />
                            {t('showAll', { ns: 'settings' }) || 'Show all'}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const connectedConnections = allMcpConnections.filter(
                      (conn) => conn.status === 'connected'
                    );
                    const displayedConnections = showAllMcpConnections
                      ? allMcpConnections
                      : connectedConnections;

                    if (displayedConnections.length === 0) {
                      return (
                        <div className="text-sm text-muted-foreground py-2">
                          {allMcpConnections.length === 0
                            ? t('noMCPConnections')
                            : t('noConnectedMCPConnections') ||
                              'No connected MCP connections available'}
                        </div>
                      );
                    }

                    const handleToolToggle = (
                      toolName: string,
                      connectionId: string
                    ) => {
                      setSelectedTools((prev) => {
                        const newSelected = { ...prev };
                        if (newSelected[toolName] === connectionId) {
                          // Tool is selected, unselect it
                          delete newSelected[toolName];
                        } else {
                          // Tool is not selected, select it
                          newSelected[toolName] = connectionId;
                        }
                        return newSelected;
                      });
                    };

                    const toggleServerCollapse = (serverId: string) => {
                      setCollapsedServers((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(serverId)) {
                          newSet.delete(serverId);
                        } else {
                          newSet.add(serverId);
                        }
                        return newSet;
                      });
                    };

                    return (
                      <div className="space-y-3">
                        {displayedConnections.map((conn) => {
                          const isConnected = conn.status === 'connected';
                          const isConnecting = conn.status === 'connecting';
                          const isDisconnected = conn.status === 'disconnected';
                          const isCollapsed = collapsedServers.has(conn.id);

                          // Status icon and color
                          let StatusIcon: React.ComponentType<{
                            className?: string;
                          }> | null = null;
                          let statusColor = '';

                          if (isConnected) {
                            StatusIcon = CheckCircle2;
                            statusColor = 'text-green-600 dark:text-green-400';
                          } else if (isConnecting) {
                            StatusIcon = Loader2;
                            statusColor =
                              'text-yellow-600 dark:text-yellow-400';
                          } else if (isDisconnected) {
                            StatusIcon = XCircle;
                            statusColor = 'text-gray-500 dark:text-gray-400';
                          }

                          // Get tools for this connection
                          const tools = conn.tools || [];

                          // Calculate selection state for this server
                          const selectedToolsCount = tools.filter(
                            (tool) => selectedTools[tool.name] === conn.id
                          ).length;
                          const allSelected =
                            tools.length > 0 &&
                            selectedToolsCount === tools.length;
                          const someSelected =
                            selectedToolsCount > 0 &&
                            selectedToolsCount < tools.length;

                          // Handle select/deselect all tools for this server
                          const handleSelectAllTools = (
                            e: React.MouseEvent
                          ) => {
                            e.stopPropagation(); // Prevent collapse/expand
                            if (!isConnected) return;

                            setSelectedTools((prev) => {
                              const newSelected = { ...prev };
                              if (allSelected) {
                                // Deselect all tools from this server
                                tools.forEach((tool) => {
                                  if (newSelected[tool.name] === conn.id) {
                                    delete newSelected[tool.name];
                                  }
                                });
                              } else {
                                // Select all tools from this server
                                tools.forEach((tool) => {
                                  newSelected[tool.name] = conn.id;
                                });
                              }
                              return newSelected;
                            });
                          };

                          return (
                            <div
                              key={conn.id}
                              className="border rounded-lg overflow-hidden"
                            >
                              {/* Card Header: Server Name with Status - Clickable to collapse/expand */}
                              <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                onClick={() => toggleServerCollapse(conn.id)}
                              >
                                <div className="flex items-center gap-2">
                                  {StatusIcon && (
                                    <StatusIcon
                                      className={cn(
                                        'size-4 shrink-0',
                                        statusColor,
                                        isConnecting && 'animate-spin'
                                      )}
                                    />
                                  )}
                                  <span className="font-semibold text-sm">
                                    {conn.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({selectedToolsCount}/{tools.length}{' '}
                                    selected)
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Select All Checkbox */}
                                  {tools.length > 0 && (
                                    <div
                                      onClick={handleSelectAllTools}
                                      className={cn(
                                        'size-4 rounded border flex items-center justify-center transition-colors cursor-pointer',
                                        !isConnected &&
                                          'opacity-50 cursor-not-allowed',
                                        allSelected &&
                                          isConnected &&
                                          'bg-primary border-primary',
                                        someSelected &&
                                          !allSelected &&
                                          isConnected &&
                                          'bg-primary/50 border-primary'
                                      )}
                                      title={
                                        allSelected
                                          ? 'Deselect all tools'
                                          : 'Select all tools'
                                      }
                                    >
                                      {allSelected && (
                                        <svg
                                          className="size-3 text-primary-foreground"
                                          fill="none"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      )}
                                      {someSelected && !allSelected && (
                                        <div className="size-2 bg-primary-foreground rounded-sm" />
                                      )}
                                    </div>
                                  )}
                                  {isCollapsed ? (
                                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-300" />
                                  ) : (
                                    <ChevronUp className="size-4 shrink-0 text-muted-foreground transition-transform duration-300" />
                                  )}
                                </div>
                              </button>

                              {/* Card Body: Tools as List Items - Collapsible with Animation */}
                              <div
                                className={cn(
                                  'transition-all duration-300 ease-in-out',
                                  isCollapsed
                                    ? 'grid grid-rows-[0fr] opacity-0'
                                    : 'grid grid-rows-[1fr] opacity-100'
                                )}
                              >
                                <div className="overflow-hidden">
                                  {tools.length > 0 ? (
                                    <div className="flex flex-col border-t divide-y">
                                      {tools.map((tool) => {
                                        const isSelected =
                                          selectedTools[tool.name] === conn.id;
                                        const configValue =
                                          toolPermissionConfig[tool.name];

                                        return (
                                          <div
                                            key={tool.name}
                                            className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                                          >
                                            {/* Left: Checkbox + Name */}
                                            <div className="flex items-center gap-3 overflow-hidden">
                                              <Checkbox
                                                id={`tool-${conn.id}-${tool.name}`}
                                                checked={isSelected}
                                                onCheckedChange={() =>
                                                  isConnected &&
                                                  handleToolToggle(
                                                    tool.name,
                                                    conn.id
                                                  )
                                                }
                                                disabled={!isConnected}
                                              />
                                              <div className="flex flex-col overflow-hidden">
                                                <Label
                                                  htmlFor={`tool-${conn.id}-${tool.name}`}
                                                  className={cn(
                                                    'text-sm font-medium cursor-pointer truncate',
                                                    !isConnected && 'opacity-50'
                                                  )}
                                                >
                                                  {tool.name}
                                                </Label>
                                                {tool.description && (
                                                  <span
                                                    className="text-xs text-muted-foreground truncate max-w-[300px]"
                                                    title={tool.description}
                                                  >
                                                    {tool.description}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Right: Permission Selector (only if selected) */}
                                            <div className="flex items-center gap-2 shrink-0">
                                              {isSelected && (
                                                <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                                                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                                                    Permission:
                                                  </span>
                                                  <Select
                                                    value={
                                                      configValue || 'auto'
                                                    }
                                                    onValueChange={(value) => {
                                                      setToolPermissionConfig(
                                                        (prev) => {
                                                          const newConfig = {
                                                            ...prev,
                                                          };
                                                          if (
                                                            value === 'auto'
                                                          ) {
                                                            delete newConfig[
                                                              tool.name
                                                            ];
                                                          } else {
                                                            newConfig[
                                                              tool.name
                                                            ] = value as
                                                              | 'require'
                                                              | 'auto';
                                                          }
                                                          return newConfig;
                                                        }
                                                      );
                                                    }}
                                                    disabled={!isConnected}
                                                  >
                                                    <SelectTrigger className="w-[110px] h-7 text-xs">
                                                      <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="auto">
                                                        Auto (Run)
                                                      </SelectItem>
                                                      <SelectItem value="require">
                                                        Ask (Target)
                                                      </SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="p-4 text-center text-xs text-muted-foreground italic">
                                      No tools available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Advanced Settings Section */}
              <div className="space-y-4">
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="stream-enabled">
                        {t('streamMode', { ns: 'chat' })}
                      </Label>
                      <Tooltip
                        content={t('streamModeDescription', {
                          ns: 'settings',
                        })}
                      />
                    </div>
                    <Switch
                      id="stream-enabled"
                      checked={streamEnabled}
                      onCheckedChange={setStreamEnabled}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Danger Zone Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-destructive">
                  {t('dangerZone', { ns: 'settings' }) || 'Danger Zone'}
                </h3>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <Label className="text-foreground">
                        {t('clearAllChats', { ns: 'settings' })}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('clearAllChatsDescription', { ns: 'settings' })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setClearChatsDialogOpen(true)}
                      disabled={!hasChats || isClearingChats}
                    >
                      {isClearingChats ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="size-4 mr-2" />
                      )}
                      {t('clearAllChats', { ns: 'settings' })}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogBody>
        <DialogFooter className="shrink-0 justify-between gap-2" showBorder>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteWorkspaceDialogOpen(true)}
            className="flex-1"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="size-4 mr-2" />
            )}
            {t('deleteWorkspace', { ns: 'settings' })}
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || isSaving}
            className="flex-1"
          >
            {isSaving && <Loader2 className="size-4 animate-spin mr-2" />}
            {t('save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </form>

      {/* Variable Input Dialog */}
      <VariableInputDialog
        open={variableDialogOpen}
        title={selectedPrompt?.name || ''}
        variableNames={
          selectedPrompt ? parsePromptVariables(selectedPrompt.content) : []
        }
        variables={promptVariables}
        renderedPreview={
          selectedPrompt
            ? renderPrompt(selectedPrompt.content, promptVariables)
            : undefined
        }
        onClose={() => {
          setVariableDialogOpen(false);
          setSelectedPrompt(null);
          setPromptVariables({});
        }}
        onSubmit={handleVariableDialogSubmit}
        onVariableChange={(name, value) =>
          setPromptVariables((prev) => ({ ...prev, [name]: value }))
        }
      />

      {/* Clear All Chats Confirmation Dialog */}
      <Dialog
        open={clearChatsDialogOpen}
        onOpenChange={setClearChatsDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('clearAllChats', { ns: 'settings' })}</DialogTitle>
            <DialogDescription>
              {t('confirmClearAllChats', { ns: 'settings' })}
            </DialogDescription>
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
            <DialogDescription>
              {t('confirmDeleteWorkspace', { ns: 'settings' })}
            </DialogDescription>
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
