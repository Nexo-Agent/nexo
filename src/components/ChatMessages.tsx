import { useRef, useEffect } from "react";
import { Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  return (
    <ScrollArea className="flex-1 px-4">
      <div className="mx-auto max-w-3xl py-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "mb-6 flex gap-4",
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
                "flex max-w-[80%] flex-col gap-2",
                message.role === "user" && "items-end"
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {message.content}
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
            <div className="flex max-w-[80%] flex-col gap-2">
              <div className="rounded-2xl bg-muted px-4 py-3">
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

