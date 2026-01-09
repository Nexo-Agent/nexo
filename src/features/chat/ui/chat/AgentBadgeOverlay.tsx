import { Badge } from '@/ui/atoms/badge';
import { Bot, X } from 'lucide-react';
import type { InstalledAgent } from '@/app/types';

interface AgentMentionChipsProps {
  agentIds: string[];
  agents: InstalledAgent[];
  onRemoveAgent?: (agentId: string) => void;
}

/**
 * Component to show agent mentions as chips below textarea
 */
export function AgentMentionChips({
  agentIds,
  agents,
  onRemoveAgent,
}: AgentMentionChipsProps) {
  if (agentIds.length === 0) {
    return null;
  }

  // Create map for quick agent lookup
  const agentMap = new Map(agents.map((a) => [a.manifest.id, a]));

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {agentIds.map((agentId) => {
        const agent = agentMap.get(agentId);
        return (
          <Badge
            key={agentId}
            variant="secondary"
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1"
          >
            <Bot className="size-3" />
            <span className="text-xs">
              {agent?.manifest.name || `@${agentId}`}
            </span>
            {onRemoveAgent && (
              <button
                type="button"
                onClick={() => onRemoveAgent(agentId)}
                className="ml-0.5 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
                aria-label="Remove agent"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        );
      })}
    </div>
  );
}
