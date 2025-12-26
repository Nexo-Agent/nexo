import { useState } from "react";
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

export function Chat() {
  // Workspace state
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: "1", name: "Default" },
  ]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>(
    workspaces[0]
  );

  // Update selected model when workspace changes
  const handleWorkspaceChange = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setSelectedModel(undefined); // Reset model selection when switching workspace
    setAttachedFiles([]); // Clear files when switching workspace
  };

  const handleAddWorkspace = (name: string) => {
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name: name,
    };
    setWorkspaces((prev) => [...prev, newWorkspace]);
    handleWorkspaceChange(newWorkspace);
  };

  const handleWorkspaceSettings = (_workspace: Workspace) => {
    setWorkspaceSettingsOpen(true);
  };

  const handleSaveWorkspaceSettings = (settings: WorkspaceSettings) => {
    setWorkspaceSettings((prev) => ({
      ...prev,
      [settings.id]: settings,
    }));
    // Update workspace name if changed
    if (settings.name !== selectedWorkspace.name) {
      setWorkspaces((prev) =>
        prev.map((w) => (w.id === settings.id ? { ...w, name: settings.name } : w))
      );
      if (selectedWorkspace.id === settings.id) {
        setSelectedWorkspace({ ...selectedWorkspace, name: settings.name });
      }
    }
    // Reset model selection if LLM connection changed
    if (settings.id === selectedWorkspace.id) {
      setSelectedModel(undefined);
    }
  };

  // Chat list state
  const [chats, setChats] = useState<ChatItem[]>([
    {
      id: "1",
      title: "Cuộc trò chuyện mới",
      timestamp: new Date(),
    },
  ]);
  const [selectedChatId, setSelectedChatId] = useState<string>("1");

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    
    // Update chat last message
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

      // Update chat last message
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
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `Lỗi: ${error.message || "Không thể kết nối đến LLM API"}`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (files: File[]) => {
    setAttachedFiles(files);
  };

  const handleNewChat = () => {
    const newChat: ChatItem = {
      id: Date.now().toString(),
      title: "Cuộc trò chuyện mới",
      timestamp: new Date(),
    };
    setChats((prev) => [newChat, ...prev]);
    setSelectedChatId(newChat.id);
    setMessages([]);
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChatId(chatId);
    // In a real app, you would load messages for this chat
    // For now, just reset messages
    setMessages([]);
    // Clear attached files when switching chats
    setAttachedFiles([]);
  };

  const handleDeleteChat = (chatId: string) => {
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (selectedChatId === chatId && chats.length > 1) {
      const remainingChats = chats.filter((chat) => chat.id !== chatId);
      setSelectedChatId(remainingChats[0]?.id || "");
    } else if (chats.length === 1) {
      handleNewChat();
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Topbar with Workspace Selector */}
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WorkspaceSelector
              workspaces={workspaces}
              selectedWorkspace={selectedWorkspace}
              onWorkspaceChange={handleWorkspaceChange}
              onAddWorkspace={handleAddWorkspace}
              onWorkspaceSettings={handleWorkspaceSettings}
            />
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
            "relative overflow-hidden transition-all duration-300 ease-in-out",
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
        <div className="flex flex-1 flex-col bg-background">
          {/* Messages Area */}
          <ChatMessages messages={messages} isLoading={isLoading} />

          {/* Input Area */}
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isLoading}
            selectedLLMConnectionId={workspaceSettings[selectedWorkspace.id]?.llmConnectionId}
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
      <WorkspaceSettingsDialog
        open={workspaceSettingsOpen}
        onOpenChange={setWorkspaceSettingsOpen}
        workspace={selectedWorkspace}
        settings={workspaceSettings[selectedWorkspace.id]}
        onSave={handleSaveWorkspaceSettings}
      />
    </div>
  );
}

