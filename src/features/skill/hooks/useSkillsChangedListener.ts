import { useEffect, useRef } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import { skillsApi } from '../state/skillsApi';
import { store } from '@/app/store';

let listenerCount = 0;
let unlistenPromise: Promise<() => void> | null = null;

async function ensureListener(): Promise<() => void> {
  if (!unlistenPromise) {
    unlistenPromise = listenToEvent(TauriEvents.SKILLS_CHANGED, () => {
      store.dispatch(skillsApi.util.invalidateTags(['Skill']));
    });
  }
  return unlistenPromise;
}

/** Singleton listener — invalidates Skill RTK tags when the filesystem watcher detects changes. */
export function useSkillsChangedListener(): void {
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
