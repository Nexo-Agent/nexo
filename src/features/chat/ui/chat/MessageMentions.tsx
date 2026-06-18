import { Badge } from '@/ui/atoms/badge';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageMentionsProps {
  mentions: string[];
  role?: 'user' | 'assistant' | 'tool' | 'tool_call';
  className?: string;
}

export function MessageMentions({
  mentions,
  role = 'assistant',
  className,
}: MessageMentionsProps) {
  if (mentions.length === 0) return null;

  const isUser = role === 'user';

  return (
    <div className={cn('flex flex-wrap gap-1.5 mb-2', className)}>
      {mentions.map((id) => (
        <Badge
          key={id}
          variant="secondary"
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 border',
            'transition-colors duration-300 cursor-default select-none shadow-xs',
            isUser
              ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/30'
              : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
          )}
          title={id}
        >
          <Bot
            className={cn('size-3', isUser ? 'opacity-90' : 'text-primary')}
          />
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {id}
          </span>
        </Badge>
      ))}
    </div>
  );
}
