import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createBrowserSession,
  destroyBrowserSession,
  navigateBrowserSession,
  sendBrowserInput,
  setBrowserViewerActive,
} from '../state/browserApi';
import type { BrowserInputEvent } from '../types';

interface UseBrowserSessionOptions {
  chatId?: string;
  url?: string;
  width?: number;
  height?: number;
  autoStart?: boolean;
}

export function useBrowserSession({
  chatId,
  url,
  width = 1280,
  height = 720,
  autoStart = true,
}: UseBrowserSessionOptions = {}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createBrowserSession({
        chatId,
        url: url ?? null,
        width,
        height,
      });
      sessionRef.current = result.session_id;
      setSessionId(result.session_id);
      await setBrowserViewerActive(result.session_id, true);
      return result.session_id;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [chatId, url, width, height]);

  const destroySession = useCallback(async () => {
    const id = sessionRef.current;
    if (!id) return;
    try {
      await destroyBrowserSession(id);
    } finally {
      sessionRef.current = null;
      setSessionId(null);
    }
  }, []);

  const navigate = useCallback(async (nextUrl: string) => {
    const id = sessionRef.current;
    if (!id) return;
    await navigateBrowserSession(id, nextUrl);
  }, []);

  const sendInput = useCallback(async (event: BrowserInputEvent) => {
    const id = sessionRef.current;
    if (!id) return;
    await sendBrowserInput(id, event);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    createSession().catch(() => undefined);
    return () => {
      destroySession().catch(() => undefined);
    };
  }, [autoStart, createSession, destroySession]);

  return {
    sessionId,
    loading,
    error,
    createSession,
    destroySession,
    navigate,
    sendInput,
  };
}
