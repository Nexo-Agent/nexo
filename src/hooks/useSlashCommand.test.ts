import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSlashCommand } from './useSlashCommand';

vi.mock('@/features/skill/state/skillsApi', () => ({
  skillsApi: {
    endpoints: {
      getAllSkills: { initiate: vi.fn() },
      loadSkill: { initiate: vi.fn() },
    },
  },
}));

vi.mock('@/app/store', () => ({
  store: {
    dispatch: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('useSlashCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is inactive when input does not start with slash', () => {
    const { result } = renderHook(() =>
      useSlashCommand({ input: 'hello', workspaceSelectedSkillIds: [] })
    );
    expect(result.current.isActive).toBe(false);
  });

  it('is active when input is slash only', () => {
    const { result } = renderHook(() =>
      useSlashCommand({ input: '/', workspaceSelectedSkillIds: [] })
    );
    expect(result.current.isActive).toBe(true);
  });

  it('reports empty workspace when no skills selected', () => {
    const { result } = renderHook(() =>
      useSlashCommand({ input: '/', workspaceSelectedSkillIds: [] })
    );
    expect(result.current.isEmptyWorkspace).toBe(true);
  });
});
