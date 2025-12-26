import { MessageSquare, Plus, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ChatItem {
  id: string;
  title: string;
  lastMessage?: string;
  timestamp?: Date;
}

interface ChatSidebarProps {
  chats: ChatItem[];
  selectedChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  onDeleteChat?: (chatId: string) => void;
}

export function ChatSidebar({
  chats,
  selectedChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
}: ChatSidebarProps) {
  const formatTime = (date?: Date) => {
    if (!date) return "";
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    if (days < 7) return `${days} ngày trước`;
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar">
      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={onNewChat}
          className="w-full justify-center gap-2"
          variant="default"
        >
          <Plus className="size-4" />
          <span>Cuộc trò chuyện mới</span>
        </Button>
      </div>

      <Separator />

      {/* Chat List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {chats.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="mb-2 size-8 opacity-50" />
              <p>Chưa có cuộc trò chuyện nào</p>
              <p className="text-xs">Tạo cuộc trò chuyện mới để bắt đầu</p>
            </div>
          ) : (
            <div className="space-y-1">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    "hover:bg-sidebar-accent",
                    selectedChatId === chat.id && "bg-sidebar-accent"
                  )}
                  onClick={() => onChatSelect(chat.id)}
                >
                  <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-medium text-sidebar-foreground">
                      {chat.title}
                    </div>
                    {chat.lastMessage && (
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {chat.lastMessage}
                      </div>
                    )}
                    {chat.timestamp && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTime(chat.timestamp)}
                      </div>
                    )}
                  </div>
                  {onDeleteChat && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteChat(chat.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

