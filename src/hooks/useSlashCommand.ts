import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { skillsApi } from '@/features/skill/state/skillsApi';
import type { SkillRecord } from '@/features/skill/types';
import { store } from '@/app/store';
import { logger } from '@/lib/logger';

interface UseSlashCommandOptions {
  input: string;
  workspaceSelectedSkillIds: string[];
  onSelectSkill?: (skill: SkillRecord) => void;
}

interface UseSlashCommandReturn {
  isActive: boolean;
  query: string;
  selectedIndex: number;
  filteredSkills: SkillRecord[];
  isEmptyWorkspace: boolean;
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  handleSelect: (skill: SkillRecord) => void;
  close: () => void;
}

function getSlashQuery(value: string): string {
  const afterSlash = value.substring(1);
  const spaceIndex = afterSlash.indexOf(' ');
  return spaceIndex === -1 ? afterSlash : afterSlash.substring(0, spaceIndex);
}

function hasValidSlashCommand(value: string): boolean {
  return value.startsWith('/') && (value.length === 1 || !/\s/.test(value[1]));
}

export function useSlashCommand({
  input,
  workspaceSelectedSkillIds,
  onSelectSkill,
}: UseSlashCommandOptions): UseSlashCommandReturn {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forceClosed, setForceClosed] = useState(false);
  const [prevInput, setPrevInput] = useState(input);
  const prevIsActiveRef = useRef(false);
  const isLoadingRef = useRef(false);

  if (input !== prevInput) {
    const prevHasValidSlash = hasValidSlashCommand(prevInput);
    const hasValidSlash = hasValidSlashCommand(input);
    const isNewSlashCommand = !prevHasValidSlash && hasValidSlash;
    const slashQueryChanged =
      hasValidSlash &&
      prevHasValidSlash &&
      getSlashQuery(input) !== getSlashQuery(prevInput);

    if (forceClosed && (isNewSlashCommand || slashQueryChanged)) {
      setForceClosed(false);
    }
    setPrevInput(input);
  }

  const loadSkills = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const result = await store.dispatch(
        skillsApi.endpoints.getAllSkills.initiate(undefined, {
          forceRefetch: true,
        })
      );
      if ('data' in result && result.data) {
        const selected = new Set(workspaceSelectedSkillIds);
        setSkills(result.data.filter((s) => selected.has(s.id)));
      }
    } catch (error) {
      logger.error('Error loading skills for slash command:', error);
    } finally {
      isLoadingRef.current = false;
    }
  }, [workspaceSelectedSkillIds]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const { isActive, query } = useMemo(() => {
    if (forceClosed) {
      return { isActive: false, query: '' };
    }

    if (!input.startsWith('/')) {
      return { isActive: false, query: '' };
    }

    if (input.length > 1 && /\s/.test(input[1])) {
      return { isActive: false, query: '' };
    }

    const afterSlash = input.substring(1);
    const spaceIndex = afterSlash.indexOf(' ');
    const query =
      spaceIndex === -1 ? afterSlash : afterSlash.substring(0, spaceIndex);

    return { isActive: true, query };
  }, [input, forceClosed]);

  useEffect(() => {
    if (isActive && !prevIsActiveRef.current) {
      loadSkills();
    }
    prevIsActiveRef.current = isActive;
  }, [isActive, loadSkills]);

  const filteredSkills = useMemo(() => {
    if (!isActive) return [];

    if (!query.trim()) {
      return skills;
    }

    const queryLower = query.toLowerCase();
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(queryLower) ||
        skill.description.toLowerCase().includes(queryLower)
    );
  }, [skills, query, isActive]);

  const isEmptyWorkspace = isActive && workspaceSelectedSkillIds.length === 0;

  useEffect(() => {
    if (filteredSkills.length > 0) {
      setSelectedIndex(0);
    }
  }, [filteredSkills.length]);

  const handleSelect = useCallback(
    (skill: SkillRecord) => {
      onSelectSkill?.(skill);
    },
    [onSelectSkill]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!isActive) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredSkills.length - 1)
          );
          return true;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          return true;

        case 'Enter':
          if (filteredSkills[selectedIndex]) {
            e.preventDefault();
            handleSelect(filteredSkills[selectedIndex]);
            return true;
          }
          return false;

        case 'Escape':
          e.preventDefault();
          return true;

        default:
          return false;
      }
    },
    [isActive, filteredSkills, selectedIndex, handleSelect]
  );

  const close = useCallback(() => {
    setSelectedIndex(0);
    setForceClosed(true);
  }, []);

  return {
    isActive,
    query,
    selectedIndex,
    filteredSkills,
    isEmptyWorkspace,
    handleKeyDown,
    handleSelect,
    close,
  };
}
