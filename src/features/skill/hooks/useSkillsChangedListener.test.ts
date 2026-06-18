import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { listenToEventMock } = vi.hoisted(() => ({
  listenToEventMock: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@/lib/tauri', () => ({
  listenToEvent: listenToEventMock,
  TauriEvents: { SKILLS_CHANGED: 'skills-changed' },
}));

vi.mock('@/app/store', () => ({
  store: { dispatch: vi.fn() },
}));

vi.mock('../state/skillsApi', () => ({
  skillsApi: { util: { invalidateTags: vi.fn() } },
}));

import { useSkillsChangedListener } from './useSkillsChangedListener';

describe('useSkillsChangedListener', () => {
  it('registers a single skills-changed listener', () => {
    const { unmount } = renderHook(() => useSkillsChangedListener());
    expect(listenToEventMock).toHaveBeenCalledWith(
      'skills-changed',
      expect.any(Function)
    );
    unmount();
  });
});
