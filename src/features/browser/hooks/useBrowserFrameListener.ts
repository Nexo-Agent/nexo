import { useEffect, useRef, useState } from 'react';
import { listenToEvent, TauriEvents } from '@/lib/tauri';
import type { BrowserFrameEvent } from '../types';

const listeners = new Map<string, number>();
const unlistenFns = new Map<string, Promise<() => void>>();

async function ensureFrameListener(
  sessionId: string,
  handler: (frame: BrowserFrameEvent) => void
): Promise<() => void> {
  const key = sessionId;
  if (!unlistenFns.has(key)) {
    unlistenFns.set(
      key,
      listenToEvent<BrowserFrameEvent>(TauriEvents.BROWSER_FRAME, (payload) => {
        if (payload.session_id === sessionId) {
          handler(payload);
        }
      })
    );
  }
  const unlisten = unlistenFns.get(key);
  if (!unlisten) {
    throw new Error(`Missing frame listener for session ${key}`);
  }
  return unlisten;
}

export function useBrowserFrameListener(
  sessionId: string | null,
  onFrame: (frame: BrowserFrameEvent) => void
): void {
  const onFrameRef = useRef(onFrame);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!sessionId) return;

    let cleanup: (() => void) | undefined;
    const count = (listeners.get(sessionId) ?? 0) + 1;
    listeners.set(sessionId, count);

    ensureFrameListener(sessionId, (frame) => onFrameRef.current(frame)).then(
      (fn) => {
        cleanup = fn;
      }
    );

    return () => {
      const next = (listeners.get(sessionId) ?? 1) - 1;
      if (next <= 0) {
        listeners.delete(sessionId);
        const unlistenPromise = unlistenFns.get(sessionId);
        unlistenFns.delete(sessionId);
        unlistenPromise?.then((fn) => fn());
      } else {
        listeners.set(sessionId, next);
      }
      cleanup?.();
    };
  }, [sessionId]);
}

export function useBrowserFrame(
  sessionId: string | null
): BrowserFrameEvent | null {
  const [frame, setFrame] = useState<BrowserFrameEvent | null>(null);
  useBrowserFrameListener(sessionId, setFrame);
  return frame;
}
