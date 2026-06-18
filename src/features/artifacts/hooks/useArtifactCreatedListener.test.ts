import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { listenToEventMock } = vi.hoisted(() => ({
  listenToEventMock: vi.fn().mockResolvedValue(() => {}),
}));

vi.mock('@/lib/tauri', () => ({
  listenToEvent: listenToEventMock,
  TauriEvents: { ARTIFACT_CREATED: 'artifact-created' },
}));

vi.mock('@/app/store', () => ({
  store: {
    getState: () => ({ chats: { selectedChatId: 'chat-1' } }),
    dispatch: vi.fn(),
  },
}));

vi.mock('../state/artifactsApi', () => ({
  artifactsApi: { util: { invalidateTags: vi.fn() } },
}));

import { useArtifactCreatedListener } from './useArtifactCreatedListener';

describe('useArtifactCreatedListener', () => {
  it('registers a single artifact-created listener', () => {
    const { unmount } = renderHook(() => useArtifactCreatedListener());
    expect(listenToEventMock).toHaveBeenCalledWith(
      'artifact-created',
      expect.any(Function)
    );
    unmount();
  });
});
