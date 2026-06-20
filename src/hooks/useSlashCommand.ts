import { useState, useMemo, useCallback } from 'react';
import { useGetAllSkillsQuery } from '@/features/skill/state/skillsApi';
import type { SkillRecord } from '@/features/skill/types';

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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [forceClosed, setForceClosed] = useState(false);
  const [prevInput, setPrevInput] = useState(input);
  const selectedSkillIdsKey = workspaceSelectedSkillIds.join('\0');
  const { data: allSkills = [] } = useGetAllSkillsQuery();

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

  const skills = useMemo(() => {
    const selected = new Set(
      selectedSkillIdsKey.length > 0 ? selectedSkillIdsKey.split('\0') : []
    );
    return allSkills.filter((skill) => selected.has(skill.id));
  }, [allSkills, selectedSkillIdsKey]);

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

  const clampedSelectedIndex =
    filteredSkills.length === 0
      ? 0
      : Math.min(selectedIndex, filteredSkills.length - 1);

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
          if (filteredSkills[clampedSelectedIndex]) {
            e.preventDefault();
            handleSelect(filteredSkills[clampedSelectedIndex]);
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
    [isActive, filteredSkills, clampedSelectedIndex, handleSelect]
  );

  const close = useCallback(() => {
    setSelectedIndex(0);
    setForceClosed(true);
  }, []);

  return {
    isActive,
    query,
    selectedIndex: clampedSelectedIndex,
    filteredSkills,
    isEmptyWorkspace,
    handleKeyDown,
    handleSelect,
    close,
  };
}
