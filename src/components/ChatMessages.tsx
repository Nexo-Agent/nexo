import { useRef, useEffect, useState } from "react";
import { Bot, User, Copy, Code, FileText, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/MarkdownContent";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [markdownEnabled, setMarkdownEnabled] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      // Find the viewport element inside ScrollArea
      const scrollArea = scrollAreaRef.current;
      if (scrollArea) {
        const viewport = scrollArea.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport && messagesEndRef.current) {
          viewport.scrollTo({
            top: messagesEndRef.current.offsetTop - viewport.offsetTop,
            behavior: "smooth",
          });
          return;
        }
      }
      // Fallback to scrollIntoView
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const toggleMarkdown = (messageId: string) => {
    setMarkdownEnabled((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  return (
    <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-6 flex min-w-0 gap-4",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                "flex min-w-0 max-w-[80%] flex-col gap-2",
                message.role === "user" && "items-end"
              )}
            >
              <div
                className={cn(
                  "group relative min-w-0 break-words rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.role === "assistant" ? (
                  markdownEnabled[message.id] !== false ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap break-words">
                      {message.content}
                    </div>
                  )
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {message.content}
                  </div>
                )}
                
                {/* Action buttons */}
                <div
                  className={cn(
                    "absolute top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                    message.role === "user" ? "left-2" : "right-2"
                  )}
                >
                  {message.role === "assistant" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => toggleMarkdown(message.id)}
                      title={markdownEnabled[message.id] !== false ? "Hiển thị raw text" : "Hiển thị markdown"}
                    >
                      {markdownEnabled[message.id] !== false ? (
                        <FileText className="h-3.5 w-3.5" />
                      ) : (
                        <Code className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleCopy(message.content, message.id)}
                    title="Copy"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {message.role === "user" && (
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="mb-6 flex gap-4 justify-start">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 max-w-[80%] flex-col gap-2">
              <div className="min-w-0 break-words rounded-2xl bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50" />
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:0.2s]" />
                  <span className="size-2 animate-pulse rounded-full bg-foreground/50 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

