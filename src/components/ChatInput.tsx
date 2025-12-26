import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConnections } from "@/contexts/ConnectionsContext";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  selectedLLMConnectionId?: string;
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  toolsEnabled?: boolean;
  onToolsToggle?: (enabled: boolean) => void;
  onFileUpload?: (files: File[]) => void;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  selectedLLMConnectionId,
  selectedModel,
  onModelChange,
  toolsEnabled = false,
  onToolsToggle,
  onFileUpload,
}: ChatInputProps) {
  const { llmConnections } = useConnections();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Get models from selected LLM connection
  const selectedConnection = selectedLLMConnectionId
    ? llmConnections.find((conn) => conn.id === selectedLLMConnectionId)
    : null;
  const availableModels = selectedConnection?.models || [];

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 40; // Min height in pixels
      const maxHeight = 200; // Max height in pixels (about 8-10 lines)
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd+A / Ctrl+A for select all - handled by Textarea component
    if ((e.metaKey || e.ctrlKey) && (e.key === "a" || e.key === "A")) {
      return; // Let Textarea component handle select all
    }
    
    // Enter to send, Shift+Enter for new line
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFiles = [...attachedFiles, ...files];
      setAttachedFiles(newFiles);
      onFileUpload?.(newFiles);
    }
    // Reset input để có thể chọn lại cùng file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index);
    setAttachedFiles(newFiles);
    onFileUpload?.(newFiles);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto max-w-3xl px-4 py-4">
        {/* Options Row */}
        <div className="mb-3 flex items-center gap-4 text-sm">
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            <Label htmlFor="model-select" className="text-xs text-muted-foreground whitespace-nowrap">
              Model:
            </Label>
            <Select
              value={selectedModel || ""}
              onValueChange={(value) => onModelChange?.(value || undefined)}
              disabled={!selectedLLMConnectionId || availableModels.length === 0}
            >
              <SelectTrigger id="model-select" className="h-7 w-[200px] text-xs">
                <SelectValue placeholder={
                  !selectedLLMConnectionId
                    ? "Chọn LLM connection trước"
                    : availableModels.length === 0
                    ? "Chưa có models"
                    : "Chọn model"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableModels.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {!selectedLLMConnectionId
                      ? "Vui lòng chọn LLM connection trong workspace settings"
                      : "Chưa có models. Vui lòng test connection trong settings."}
                  </div>
                ) : (
                  availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs">
                      {model.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Tools Toggle */}
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="tools-toggle" className="text-xs text-muted-foreground whitespace-nowrap cursor-pointer">
              Tools
            </Label>
            <Switch
              id="tools-toggle"
              checked={toolsEnabled}
              onCheckedChange={onToolsToggle}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Attached Files */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleUploadClick}
            disabled={disabled}
            className="shrink-0 mb-0"
            aria-label="Upload file"
          >
            <Paperclip className="size-4" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
            disabled={disabled}
            className="flex-1 min-h-[40px] max-h-[200px] resize-none leading-relaxed"
            rows={1}
          />
          <Button
            onClick={onSend}
            disabled={!value.trim() || disabled}
            size="icon"
            className="shrink-0 mb-0"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

