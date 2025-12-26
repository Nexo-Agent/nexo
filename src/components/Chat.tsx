import { useState, useEffect } from "react";
import { PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceSelector, type Workspace } from "@/components/WorkspaceSelector";
import { ChatSidebar, type ChatItem } from "@/components/ChatSidebar";
import { ChatMessages, type Message } from "@/components/ChatMessages";
import { ChatInput } from "@/components/ChatInput";
import { Settings } from "@/components/Settings";
import { WorkspaceSettingsDialog, type WorkspaceSettings } from "@/components/WorkspaceSettings";
import { useConnections } from "@/contexts/ConnectionsContext";
import { sendChatCompletion } from "@/lib/llm-api";
import { cn } from "@/lib/utils";
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  getChats,
  createChat,
  updateChat,
  deleteChat,
  getMessages,
  createMessage,
  getWorkspaceSettings,
  saveWorkspaceSettings,
  type Workspace as DbWorkspace,
  type Chat as DbChat,
  type Message as DbMessage,
} from "@/lib/db-api";

export function Chat() {
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  // Load workspaces from database
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const dbWorkspaces = await getWorkspaces();
        const frontendWorkspaces: Workspace[] = dbWorkspaces.map((w) => ({
          id: w.id,
          name: w.name,
        }));
        setWorkspaces(frontendWorkspaces);
        if (frontendWorkspaces.length > 0 && !selectedWorkspace) {
          setSelectedWorkspace(frontendWorkspaces[0]);
        }
      } catch (error) {
        console.error("Error loading workspaces:", error);
      }
    };
    loadWorkspaces();
  }, []);

  // Update selected model when workspace changes
  const handleWorkspaceChange = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setSelectedModel(undefined); // Reset model selection when switching workspace
    setAttachedFiles([]); // Clear files when switching workspace
  };

  const handleAddWorkspace = async (name: string) => {
    try {
      const id = Date.now().toString();
      await createWorkspace(id, name);
      const newWorkspace: Workspace = { id, name };
      setWorkspaces((prev) => [...prev, newWorkspace]);
      handleWorkspaceChange(newWorkspace);
    } catch (error) {
      console.error("Error creating workspace:", error);
      alert("Không thể tạo workspace mới");
    }
  };

  const handleWorkspaceSettings = (_workspace: Workspace) => {
    setWorkspaceSettingsOpen(true);
  };

  const handleSaveWorkspaceSettings = async (settings: WorkspaceSettings) => {
    try {
      // Save to database
      await saveWorkspaceSettings(
        settings.id,
        settings.llmConnectionId,
        settings.systemMessage || null,
        settings.mcpConnectionIds || null
      );

      // Update workspace name if changed
      if (settings.name !== selectedWorkspace?.name) {
        await updateWorkspace(settings.id, settings.name);
        setWorkspaces((prev) =>
          prev.map((w) => (w.id === settings.id ? { ...w, name: settings.name } : w))
        );
        if (selectedWorkspace && selectedWorkspace.id === settings.id) {
          setSelectedWorkspace({ ...selectedWorkspace, name: settings.name });
        }
      }

      // Update local state
      setWorkspaceSettings((prev) => ({
        ...prev,
        [settings.id]: settings,
      }));

      // Reset model selection if LLM connection changed
      if (selectedWorkspace && settings.id === selectedWorkspace.id) {
        setSelectedModel(undefined);
      }
    } catch (error) {
      console.error("Error saving workspace settings:", error);
      alert("Không thể lưu cài đặt workspace");
    }
  };

  // Chat list state
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>("");

  // Load chats when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return;

    const loadChats = async () => {
      try {
        const dbChats = await getChats(selectedWorkspace.id);
        const frontendChats: ChatItem[] = dbChats.map((c) => ({
          id: c.id,
          title: c.title,
          lastMessage: c.last_message || undefined,
          timestamp: new Date(c.updated_at * 1000),
        }));
        setChats(frontendChats);
        if (frontendChats.length > 0 && !selectedChatId) {
          setSelectedChatId(frontendChats[0].id);
        } else if (frontendChats.length === 0) {
          // Create default chat if none exists
          const newChatId = Date.now().toString();
          await createChat(newChatId, selectedWorkspace.id, "Cuộc trò chuyện mới");
          const newChat: ChatItem = {
            id: newChatId,
            title: "Cuộc trò chuyện mới",
            timestamp: new Date(),
          };
          setChats([newChat]);
          setSelectedChatId(newChatId);
        }
      } catch (error) {
        console.error("Error loading chats:", error);
      }
    };

    loadChats();
  }, [selectedWorkspace]);

  // Load workspace settings when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return;

    const loadWorkspaceSettings = async () => {
      try {
        const dbSettings = await getWorkspaceSettings(selectedWorkspace.id);
        if (dbSettings) {
          let mcpConnectionIds: string[] | undefined;
          if (dbSettings.mcp_connection_ids) {
            try {
              mcpConnectionIds = JSON.parse(dbSettings.mcp_connection_ids);
            } catch (e) {
              console.error("Error parsing mcp_connection_ids:", e);
            }
          }

          const frontendSettings: WorkspaceSettings = {
            id: dbSettings.workspace_id,
            name: selectedWorkspace.name,
            systemMessage: dbSettings.system_message || "",
            llmConnectionId: dbSettings.llm_connection_id || undefined,
            mcpConnectionIds,
          };
          setWorkspaceSettings((prev) => ({
            ...prev,
            [selectedWorkspace.id]: frontendSettings,
          }));
        }
      } catch (error) {
        console.error("Error loading workspace settings:", error);
      }
    };

    loadWorkspaceSettings();
  }, [selectedWorkspace]);

  // Messages state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceSettingsOpen, setWorkspaceSettingsOpen] = useState(false);
  const [workspaceSettings, setWorkspaceSettings] = useState<Record<string, WorkspaceSettings>>({});
  
  // Chat input state
  const [selectedModel, setSelectedModel] = useState<string | undefined>();
  const [toolsEnabled, setToolsEnabled] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  // Get connections context
  const { llmConnections } = useConnections();

  // Load messages when chat changes
  useEffect(() => {
    if (!selectedChatId) return;

    const loadMessages = async () => {
      try {
        const dbMessages = await getMessages(selectedChatId);
        const frontendMessages: Message[] = dbMessages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.timestamp * 1000),
        }));
        setMessages(frontendMessages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    };

    loadMessages();
  }, [selectedChatId]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !selectedWorkspace || !selectedChatId) return;

    // Get workspace settings and LLM connection
    const workspaceSetting = workspaceSettings[selectedWorkspace.id];
    const llmConnectionId = workspaceSetting?.llmConnectionId;
    
    if (!llmConnectionId) {
      alert("Vui lòng chọn LLM connection trong workspace settings");
      return;
    }

    const llmConnection = llmConnections.find((conn) => conn.id === llmConnectionId);
    if (!llmConnection) {
      alert("LLM connection không tồn tại");
      return;
    }

    if (!selectedModel) {
      alert("Vui lòng chọn model");
      return;
    }

    // Log attached files and tools status for debugging
    if (attachedFiles.length > 0) {
      console.log("Attached files:", attachedFiles.map(f => f.name));
    }
    if (toolsEnabled) {
      console.log("Tools enabled");
    }

    const userMessageId = Date.now().toString();
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    // Save user message to database
    try {
      await createMessage(
        userMessageId,
        selectedChatId,
        "user",
        input.trim()
      );
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    setMessages((prev) => [...prev, userMessage]);
    
    // Update chat last message in database
    try {
      await updateChat(selectedChatId, undefined, input.trim());
    } catch (error) {
      console.error("Error updating chat:", error);
    }

    // Update chat last message in UI
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? { ...chat, lastMessage: input.trim(), timestamp: new Date() }
          : chat
      )
    );

    const userInput = input.trim();
    setInput("");
    setAttachedFiles([]); // Clear files after sending
    setIsLoading(true);

    // Create placeholder for assistant message (before try block so it's accessible in catch)
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Convert messages to API format
      const apiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
      
      // Add system message if available
      if (workspaceSetting?.systemMessage) {
        apiMessages.push({
          role: "system",
          content: workspaceSetting.systemMessage,
        });
      }

      // Add conversation history
      messages.forEach((msg) => {
        apiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      });

      // Add current user message
      apiMessages.push({
        role: "user",
        content: userInput,
      });

      // Send to LLM API
      let assistantContent = "";
      const response = await sendChatCompletion(
        llmConnection.baseUrl,
        llmConnection.provider,
        {
          model: selectedModel,
          messages: apiMessages,
          stream: true, // Enable streaming for better UX
        },
        llmConnection.apiKey || undefined,
        (chunk) => {
          // Handle streaming chunks
          assistantContent += chunk;
          // Update the assistant message in real-time
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: assistantContent }
                : msg
            )
          );
        }
      );

      // Final message update (in case streaming didn't work or for non-streaming)
      if (response.content && response.content !== assistantContent) {
        assistantContent = response.content;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantContent }
              : msg
          )
        );
      }

      // Ensure we have content
      if (!assistantContent && response.content) {
        assistantContent = response.content;
      }

      // Save assistant message to database
      try {
        await createMessage(
          assistantMessageId,
          selectedChatId,
          "assistant",
          assistantContent || "Phản hồi từ AI"
        );
      } catch (error) {
        console.error("Error saving assistant message:", error);
      }

      // Update chat last message in database
      try {
        await updateChat(
          selectedChatId,
          undefined,
          assistantContent || "Phản hồi từ AI"
        );
      } catch (error) {
        console.error("Error updating chat:", error);
      }

      // Update chat last message in UI
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChatId
            ? {
                ...chat,
                lastMessage: assistantContent || "Phản hồi từ AI",
                timestamp: new Date(),
              }
            : chat
        )
      );
    } catch (error: any) {
      console.error("Error sending message:", error);
      // Replace the placeholder message with error message
      const errorContent = `Lỗi: ${error.message || "Không thể kết nối đến LLM API"}`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: errorContent,
              }
            : msg
        )
      );
      // Save error message to database
      try {
        await createMessage(assistantMessageId, selectedChatId, "assistant", errorContent);
      } catch (dbError) {
        console.error("Error saving error message:", dbError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (files: File[]) => {
    setAttachedFiles(files);
  };

  const handleNewChat = async () => {
    if (!selectedWorkspace) return;

    try {
      const newChatId = Date.now().toString();
      await createChat(newChatId, selectedWorkspace.id, "Cuộc trò chuyện mới");
      const newChat: ChatItem = {
        id: newChatId,
        title: "Cuộc trò chuyện mới",
        timestamp: new Date(),
      };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChatId);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new chat:", error);
      alert("Không thể tạo cuộc trò chuyện mới");
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    // Messages will be loaded by useEffect when selectedChatId changes
    // Clear attached files when switching chats
    setAttachedFiles([]);
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      if (selectedChatId === chatId) {
        const remainingChats = chats.filter((chat) => chat.id !== chatId);
        if (remainingChats.length > 0) {
          setSelectedChatId(remainingChats[0].id);
        } else if (selectedWorkspace) {
          // Create a new chat if none remain
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      alert("Không thể xóa cuộc trò chuyện");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Topbar with Workspace Selector */}
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedWorkspace && (
              <WorkspaceSelector
                workspaces={workspaces}
                selectedWorkspace={selectedWorkspace}
                onWorkspaceChange={handleWorkspaceChange}
                onAddWorkspace={handleAddWorkspace}
                onWorkspaceSettings={handleWorkspaceSettings}
              />
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <SettingsIcon className="size-5" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            "relative flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
            isSidebarCollapsed ? "w-0" : "w-64"
          )}
        >
          <div
            className={cn(
              "h-full transition-opacity duration-300 ease-in-out",
              isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <ChatSidebar
              chats={chats}
              selectedChatId={selectedChatId}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
            />
          </div>
        </div>

        {/* Collapse Button - Middle Screen */}
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={cn(
            "absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
            "flex size-8 items-center justify-center rounded-full border border-border bg-background shadow-md",
            "transition-all duration-300 ease-in-out hover:bg-accent",
            isSidebarCollapsed ? "left-0" : "left-64"
          )}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>

        {/* Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          {/* Messages Area */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Input Area */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isLoading}
            selectedLLMConnectionId={selectedWorkspace ? workspaceSettings[selectedWorkspace.id]?.llmConnectionId : undefined}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            toolsEnabled={toolsEnabled}
            onToolsToggle={setToolsEnabled}
            onFileUpload={handleFileUpload}
          />
        </div>
      </div>

      {/* Settings Dialog */}
      <Settings open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Workspace Settings Dialog */}
      {selectedWorkspace && (
        <WorkspaceSettingsDialog
          open={workspaceSettingsOpen}
          onOpenChange={setWorkspaceSettingsOpen}
          workspace={selectedWorkspace}
          settings={workspaceSettings[selectedWorkspace.id]}
          onSave={handleSaveWorkspaceSettings}
        />
      )}
    </div>
  );
}

