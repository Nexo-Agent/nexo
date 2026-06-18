import { useState } from 'react';
import { Bot, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentCardProps {
  agentId: string;
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  onViewDetails?: (sessionId: string) => void;
}

export function AgentCard({
  agentId,
  status,
  children,
}: AgentCardProps & { children?: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [prevStatus, setPrevStatus] = useState(status);

  if (status !== prevStatus) {
    setPrevStatus(status);
    if (status !== 'running') {
      setIsExpanded(false);
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl w-full max-w-xl transition-shadow duration-300 isolate bg-card border border-border',
        status === 'running' && 'shadow-sm'
      )}
    >
      {/* Header Section */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-xl"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Icon */}
        <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <Bot className="size-5 text-primary" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm truncate">{agentId}</h4>
            {status === 'running' && (
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <span className="truncate">{agentId}</span>
            <span>•</span>
            <span
              className={cn(
                'truncate',
                status === 'completed' && 'text-green-500 font-medium',
                status === 'failed' && 'text-destructive font-medium'
              )}
            >
              {status === 'running'
                ? 'Working...'
                : status === 'completed'
                  ? 'Reasoning Complete'
                  : 'Task Failed'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <div className="h-8 w-8 flex items-center justify-center text-muted-foreground">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {/* Expandable Content Section */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0">
            <div className="bg-muted/30 rounded-md border border-border/50 p-3 text-sm leading-relaxed select-text">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
