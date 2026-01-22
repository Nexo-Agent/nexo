import { useState, useMemo, useCallback } from 'react';
import {
  useGetInstalledAgentsQuery,
  type InstalledAgent,
} from '@/features/agent';

interface UseAgentMentionOptions {
  input: string;
  onSelectAgent?: (agent: InstalledAgent) => void;
  enabled?: boolean;
}

interface UseAgentMentionReturn {
  isActive: boolean;
  query: string;
  selectedIndex: number;
  filteredAgents: InstalledAgent[];
  handleKeyDown: (e: React.KeyboardEvent) => boolean; // Returns true if handled
  handleSelect: (agent: InstalledAgent) => void;
  close: () => void;
}

export function useAgentMention({
  input,
  onSelectAgent,
  enabled = true,
}: UseAgentMentionOptions): UseAgentMentionReturn {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forceClosed, setForceClosed] = useState(false);
  // State to track previous values for render-time updates
  const [prevInput, setPrevInput] = useState(input);
  const [prevFilteredAgentsLen, setPrevFilteredAgentsLen] = useState(0);

  // Logic to reset forceClosed (update during render)
  if (input !== prevInput) {
    const prevHasValidTrigger =
      prevInput.startsWith('@') &&
      (prevInput.length === 1 || !/\s/.test(prevInput[1]));

    const hasValidTrigger =
      input.startsWith('@') && (input.length === 1 || !/\s/.test(input[1]));

    const isNewTrigger = !prevHasValidTrigger && hasValidTrigger;

    if (isNewTrigger) {
      setForceClosed(false);
    }
    setPrevInput(input);
  }

  // Detect mention command and extract query
  const { isActive, query } = useMemo(() => {
    if (!enabled || forceClosed) {
      return { isActive: false, query: '' };
    }

    if (!input.startsWith('@')) {
      return { isActive: false, query: '' };
    }

    // Allow just "@" to trigger it
    if (input.length > 1 && /\s/.test(input[1])) {
      return { isActive: false, query: '' };
    }

    // Extract query after "@"
    const afterTrigger = input.substring(1);
    const spaceIndex = afterTrigger.indexOf(' ');
    const query =
      spaceIndex === -1 ? afterTrigger : afterTrigger.substring(0, spaceIndex);

    return { isActive: true, query };
  }, [input, forceClosed, enabled]);

  // Load agents using RTK Query, skip if not active to save resources
  const { data: agents = [] } = useGetInstalledAgentsQuery(undefined, {
    skip: !isActive,
  });

  // Filter agents
  const filteredAgents = useMemo(() => {
    if (!isActive) {
      return [];
    }

    if (!query.trim()) {
      return agents;
    }

    const queryLower = query.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.manifest.id.toLowerCase().includes(queryLower) ||
        agent.manifest.name.toLowerCase().includes(queryLower)
    );
  }, [agents, query, isActive]);

  // Reset selected index when filtered list changes (update during render)
  if (filteredAgents.length !== prevFilteredAgentsLen) {
    setPrevFilteredAgentsLen(filteredAgents.length);
    if (filteredAgents.length > 0) {
      setSelectedIndex(0);
    }
  }

  // Handle selection
  const handleSelect = useCallback(
    (agent: InstalledAgent) => {
      onSelectAgent?.(agent);
    },
    [onSelectAgent]
  );

  // Keyboard nav
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isActive) {
        return false;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredAgents.length - 1)
          );
          return true;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return true;

        case 'Enter':
          if (filteredAgents[selectedIndex]) {
            e.preventDefault();
            handleSelect(filteredAgents[selectedIndex]);
            return true;
          }
          return false;

        case 'Escape':
          e.preventDefault();
          setForceClosed(true);
          return true;

        default:
          return false;
      }
    },
    [isActive, filteredAgents, selectedIndex, handleSelect]
  );

  // Close
  const close = useCallback(() => {
    setSelectedIndex(0);
    setForceClosed(true);
  }, []);

  return {
    isActive,
    query,
    selectedIndex,
    filteredAgents,
    handleKeyDown,
    handleSelect,
    close,
  };
}
