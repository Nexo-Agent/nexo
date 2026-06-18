import { useEffect, useRef } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import { store } from '@/app/store';
import { artifactsApi } from '../state/artifactsApi';
import {
  setRightPanelOpen,
  setRightPanelTab,
} from '@/features/ui/state/uiSlice';
import type { ArtifactCreatedEvent } from '../types';

let listenerCount = 0;
let unlistenPromise: Promise<() => void> | null = null;

async function ensureListener(): Promise<() => void> {
  if (!unlistenPromise) {
    unlistenPromise = listenToEvent<ArtifactCreatedEvent>(
      TauriEvents.ARTIFACT_CREATED,
      (payload) => {
        const selectedChatId = store.getState().chats.selectedChatId;
        if (payload.chat_id !== selectedChatId) return;

        store.dispatch(
          artifactsApi.util.invalidateTags([
            { type: 'Artifact', id: payload.chat_id },
          ])
        );
        store.dispatch(setRightPanelOpen(true));
        store.dispatch(setRightPanelTab('artifacts'));
      }
    );
  }
  return unlistenPromise;
}

/** Singleton listener — refreshes artifacts and opens the panel when a new artifact is created. */
export function useArtifactCreatedListener(): void {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    listenerCount += 1;

    let unlisten: (() => void) | undefined;
    ensureListener().then((fn) => {
      unlisten = fn;
    });

    return () => {
      listenerCount -= 1;
      if (listenerCount === 0 && unlisten) {
        unlisten();
        unlistenPromise = null;
      }
    };
  }, []);
}
