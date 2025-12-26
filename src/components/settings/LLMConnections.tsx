import React, { useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
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
import { useConnections } from "@/contexts/ConnectionsContext";
import { testConnectionAndFetchModels } from "@/lib/llm-api";
import { cn } from "@/lib/utils";

export interface LLMModel {
  id: string;
  name: string;
  created?: number;
  owned_by?: string;
}

export interface LLMConnection {
  id: string;
  name: string;
  baseUrl: string;
  provider: "openai" | "ollama";
  apiKey: string;
  models?: LLMModel[];
}

export function LLMConnections() {
  const { llmConnections, setLLMConnections } = useConnections();
  const [editingConnection, setEditingConnection] = useState<LLMConnection | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAdd = () => {
    setEditingConnection(null);
    setDialogOpen(true);
  };

  const handleEdit = (connection: LLMConnection) => {
    setEditingConnection(connection);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setLLMConnections(llmConnections.filter((conn) => conn.id !== id));
  };

  const handleSave = (connection: Omit<LLMConnection, "id">) => {
    if (editingConnection) {
      setLLMConnections(
        llmConnections.map((conn) =>
          conn.id === editingConnection.id
            ? { ...connection, id: editingConnection.id }
            : conn
        )
      );
    } else {
      const newConnection: LLMConnection = {
        ...connection,
        id: Date.now().toString(),
      };
      setLLMConnections([...llmConnections, newConnection]);
    }
    setDialogOpen(false);
    setEditingConnection(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">LLM Connections</h3>
          <p className="text-sm text-muted-foreground">
            Quản lý các kết nối LLM của bạn
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          <Plus className="mr-2 size-4" />
          Thêm connection
        </Button>
      </div>

      {llmConnections.length === 0 ? (
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
            {llmConnections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{connection.name}</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {connection.provider}
                    </span>
                    {connection.models && connection.models.length > 0 && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {connection.models.length} models
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {connection.baseUrl}
                  </p>
                  {connection.models && connection.models.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {connection.models.slice(0, 5).map((model) => (
                        <span
                          key={model.id}
                          className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {model.name}
                        </span>
                      ))}
                      {connection.models.length > 5 && (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          +{connection.models.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
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

      <LLMConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        connection={editingConnection}
        onSave={handleSave}
      />
    </div>
  );
}

interface LLMConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: LLMConnection | null;
  onSave: (connection: Omit<LLMConnection, "id">) => void;
}

function LLMConnectionDialog({
  open,
  onOpenChange,
  connection,
  onSave,
}: LLMConnectionDialogProps) {
  const [name, setName] = useState(connection?.name || "");
  const [baseUrl, setBaseUrl] = useState(connection?.baseUrl || "");
  const [provider, setProvider] = useState<"openai" | "ollama">(
    connection?.provider || "openai"
  );
  const [apiKey, setApiKey] = useState(connection?.apiKey || "");
  const [models, setModels] = useState<LLMModel[]>(connection?.models || []);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"success" | "error" | null>(null);
  const [testError, setTestError] = useState<string>("");

  React.useEffect(() => {
    if (connection) {
      setName(connection.name);
      setBaseUrl(connection.baseUrl);
      setProvider(connection.provider);
      setApiKey(connection.apiKey);
      setModels(connection.models || []);
    } else {
      setName("");
      setBaseUrl("");
      setProvider("openai");
      setApiKey("");
      setModels([]);
    }
    setTestStatus(null);
    setTestError("");
  }, [connection, open]);

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestError("Vui lòng nhập Base URL");
      setTestStatus("error");
      return;
    }

    setIsTesting(true);
    setTestStatus(null);
    setTestError("");

    try {
      const fetchedModels = await testConnectionAndFetchModels(
        baseUrl.trim(),
        provider,
        apiKey.trim() || undefined
      );
      setModels(fetchedModels);
      setTestStatus("success");
    } catch (error: any) {
      setTestError(error.message || "Không thể kết nối đến API");
      setTestStatus("error");
      setModels([]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && baseUrl.trim()) {
      onSave({
        name: name.trim(),
        baseUrl: baseUrl.trim(),
        provider,
        apiKey,
        models: models.length > 0 ? models : undefined,
      });
      onOpenChange(false);
    }
  };

  const defaultUrls = {
    openai: "https://api.openai.com/v1",
    ollama: "http://localhost:11434/v1",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {connection ? "Sửa connection" : "Thêm connection mới"}
            </DialogTitle>
            <DialogDescription>
              Cấu hình kết nối LLM của bạn
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 w-full">
              <Label htmlFor="name">Tên connection</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: OpenAI Production"
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(value: "openai" | "ollama") => {
                  setProvider(value);
                  if (!baseUrl || baseUrl === defaultUrls[provider]) {
                    setBaseUrl(defaultUrls[value]);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="ollama">Ollama</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="baseUrl">Base URL</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={defaultUrls[provider]}
                className="w-full"
                required
              />
            </div>
            <div className="space-y-2 w-full">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Nhập API key (để trống nếu không cần)"
                className="w-full"
              />
            </div>

            {/* Test Connection Button */}
            <div className="space-y-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !baseUrl.trim()}
                className="w-full"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Đang kiểm tra...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-4" />
                    Kiểm tra kết nối và lấy danh sách models
                  </>
                )}
              </Button>
              {testStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="size-4" />
                  <span>Kết nối thành công! Đã tìm thấy {models.length} models.</span>
                </div>
              )}
              {testStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="size-4" />
                  <span>{testError || "Kết nối thất bại"}</span>
                </div>
              )}
            </div>

            {/* Models List */}
            {models.length > 0 && (
              <div className="space-y-2 w-full">
                <Label>Danh sách Models ({models.length})</Label>
                <ScrollArea className="h-[200px] w-full rounded-md border p-3">
                  <div className="space-y-1">
                    {models.map((model) => (
                      <div
                        key={model.id}
                        className="flex items-center justify-between rounded-md bg-muted px-2 py-1.5 text-sm"
                      >
                        <span className="font-medium">{model.name}</span>
                        {model.owned_by && (
                          <span className="text-xs text-muted-foreground">
                            {model.owned_by}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
            <Button type="submit" disabled={!name.trim() || !baseUrl.trim()}>
              {connection ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

