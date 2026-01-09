import { useRef, useEffect, useState, useMemo } from 'react';
import { Send, Paperclip, Square, Wrench, Brain, Search } from 'lucide-react';
import { Input } from '@/ui/atoms/input';
import {
  MAX_MESSAGE_LENGTH,
  MAX_FILE_SIZE,
  ALLOWED_FILE_TYPES,
} from '@/lib/constants';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/ui/atoms/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/atoms/dropdown-menu';
import { useGetLLMConnectionsQuery } from '@/features/llm';
import { useGetMCPConnectionsQuery } from '@/features/mcp';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import type { LLMConnection } from '@/features/llm/types';
import { cn, formatFileSize } from '@/lib/utils';
import { showError } from '@/features/notifications/state/notificationSlice';
import { isVisionModel } from '@/features/llm/lib/model-utils';
import { useChatInput } from '../../hooks/useChatInput';
import { useMessages } from '../../hooks/useMessages';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import { useAgentMention } from '@/features/chat/hooks/useAgentMention';
import { useComponentPerformance } from '@/hooks/useComponentPerformance';
import { SlashCommandDropdown } from '@/ui/molecules/SlashCommandDropdown';
import { AgentMentionDropdown } from '@/features/agent';
import { VariableInputDialog } from '@/ui/molecules/VariableInputDialog';
import {
  parsePromptVariables,
  renderPrompt,
} from '@/features/settings/lib/prompt-utils';
import type { Prompt, InstalledAgent } from '@/app/types';

interface ChatInputProps {
  selectedWorkspaceId: string | null;
  selectedChatId: string | null;
  selectedLLMConnectionId?: string;
  onSend: () => void;
  disabled?: boolean;
  dropdownDirection?: 'up' | 'down';
  timeLeft?: number | null;
  streamingError?: { messageId: string; error: string; canRetry: boolean };
  onRetryStreaming?: () => void;
}

export function ChatInput({
  selectedWorkspaceId,
  selectedChatId,
  selectedLLMConnectionId,
  onSend,
  disabled = false,
  dropdownDirection = 'down',
  timeLeft,
  streamingError,
  onRetryStreaming,
}: ChatInputProps) {
  // Track render performance
  useComponentPerformance({
    componentName: 'ChatInput',
    threshold: 50,
  });
  const { t } = useTranslation(['chat', 'common', 'settings']);
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const { data: llmConnections = [] } = useGetLLMConnectionsQuery();

  // State for variable input dialog
  const [variableDialogOpen, setVariableDialogOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptVariables, setPromptVariables] = useState<
    Record<string, string>
  >({});

  // Use chat input hook
  const {
    input,
    selectedModel,
    attachedFiles,
    handleInputChange,
    handleModelChange,
    handleFileUpload,
    isThinkingEnabled,
    reasoningEffort,
    handleThinkingToggle,
    handleReasoningEffortChange,
  } = useChatInput(selectedWorkspaceId);

  // Get workspace settings and MCP connections for tools
  const workspaceSettings = useAppSelector((state) =>
    selectedWorkspaceId
      ? state.workspaceSettings.settingsByWorkspaceId[selectedWorkspaceId]
      : null
  );
  const { data: mcpConnections = [] } = useGetMCPConnectionsQuery();

  // Calculate active tools from workspace settings
  const activeTools = (() => {
    if (!workspaceSettings?.mcpToolIds) return [];

    const toolsList: {
      name: string;
      serverName: string;
      description?: string;
    }[] = [];
    const toolIdMap = workspaceSettings.mcpToolIds;

    Object.entries(toolIdMap).forEach(([toolName, connectionId]) => {
      const connection = mcpConnections.find(
        (conn) => conn.id === connectionId
      );
      if (connection && connection.status === 'connected') {
        const tool = connection.tools?.find((t) => t.name === toolName);
        toolsList.push({
          name: toolName,
          serverName: connection.name,
          description: tool?.description,
        });
      }
    });

    return toolsList;
  })();

  // Use messages hook for streaming state
  const { handleStopStreaming, isStreaming, isAgentStreaming } =
    useMessages(selectedChatId);

  // If streaming is due to agent card, don't show streaming UI in input
  const effectiveIsStreaming = isStreaming && !isAgentStreaming;

  // Insert prompt content into input, replacing the slash command
  const insertPromptContent = (content: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Only replace if input starts with "/"
    if (!input.startsWith('/')) return;

    // Get text after the slash command (if any)
    const afterSlash = input.substring(1);
    const spaceIndex = afterSlash.indexOf(' ');
    const additionalText =
      spaceIndex === -1 ? '' : afterSlash.substring(spaceIndex + 1);

    // Replace slash command with prompt content
    const newInput = content + (additionalText ? ' ' + additionalText : '');
    handleInputChange(newInput);

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
    input,
    onSelectPrompt: handleSelectPrompt,
  });

  const handleSelectAgent = (agent: InstalledAgent) => {
    // query is what user typed after @
    const queryLength = agentMention.query.length;

    const suffix = input.substring(1 + queryLength);
    // Add space after ID
    const newInput = `@${agent.manifest.id} ${suffix.trimStart()}`;

    handleInputChange(newInput);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = agent.manifest.id.length + 2; // @ + id + space
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);

    agentMention.close();
  };

  const agentMention = useAgentMention({
    input,
    onSelectAgent: handleSelectAgent,
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

  // Find current connection and model name
  const { currentConnection, currentModelName } = (() => {
    if (!selectedModel) {
      const conn = selectedLLMConnectionId
        ? llmConnections.find((conn) => conn.id === selectedLLMConnectionId)
        : null;
      return { currentConnection: conn, currentModelName: null };
    }

    let connId = selectedLLMConnectionId;
    let modelId = selectedModel;

    if (selectedModel.includes('::')) {
      const [parsedConnId, ...modelIdParts] = selectedModel.split('::');
      connId = parsedConnId;
      modelId = modelIdParts.join('::');
    }

    const conn = llmConnections.find((c) => c.id === connId);
    const model = conn?.models?.find((m) => m.id === modelId);

    return {
      currentConnection: conn,
      currentModelName: model?.name || modelId,
    };
  })();

  const supportsVision = isVisionModel(currentModelName);

  // Use backend capabilities as single source of truth
  const currentModel = (() => {
    if (!selectedModel) return null;

    let connId = selectedLLMConnectionId;
    let modelId = selectedModel;

    if (selectedModel.includes('::')) {
      const [parsedConnId, ...modelIdParts] = selectedModel.split('::');
      connId = parsedConnId;
      modelId = modelIdParts.join('::');
    }

    const conn = llmConnections.find((c) => c.id === connId);
    return conn?.models?.find((m) => m.id === modelId);
  })();

  const supportsToolCalling = currentModel?.supportsTools ?? false;
  const supportsThinking = currentModel?.supportsThinking ?? false;

  const [modelSearchTerm, setModelSearchTerm] = useState('');

  const filteredLLMConnections = useMemo(() => {
    if (!modelSearchTerm) return llmConnections;

    return llmConnections
      .map((conn: LLMConnection) => ({
        ...conn,
        models: (conn.models || []).filter(
          (m) =>
            m.name?.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
            m.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
        ),
      }))
      .filter((conn) => conn.models && conn.models.length > 0);
  }, [llmConnections, modelSearchTerm]);

  useEffect(() => {
    // Note: We use JS resize + debounce instead of CSS `field-sizing: content`
    // because `field-sizing` is not yet supported in WebKit (Safari/Tauri macOS).
    // The CSS Grid hack approach (textarea over hidden div) doubles DOM nodes
    // and doesn't offer better performance than this debounced JS solution.
    const resize = () => {
      const textarea = textareaRef.current;
      if (textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const minHeight = 40; // Min height in pixels
        const maxHeight = 200; // Max height in pixels (about 8-10 lines)
        const newHeight = Math.max(
          minHeight,
          Math.min(scrollHeight, maxHeight)
        );
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
      }
    };

    // Immediate resize if input is cleared
    if (!input) {
      resize();
      return;
    }

    // Debounce resize to prevent lag with large input
    const timer = setTimeout(resize, 20);
    return () => clearTimeout(timer);
  }, [input]);

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

    if (agentMention.isActive) {
      const handled = agentMention.handleKeyDown(e);
      if (handled) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        agentMention.close();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (slashCommand.isActive && slashCommand.filteredPrompts.length > 0) {
        return;
      }
      if (agentMention.isActive && agentMention.filteredAgents.length > 0) {
        return;
      }
      e.preventDefault();
      onSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles: File[] = [];

      for (const file of files) {
        // Validate size
        if (file.size > MAX_FILE_SIZE) {
          dispatch(
            showError(
              t('fileTooLarge', {
                size: formatFileSize(file.size),
                max: formatFileSize(MAX_FILE_SIZE),
                ns: 'chat',
              })
            )
          );
          continue;
        }

        // Validate type
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          dispatch(
            showError(
              t('fileTypeNotSupported', { type: file.type, ns: 'chat' })
            )
          );
          continue;
        }

        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        const newFiles = [...attachedFiles, ...validFiles];
        handleFileUpload(newFiles);
      }
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index);
    handleFileUpload(newFiles);
  };

  const handleUploadClick = () => {
    if (supportsVision) {
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (!supportsVision && attachedFiles.length > 0) {
      handleFileUpload([]);
    }
  }, [attachedFiles.length, handleFileUpload, supportsVision]);

  // Handle paste event (images)
  const handlePaste = (e: React.ClipboardEvent) => {
    // Only handle if vision is supported
    if (!supportsVision) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Validate size
          if (file.size > MAX_FILE_SIZE) {
            dispatch(
              showError(
                t('fileTooLarge', {
                  size: formatFileSize(file.size),
                  max: formatFileSize(MAX_FILE_SIZE),
                  ns: 'chat',
                })
              )
            );
            continue;
          }
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      // If we found images, prevent default to handle them manually
      // Note: This might prevent text pasting if copied together (unlikely combo)
      // e.preventDefault();
      handleFileUpload([...attachedFiles, ...files]);
    }
  };

  // Drag & Drop logic
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!supportsVision) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!supportsVision) return;

    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith('image/')
    );

    if (files.length > 0) {
      const validFiles: File[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          dispatch(
            showError(
              t('fileTooLarge', {
                size: formatFileSize(file.size),
                max: formatFileSize(MAX_FILE_SIZE),
                ns: 'chat',
              })
            )
          );
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > 0) {
        handleFileUpload([...attachedFiles, ...validFiles]);
      }
    }
  };

  return (
    <>
      <div className="bg-background">
        {/* Streaming timeout countdown - sticky at top of input area */}
        {effectiveIsStreaming &&
          timeLeft !== null &&
          timeLeft !== undefined &&
          timeLeft > 0 && (
            <div className="mx-auto max-w-3xl px-4 pb-2">
              <div
                className={`rounded-lg px-3 py-1.5 text-xs border flex items-center justify-between ${
                  timeLeft <= 10
                    ? 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                    : timeLeft <= 30
                      ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30'
                      : 'bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
                }`}
              >
                <span className="font-medium">
                  ⏱️ {t('streamingTimeout')} {timeLeft}s
                </span>
              </div>
            </div>
          )}

        {/* Streaming error message */}
        {streamingError && (
          <div className="mx-auto max-w-3xl px-4 pb-2">
            <div className="rounded-lg bg-destructive/10 px-3 py-2 border border-destructive/30 flex items-center justify-between">
              <span className="text-xs text-destructive font-medium">
                ❌ {t('streamingTimeoutError')}
              </span>
              {onRetryStreaming && (
                <button
                  onClick={onRetryStreaming}
                  className="ml-2 px-2 py-0.5 text-xs bg-destructive/20 hover:bg-destructive/30 rounded transition-colors"
                >
                  🔄 {t('retry')}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mx-auto max-w-3xl px-4 py-3">
          <div
            className={cn(
              'rounded-2xl border border-border bg-muted/20 shadow-sm p-3 relative transition-colors',
              isDragging && 'border-primary ring-2 ring-primary/20 bg-muted/50'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag Indicator Overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Paperclip className="h-8 w-8 animate-bounce" />
                  <span className="font-medium">
                    {t('dropFiles', {
                      ns: 'chat',
                      defaultValue: 'Drop images here',
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground"
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
              disabled={disabled || !supportsVision}
            />

            {/* Row 1: Text Input Only */}
            <div className="mb-0 relative" ref={inputContainerRef}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={t('enterMessage')}
                disabled={disabled}
                className="w-full min-h-[40px] max-h-[200px] resize-none leading-relaxed text-base py-0 px-2 border-0 rounded-lg outline-none flex content-center ring-0 shadow-none focus:ring-0 focus:shadow-none bg-transparent dark:bg-transparent"
                rows={1}
                data-tour="chat-input-textarea"
              />
              {/* Slash Command Dropdown */}
              {slashCommand.isActive &&
                slashCommand.filteredPrompts.length > 0 && (
                  <SlashCommandDropdown
                    prompts={slashCommand.filteredPrompts}
                    selectedIndex={slashCommand.selectedIndex}
                    onSelect={slashCommand.handleSelect}
                    direction={dropdownDirection}
                  />
                )}
              {/* Agent Mention Dropdown */}
              {agentMention.isActive &&
                agentMention.filteredAgents.length > 0 && (
                  <AgentMentionDropdown
                    agents={agentMention.filteredAgents}
                    selectedIndex={agentMention.selectedIndex}
                    onSelect={agentMention.handleSelect}
                    direction={dropdownDirection}
                    position={{ top: 0, left: 0 }} // Position handled by dropdown logic mostly
                  />
                )}
            </div>

            {/* Row 2: Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleUploadClick}
                  disabled={disabled || !supportsVision}
                  className="h-7 w-7 text-muted-foreground hover:text-foreground border-0 shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={t('uploadFile', { ns: 'common' })}
                  title={
                    supportsVision
                      ? t('uploadFile', { ns: 'common' })
                      : t('visionNotSupported', { ns: 'chat' }) ||
                        'Image upload not supported for this model'
                  }
                >
                  <Paperclip className="size-4" />
                </Button>

                {/* Tools Button with Hover Tooltip */}
                <div className="relative group">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || !supportsToolCalling}
                    className={cn(
                      'h-7 w-7 text-muted-foreground hover:text-foreground border-0 shadow-none relative',
                      activeTools.length > 0 &&
                        'text-primary hover:text-primary',
                      !supportsToolCalling && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={t('activeTools', { ns: 'chat' })}
                  >
                    <Wrench className="size-4" />
                  </Button>

                  {/* Hover Tooltip Panel */}
                  <div className="absolute bottom-full left-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    {/* Invisible bridge to keep hover active */}
                    <div className="absolute top-0 left-0 right-0 h-3 translate-y-full"></div>
                    <div className="bg-popover text-popover-foreground rounded-md border shadow-lg w-80">
                      <div className="space-y-2 p-3">
                        {!supportsToolCalling && (
                          <div className="mb-2 rounded bg-yellow-500/10 p-2 text-xs text-yellow-600 dark:text-yellow-400">
                            Model does not support tool calling
                          </div>
                        )}
                        <div className="font-semibold text-sm">
                          {t('activeTools', { ns: 'chat' }) || 'Active Tools'}
                          <span className="ml-1.5 text-muted-foreground font-normal">
                            ({activeTools.length})
                          </span>
                        </div>
                        {activeTools.length > 0 ? (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {activeTools.map((tool, index) => (
                              <div
                                key={`${tool.name}-${index}`}
                                className="text-xs p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                              >
                                <div className="font-medium text-foreground">
                                  {tool.name}
                                </div>
                                <div className="text-muted-foreground text-[10px] mt-0.5">
                                  Server: {tool.serverName}
                                </div>
                                {tool.description && (
                                  <div className="text-muted-foreground mt-1 line-clamp-2">
                                    {tool.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground py-4 text-center">
                            {t('noActiveTools', { ns: 'chat' }) ||
                              'No active tools configured'}
                          </div>
                        )}
                      </div>
                      {/* Arrow */}
                      <div className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-popover"></div>
                    </div>
                  </div>
                </div>

                {/* Thinking Mode Toggle */}
                {supportsThinking && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        className={cn(
                          'h-7 w-7 text-muted-foreground hover:text-foreground border-0 shadow-none',
                          isThinkingEnabled && 'text-primary hover:text-primary'
                        )}
                        aria-label="Thinking Mode"
                      >
                        <Brain className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>Thinking Mode</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={isThinkingEnabled ? reasoningEffort : 'none'}
                        onValueChange={(val) => {
                          if (val === 'none') {
                            if (isThinkingEnabled) handleThinkingToggle();
                          } else {
                            if (!isThinkingEnabled) handleThinkingToggle();
                            handleReasoningEffortChange(
                              val as 'low' | 'medium' | 'high'
                            );
                          }
                        }}
                      >
                        <DropdownMenuRadioItem value="none">
                          None
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="low">
                          Low
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="medium">
                          Medium
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="high">
                          High
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Right side: Model Selector and Send Button */}
              <div className="flex items-center gap-2">
                {/* Character Counter */}
                {input.length > 0 && (
                  <div
                    className={cn(
                      'text-xs transition-colors',
                      input.length > MAX_MESSAGE_LENGTH
                        ? 'text-destructive'
                        : input.length > MAX_MESSAGE_LENGTH * 0.9
                          ? 'text-yellow-500'
                          : 'text-muted-foreground/50'
                    )}
                  >
                    {input.length.toLocaleString()} /{' '}
                    {MAX_MESSAGE_LENGTH.toLocaleString()}
                  </div>
                )}

                {/* Model Selector */}
                <Select
                  value={
                    selectedModel
                      ? selectedModel.includes('::')
                        ? selectedModel
                        : `${selectedLLMConnectionId}::${selectedModel}`
                      : ''
                  }
                  onValueChange={(val) => {
                    handleModelChange(val || undefined);
                  }}
                  onOpenChange={(open) => {
                    if (!open) {
                      setModelSearchTerm('');
                    }
                  }}
                  disabled={llmConnections.length === 0 || disabled}
                >
                  <SelectTrigger
                    className="h-7 w-auto min-w-[120px] text-sm border-none bg-transparent dark:bg-transparent hover:bg-muted/50 shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    data-tour="model-selector"
                    hideIcon={true}
                  >
                    <SelectValue
                      placeholder={t('selectModel', { ns: 'settings' })}
                    >
                      {currentModelName ? (
                        <div className="flex items-center gap-2">
                          {currentConnection && (
                            <span className="text-muted-foreground font-medium opacity-70">
                              {currentConnection.name}:
                            </span>
                          )}
                          <span>{currentModelName}</span>
                        </div>
                      ) : (
                        t('selectModel', { ns: 'settings' })
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    className="max-h-[min(400px,var(--radix-select-content-available-height))]"
                    hideScrollButtons={true}
                    position="popper"
                    sideOffset={5}
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
                              onKeyDown={(e) => {
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
                    {llmConnections.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {t('pleaseSelectLLMConnection', { ns: 'settings' })}
                      </div>
                    ) : filteredLLMConnections.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        {t('noModelsFound', {
                          ns: 'settings',
                          defaultValue: 'No models found',
                        })}
                      </div>
                    ) : (
                      filteredLLMConnections.map((conn: LLMConnection) => {
                        if (
                          !conn.models ||
                          !Array.isArray(conn.models) ||
                          conn.models.length === 0
                        ) {
                          return null;
                        }

                        return (
                          <div key={conn.id}>
                            <SelectGroup>
                              <SelectLabel className="px-3 py-2 text-[10px] uppercase tracking-widest font-extrabold text-foreground bg-muted/40 border-y border-border/50 mt-1 mb-1 first:mt-0">
                                {conn.name} ({conn.provider})
                              </SelectLabel>
                              {conn.models.map((model) => (
                                <SelectItem
                                  key={`${conn.id}::${model.id}`}
                                  value={`${conn.id}::${model.id}`}
                                >
                                  {model.name || model.id}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </div>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>

                {/* Send/Stop Button */}
                <Button
                  onClick={
                    input.trim()
                      ? onSend
                      : effectiveIsStreaming
                        ? handleStopStreaming
                        : undefined
                  }
                  disabled={
                    disabled || (!input.trim() && !effectiveIsStreaming)
                  }
                  size="icon"
                  className={cn(
                    'h-8 w-8 rounded-full transition-all shadow-sm',
                    input.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105'
                      : effectiveIsStreaming
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                  data-tour="send-message-btn"
                  aria-label={
                    effectiveIsStreaming && !input.trim()
                      ? t('stopStreaming', { ns: 'chat' })
                      : t('sendMessage', { ns: 'common' })
                  }
                >
                  {effectiveIsStreaming ? (
                    <Square className="size-4" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    </>
  );
}
