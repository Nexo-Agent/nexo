import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConnections } from "@/contexts/ConnectionsContext";
import type { Workspace } from "@/components/WorkspaceSelector";

export interface WorkspaceSettings {
  id: string;
  name: string;
  systemMessage: string;
  mcpConnectionIds?: string[];
  llmConnectionId?: string;
}

interface WorkspaceSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace;
  settings?: WorkspaceSettings;
  onSave: (settings: WorkspaceSettings) => void;
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
  workspace,
  settings,
  onSave,
}: WorkspaceSettingsProps) {
  const { llmConnections, mcpConnections } = useConnections();
  const [name, setName] = useState(workspace.name);
  const [systemMessage, setSystemMessage] = useState(
    settings?.systemMessage || ""
  );
  const [mcpConnectionIds, setMcpConnectionIds] = useState<string[]>(
    settings?.mcpConnectionIds || []
  );
  const [llmConnectionId, setLlmConnectionId] = useState<string | undefined>(
    settings?.llmConnectionId
  );

  useEffect(() => {
    if (open) {
      setName(workspace.name);
      setSystemMessage(settings?.systemMessage || "");
      setMcpConnectionIds(settings?.mcpConnectionIds || []);
      setLlmConnectionId(settings?.llmConnectionId);
    }
  }, [open, workspace, settings]);

  const handleMcpConnectionToggle = (connectionId: string) => {
    setMcpConnectionIds((prev) =>
      prev.includes(connectionId)
        ? prev.filter((id) => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSettings: WorkspaceSettings = {
      id: workspace.id,
      name: name.trim(),
      systemMessage: systemMessage.trim(),
      mcpConnectionIds: mcpConnectionIds.length > 0 ? mcpConnectionIds : undefined,
      llmConnectionId: llmConnectionId || undefined,
    };
    onSave(newSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SettingsIcon className="size-5" />
              Cài đặt Workspace
            </DialogTitle>
            <DialogDescription>
              Cấu hình workspace: {workspace.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 w-full">
              <Label htmlFor="workspace-name">Tên workspace</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên workspace"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="system-message">System Message</Label>
              <Textarea
                id="system-message"
                value={systemMessage}
                onChange={(e) => setSystemMessage(e.target.value)}
                placeholder="Nhập system message cho workspace này..."
                className="w-full min-h-32"
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                System message sẽ được sử dụng làm context cho các cuộc trò chuyện trong workspace này
              </p>
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="llm-connection">LLM Connection</Label>
              <Select
                value={llmConnectionId}
                onValueChange={(value) => setLlmConnectionId(value || undefined)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Chọn LLM connection (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {llmConnections.length === 0 ? (
                    <SelectLabel className="text-muted-foreground">
                      Chưa có LLM connection nào
                    </SelectLabel>
                  ) : (
                    llmConnections.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.name} ({conn.provider})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                LLM connection được sử dụng cho workspace này (optional)
              </p>
            </div>
            <div className="space-y-2 w-full">
              <Label>MCP Server Connections</Label>
              {mcpConnections.length === 0 ? (
                <div className="text-sm text-muted-foreground py-2">
                  Chưa có MCP connection nào
                </div>
              ) : (
                <ScrollArea className="h-48 w-full rounded-md border p-4">
                  <div className="space-y-3">
                    {mcpConnections.map((conn) => (
                      <div
                        key={conn.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`mcp-${conn.id}`}
                          checked={mcpConnectionIds.includes(conn.id)}
                          onCheckedChange={() => handleMcpConnectionToggle(conn.id)}
                        />
                        <label
                          htmlFor={`mcp-${conn.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <span>{conn.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({conn.type})
                            </span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <p className="text-xs text-muted-foreground">
                Chọn một hoặc nhiều MCP server connections cho workspace này (optional)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

