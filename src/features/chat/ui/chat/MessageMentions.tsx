import { Badge } from '@/ui/atoms/badge';
import { Bot } from 'lucide-react';
import { useGetInstalledAgentsQuery } from '@/features/agent';
import { cn } from '@/lib/utils';

interface MessageMentionsProps {
  mentions: string[];
  role?: 'user' | 'assistant' | 'tool' | 'tool_call';
  className?: string;
}

/**
 * Component to display agent mentions at the top of a message
 */
export function MessageMentions({
  mentions,
  role = 'assistant',
  className,
}: MessageMentionsProps) {
  const { data: agents = [] } = useGetInstalledAgentsQuery();
  const agentMap = new Map(agents.map((a) => [a.manifest.id, a]));

  if (mentions.length === 0) return null;

  const isUser = role === 'user';

  return (
    <div className={cn('flex flex-wrap gap-1.5 mb-2', className)}>
      {mentions.map((id) => {
        const agent = agentMap.get(id);
        const name = agent?.manifest.name || id;

        return (
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
              {name}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
