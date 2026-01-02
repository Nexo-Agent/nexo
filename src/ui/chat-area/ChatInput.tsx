import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Square, Wrench, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { Textarea } from '@/ui/atoms/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/atoms/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/atoms/dropdown-menu';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { isVisionModel } from '@/lib/model-utils';
import { useChatInput } from '@/hooks/useChatInput';
import { useMessages } from '@/hooks/useMessages';
import { useSlashCommand } from '@/hooks/useSlashCommand';
import { SlashCommandDropdown } from './SlashCommandDropdown';
import { VariableInputDialog } from './VariableInputDialog';
import { parsePromptVariables, renderPrompt } from '@/lib/prompt-utils';
import type { Prompt } from '@/store/types';

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
  const { t } = useTranslation(['chat', 'common', 'settings']);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const llmConnections = useAppSelector(
    (state) => state.llmConnections.llmConnections
  );

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
    isLoading,
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
  const mcpConnections = useAppSelector(
    (state) => state.mcpConnections.mcpConnections
  );

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
  const { streamingMessageId, handleStopStreaming } =
    useMessages(selectedChatId);

  const isStreaming = !!streamingMessageId;

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

  const selectedConnection = selectedLLMConnectionId
    ? llmConnections.find((conn) => conn.id === selectedLLMConnectionId)
    : null;
  const availableModels = selectedConnection?.models || [];
  const selectedModelName = selectedModel
    ? availableModels.find((m) => m.id === selectedModel)?.name
    : null;

  const supportsVision = isVisionModel(selectedModelName);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 40; // Min height in pixels
      const maxHeight = 200; // Max height in pixels (about 8-10 lines)
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
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

    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      if (slashCommand.isActive && slashCommand.filteredPrompts.length > 0) {
        return;
      }
      e.preventDefault();
      onSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...attachedFiles, ...files];
      handleFileUpload(newFiles);
    }
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

  return (
    <>
      <div className="bg-background">
        {/* Streaming timeout countdown - sticky at top of input area */}
        {isStreaming &&
          timeLeft !== null &&
          timeLeft !== undefined &&
          timeLeft > 0 && (
            <div className="mx-auto max-w-3xl px-4 pb-2">
              <div
                className={`rounded-lg px-3 py-1.5 text-xs border flex items-center justify-between ${
                  timeLeft! <= 10
                    ? 'bg-red-500/10 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30'
                    : timeLeft! <= 30
                      ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30'
                      : 'bg-green-500/10 dark:bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30'
                }`}
              >
                <span className="font-medium">
                  ⏱️ {t('streamingTimeout')} {timeLeft!}s
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
          <div className="rounded-2xl border border-border bg-background shadow-sm p-3">
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
                placeholder={t('enterMessage')}
                disabled={disabled || isLoading}
                className="w-full min-h-[40px] max-h-[200px] resize-none leading-relaxed text-base py-0 px-2 border-0 rounded-lg outline-none flex content-center ring-0 shadow-none focus:ring-0 focus:shadow-none"
                rows={1}
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
                    disabled={disabled}
                    className={cn(
                      'h-7 w-7 text-muted-foreground hover:text-foreground border-0 shadow-none relative',
                      activeTools.length > 0 &&
                        'text-primary hover:text-primary'
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
                        <div className="font-semibold text-sm">
                          {t('activeTools', { ns: 'chat' }) || 'Active Tools'}
                          <span className="ml-1.5 text-muted-foreground font-normal">
                            ({activeTools.length})
                          </span>
                        </div>
                        {activeTools.length > 0 ? (
                          <div className="space-y-1.5 max-h-60 overflow-y-auto">
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
                    <DropdownMenuCheckboxItem
                      checked={isThinkingEnabled}
                      onCheckedChange={handleThinkingToggle}
                    >
                      Enable Thinking
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Reasoning Effort</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={reasoningEffort}
                      onValueChange={(val) =>
                        handleReasoningEffortChange(
                          val as 'low' | 'medium' | 'high'
                        )
                      }
                    >
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
              </div>

              {/* Right side: Model Selector and Send Button */}
              <div className="flex items-center gap-2">
                {/* Model Selector */}
                <Select
                  value={selectedModel || ''}
                  onValueChange={(val) => {
                    handleModelChange(val || undefined);
                  }}
                  disabled={
                    !selectedLLMConnectionId ||
                    availableModels.length === 0 ||
                    disabled ||
                    isLoading
                  }
                >
                  <SelectTrigger className="h-7 w-auto min-w-[120px] text-sm border-none bg-background hover:bg-muted/50 shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <SelectValue
                      placeholder={t('selectModel', { ns: 'settings' })}
                    >
                      {selectedModelName ||
                        t('selectModel', { ns: 'settings' })}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        {!selectedLLMConnectionId
                          ? t('pleaseSelectLLMConnection', { ns: 'settings' })
                          : t('noModels', { ns: 'chat' })}
                      </div>
                    ) : (
                      availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                {/* Send/Stop Button */}
                <Button
                  onClick={isStreaming ? handleStopStreaming : onSend}
                  disabled={
                    isStreaming ? false : !input.trim() || disabled || isLoading
                  }
                  size="icon"
                  variant={isStreaming ? 'destructive' : 'ghost'}
                  className={cn(
                    'h-7 w-7 shrink-0',
                    isStreaming
                      ? 'hover:bg-destructive/90'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  aria-label={
                    isStreaming
                      ? t('stopStreaming', { ns: 'chat' })
                      : t('sendMessage', { ns: 'common' })
                  }
                >
                  {isStreaming ? (
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
