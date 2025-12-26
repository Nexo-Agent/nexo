import React, { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HeadersEditor } from "@/components/settings/HeadersEditor";
import { useConnections } from "@/contexts/ConnectionsContext";
import {
  createMCPServerConnection,
  updateMCPServerConnection,
  deleteMCPServerConnection,
} from "@/lib/db-api";

export interface MCPServerConnection {
  id: string;
  name: string;
  url: string;
  type: "sse" | "stdio" | "http-streamable";
  headers?: string; // JSON string format
}

export function MCPServerConnections() {
  const { mcpConnections, refreshConnections } = useConnections();
  const [editingConnection, setEditingConnection] = useState<MCPServerConnection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdd = () => {
    setEditingConnection(null);
    setDialogOpen(true);
  };

  const handleEdit = (connection: MCPServerConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMCPServerConnection(id);
      // Refresh connections from database
      await refreshConnections();
    } catch (error) {
      console.error("Error deleting MCP connection:", error);
      alert("Không thể xóa connection");
    }
  };

  const handleSave = async (connection: Omit<MCPServerConnection, "id">) => {
    try {
      const headers = connection.headers || "{}";

      if (editingConnection) {
        // Update existing connection
        await updateMCPServerConnection(editingConnection.id, {
          name: connection.name,
          url: connection.url,
          type: connection.type,
          headers: headers,
        });
      } else {
        // Create new connection
        const id = Date.now().toString();
        await createMCPServerConnection(
          id,
          connection.name,
          connection.url,
          connection.type,
          headers
        );
      }
      // Refresh connections from database
      await refreshConnections();
      setDialogOpen(false);
      setEditingConnection(null);
    } catch (error) {
      console.error("Error saving MCP connection:", error);
      alert("Không thể lưu connection");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">MCP Server Connections</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các kết nối MCP server của bạn
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          Thêm connection
        </Button>
      </div>

      {mcpConnections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Chưa có connection nào
          </p>
          <Button onClick={handleAdd} variant="outline">
            <Plus className="mr-2 size-4" />
            Thêm connection đầu tiên
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {mcpConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{connection.name}</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {connection.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connection.url}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(connection)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(connection.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <MCPServerConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
      />
    </div>
  );
}

interface MCPServerConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: MCPServerConnection | null;
  onSave: (connection: Omit<MCPServerConnection, "id">) => void;
}

function MCPServerConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
}: MCPServerConnectionDialogProps) {
  const [name, setName] = useState(connection?.name || "");
  const [url, setUrl] = useState(connection?.url || "");
  const [type, setType] = useState<"sse" | "stdio" | "http-streamable">(
    connection?.type || "sse"
  );
  const [headers, setHeaders] = useState(connection?.headers || "");

  React.useEffect(() => {
    if (connection) {
      setName(connection.name);
      setUrl(connection.url);
      setType(connection.type);
      setHeaders(connection.headers || "");
    } else {
      setName("");
      setUrl("");
      setType("sse");
      setHeaders("");
    }
  }, [connection, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && url.trim()) {
      onSave({
        name: name.trim(),
        url: url.trim(),
        type,
        headers: headers?.trim() || undefined,
      });
      onOpenChange(false);
    }
  };

  const handleHeadersChange = (value: string | undefined) => {
    setHeaders(value || "");
  };

  const showHeaders = type === "sse" || type === "http-streamable";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {connection ? "Sửa connection" : "Thêm connection mới"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối MCP server của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 w-full">
              <Label htmlFor="mcp-name">Tên connection</Label>
              <Input
                id="mcp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: MCP Server Production"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="mcp-type">Type</Label>
              <Select
                value={type}
                onValueChange={(value: "sse" | "stdio" | "http-streamable") =>
                  setType(value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sse">SSE (Server-Sent Events)</SelectItem>
                  <SelectItem value="stdio">STDIO</SelectItem>
                  <SelectItem value="http-streamable">HTTP Streamable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="mcp-url">URL</Label>
              <Input
                id="mcp-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={
                  type === "stdio"
                    ? "/path/to/command hoặc command"
                    : "http://localhost:3000/mcp"
                }
                className="w-full"
                required
              />
            </div>
            {showHeaders && (
              <div className="w-full">
                <HeadersEditor value={headers} onChange={handleHeadersChange} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || !url.trim()}>
              {connection ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

