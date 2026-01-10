import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  XCircle,
  Trash2,
  Search,
  Info,
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
  SelectSeparator,
} from '@/ui/atoms/select';
import { ScrollArea } from '@/ui/atoms/scroll-area';
import { Switch } from '@/ui/atoms/switch';
import { Separator } from '@/ui/atoms/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/ui/atoms/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/atoms/dialog/component';
import { cn } from '@/lib/utils';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import { SlashCommandDropdown } from '@/ui/molecules/SlashCommandDropdown';
import { VariableInputDialog } from '@/ui/molecules/VariableInputDialog';
import {
  parsePromptVariables,
  renderPrompt,
} from '@/features/settings/lib/prompt-utils';
import type { Workspace, WorkspaceSettings } from '../types';
import type { LLMConnection, MCPServerConnection, Prompt } from '@/app/types';

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
  const [maxAgentIterations, setMaxAgentIterations] = useState<number>(
    initialSettings?.maxAgentIterations ?? 25
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

  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const filteredLLMConnections = useMemo(() => {
    if (!modelSearchTerm) return llmConnections;

    return llmConnections
      .map((conn) => ({
        ...conn,
        models: (conn.models || []).filter(
          (m) =>
            m.name?.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
        ),
      }))
      .filter((conn) => conn.models && conn.models.length > 0);
  }, [llmConnections, modelSearchTerm]);

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
        <div className="flex-1 overflow-hidden px-6 py-4 min-h-0">
          <ScrollArea className="h-full">
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('systemMessageDescription')}
                      </TooltipContent>
                    </Tooltip>
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
                      rows={12}
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
                <div className="space-y-2 w-full">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="default-model">{t('defaultModel')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="size-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('defaultModelDescription')}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={
                      llmConnectionId && defaultModel
                        ? `${llmConnectionId}::${defaultModel}`
                        : '__none__'
                    }
                    onValueChange={(value) => {
                      if (value === '__none__') {
                        setLlmConnectionId(undefined);
                        setDefaultModel('');
                      } else {
                        const [connId, ...modelIdParts] = value.split('::');
                        // Re-join just in case model ID contains "::" (unlikely but safe)
                        const modelId = modelIdParts.join('::');
                        setLlmConnectionId(connId);
                        setDefaultModel(modelId);
                      }
                    }}
                    onOpenChange={(open) => {
                      if (!open) {
                        setModelSearchTerm('');
                      }
                    }}
                  >
                    <SelectTrigger
                      id="default-model"
                      className="w-full"
                      hideIcon={true}
                    >
                      <SelectValue placeholder={t('selectDefaultModel')}>
                        {(() => {
                          if (!llmConnectionId || !defaultModel) {
                            return t('noDefaultModel');
                          }
                          const conn = llmConnections.find(
                            (c) => c.id === llmConnectionId
                          );
                          if (!conn) return t('noDefaultModel');
                          const model = Array.isArray(conn.models)
                            ? conn.models.find((m) => m?.id === defaultModel)
                            : null;
                          return (
                            <span>
                              <span className="font-semibold mr-2 text-muted-foreground">
                                {conn.name}:
                              </span>
                              {model?.name || defaultModel}
                            </span>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent
                      hideScrollButtons={true}
                      position="popper"
                      sideOffset={5}
                      className="max-h-[min(400px,var(--radix-select-content-available-height))]"
                      header={
                        llmConnections.length > 0 ? (
                          <div
                            className="p-2 bg-popover border-b"
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative">
                              <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                              <Input
                                placeholder={t('searchModels', {
                                  ns: 'settings',
                                })}
                                value={modelSearchTerm}
                                onChange={(e) =>
                                  setModelSearchTerm(e.target.value)
                                }
                                className="pl-8 h-9 border-none shadow-none focus-visible:ring-0"
                                onKeyDown={(e: React.KeyboardEvent) => {
                                  // Prevent Radix Select from intercepting key events
                                  e.stopPropagation();
                                }}
                                autoFocus
                              />
                            </div>
                          </div>
                        ) : null
                      }
                    >
                      <SelectItem value="__none__">
                        {t('noDefaultModel')}
                      </SelectItem>
                      {filteredLLMConnections.length === 0 &&
                      llmConnections.length > 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          {t('noModelsFound', {
                            ns: 'settings',
                            defaultValue: 'No models found',
                          })}
                        </div>
                      ) : (
                        filteredLLMConnections.map((conn, index) => {
                          if (
                            !conn.models ||
                            !Array.isArray(conn.models) ||
                            conn.models.length === 0
                          ) {
                            return null;
                          }

                          return (
                            <React.Fragment key={conn.id}>
                              {index > 0 && (
                                <SelectSeparator className="my-1" />
                              )}
                              <SelectGroup>
                                <SelectLabel className="px-3 py-2 text-[10px] uppercase tracking-widest font-extrabold text-foreground bg-muted/40 border-y border-border/50 mt-1 mb-1 first:mt-0">
                                  {conn.name} ({conn.provider})
                                </SelectLabel>
                                {conn.models.map((model) => {
                                  if (!model || !model.id) return null;
                                  return (
                                    <SelectItem
                                      key={`${conn.id}::${model.id}`}
                                      value={`${conn.id}::${model.id}`}
                                    >
                                      {model.name || model.id}
                                    </SelectItem>
                                  );
                                })}
                              </SelectGroup>
                            </React.Fragment>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label>{t('mcpServerConnectionsLabel')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('mcpConnectionsDescription')}
                        </TooltipContent>
                      </Tooltip>
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="size-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t('streamModeDescription', {
                            ns: 'settings',
                          })}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      id="stream-enabled"
                      checked={streamEnabled}
                      onCheckedChange={setStreamEnabled}
                    />
                  </div>
                </div>

                <div className="space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor="max-iterations">
                          Agent Max Iterations
                        </Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            Số lần tối đa Agent có thể lặp (gọi Tool) trong một
                            yêu cầu.
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Giá trị mặc định là 25. Tăng giá trị này nếu Agent cần
                        giải quyết các tác vụ phức tạp hơn.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id="max-iterations"
                        type="number"
                        min={1}
                        max={100}
                        value={maxAgentIterations}
                        onChange={(e) =>
                          setMaxAgentIterations(parseInt(e.target.value) || 1)
                        }
                        className="w-20 h-8 text-right"
                      />
                    </div>
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
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row shrink-0 px-6 pt-4 pb-6 border-t border-border justify-between">
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
        </div>
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
