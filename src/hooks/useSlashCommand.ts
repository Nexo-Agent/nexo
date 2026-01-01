import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { invokeCommand, TauriCommands } from '@/lib/tauri';
import type { Prompt } from '@/store/types';

interface UseSlashCommandOptions {
  input: string;
  onSelectPrompt?: (prompt: Prompt) => void;
}

interface UseSlashCommandReturn {
  isActive: boolean;
  query: string;
  selectedIndex: number;
  filteredPrompts: Prompt[];
  handleKeyDown: (e: React.KeyboardEvent) => boolean; // Returns true if handled
  handleSelect: (prompt: Prompt) => void;
  close: () => void;
}

export function useSlashCommand({
  input,
  onSelectPrompt,
}: UseSlashCommandOptions): UseSlashCommandReturn {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setIsLoading] = useState(false);
  const [forceClosed, setForceClosed] = useState(false);
  const prevInputRef = useRef<string>('');

  // Load prompts function
  const loadPrompts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invokeCommand<Prompt[]>(TauriCommands.GET_PROMPTS);
      setPrompts(data);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Reset forceClosed when input changes and starts with "/" followed by non-whitespace
  // Only reset if this is a NEW slash command (input changed from not having valid slash to having valid slash)
  useEffect(() => {
    if (forceClosed) {
      const prevInput = prevInputRef.current;
      // Check if previous input has valid slash command (starts with "/" and not followed by whitespace)
      const prevHasValidSlash =
        prevInput.startsWith('/') &&
        (prevInput.length === 1 || !/\s/.test(prevInput[1]));

      // Check if current input has valid slash command
      const hasValidSlash =
        input.startsWith('/') && (input.length === 1 || !/\s/.test(input[1]));

      const inputChanged = input !== prevInput;
      const isNewSlashCommand =
        inputChanged && !prevHasValidSlash && hasValidSlash;

      if (isNewSlashCommand) {
        setForceClosed(false);
      }
    }
    // Update prevInputRef after checking
    prevInputRef.current = input;
  }, [input, forceClosed]);

  // Detect slash command and extract query
  const { isActive, query } = useMemo(() => {
    // If force closed, don't activate
    if (forceClosed) {
      return { isActive: false, query: '' };
    }

    // Only activate if input starts with "/"
    if (!input.startsWith('/')) {
      return { isActive: false, query: '' };
    }

    // Check if there's a character after "/" and it's not whitespace
    // Allow just "/" to trigger it
    if (input.length > 1 && /\s/.test(input[1])) {
      return { isActive: false, query: '' };
    }

    // Extract query after "/"
    const afterSlash = input.substring(1);
    // Stop at next space or end of input
    const spaceIndex = afterSlash.indexOf(' ');
    const query =
      spaceIndex === -1 ? afterSlash : afterSlash.substring(0, spaceIndex);

    return { isActive: true, query };
  }, [input, forceClosed]);

  // Reload prompts when slash command becomes active
  useEffect(() => {
    if (isActive) {
      loadPrompts();
    }
  }, [isActive, loadPrompts]);

  // Filter prompts based on query
  const filteredPrompts = useMemo(() => {
    if (!isActive) {
      return [];
    }

    if (!query.trim()) {
      return prompts;
    }

    const queryLower = query.toLowerCase();
    return prompts.filter((prompt) =>
      prompt.name.toLowerCase().includes(queryLower)
    );
  }, [prompts, query, isActive]);

  // Reset selected index when filtered prompts change
  useEffect(() => {
    if (filteredPrompts.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredPrompts.length]);

  // Handle prompt selection
  const handleSelect = useCallback(
    (prompt: Prompt) => {
      onSelectPrompt?.(prompt);
    },
    [onSelectPrompt]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isActive) {
        return false;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredPrompts.length - 1)
          );
          return true;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return true;

        case 'Enter':
          if (filteredPrompts[selectedIndex]) {
            e.preventDefault();
            handleSelect(filteredPrompts[selectedIndex]);
            return true;
          }
          return false;

        case 'Escape':
          e.preventDefault();
          return true; // Signal to close, but don't handle here

        default:
          return false;
      }
    },
    [isActive, filteredPrompts, selectedIndex, handleSelect]
  );

  // Close slash command
  const close = useCallback(() => {
    setSelectedIndex(0);
    setForceClosed(true);
  }, []);

  return {
    isActive,
    query,
    selectedIndex,
    filteredPrompts,
    handleKeyDown,
    handleSelect,
    close,
  };
}
