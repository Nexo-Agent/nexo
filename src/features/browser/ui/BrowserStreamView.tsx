import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { sendBrowserInput, setBrowserViewerActive } from '../state/browserApi';
import { useBrowserFrame } from '../hooks/useBrowserFrameListener';
import type { BrowserInputEvent } from '../types';
import { BrowserStreamSkeleton } from './BrowserStreamSkeleton';

interface BrowserStreamViewProps {
  sessionId: string;
  interactive?: boolean;
  className?: string;
}

export function BrowserStreamView({
  sessionId,
  interactive = true,
  className,
}: BrowserStreamViewProps) {
  const { t } = useTranslation('browser');
  const frame = useBrowserFrame(sessionId);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setBrowserViewerActive(sessionId, true).catch(() => undefined);
    return () => {
      setBrowserViewerActive(sessionId, false).catch(() => undefined);
    };
  }, [sessionId]);

  const mapCoordinates = useCallback(
    (clientX: number, clientY: number) => {
      const img = imgRef.current;
      if (!frame || !img) return { x: 0, y: 0 };
      const rect = img.getBoundingClientRect();
      const scaleX = frame.viewport_width / rect.width;
      const scaleY = frame.viewport_height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [frame]
  );

  const sendInput = useCallback(
    async (event: BrowserInputEvent) => {
      await sendBrowserInput(sessionId, event);
    },
    [sessionId]
  );

  const focusStream = useCallback(() => {
    containerRef.current?.focus();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    focusStream();
    const { x, y } = mapCoordinates(e.clientX, e.clientY);
    containerRef.current?.setPointerCapture(e.pointerId);
    sendInput({ type: 'mouseMoved', x, y }).catch(() => undefined);
    sendInput({
      type: 'mousePressed',
      x,
      y,
      button: e.button === 2 ? 'right' : 'left',
      clickCount: 1,
    }).catch(() => undefined);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactive) return;
    const { x, y } = mapCoordinates(e.clientX, e.clientY);
    sendInput({
      type: 'mouseReleased',
      x,
      y,
      button: e.button === 2 ? 'right' : 'left',
      clickCount: 1,
    }).catch(() => undefined);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive || e.buttons === 0) return;
    const { x, y } = mapCoordinates(e.clientX, e.clientY);
    sendInput({ type: 'mouseMoved', x, y }).catch(() => undefined);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!interactive) return;
    e.preventDefault();
    const { x, y } = mapCoordinates(e.clientX, e.clientY);
    sendInput({
      type: 'mouseWheel',
      x,
      y,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
    }).catch(() => undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    e.preventDefault();

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      sendInput({ type: 'insertText', text: e.key }).catch(() => undefined);
      return;
    }

    sendInput({
      type: 'keyDown',
      key: e.key,
      code: e.code,
    }).catch(() => undefined);
  };

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    e.preventDefault();
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      return;
    }
    sendInput({
      type: 'keyUp',
      key: e.key,
      code: e.code,
    }).catch(() => undefined);
  };

  if (!frame) {
    return <BrowserStreamSkeleton className={className} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden rounded-lg border bg-black',
        interactive && 'cursor-pointer',
        className
      )}
      tabIndex={interactive ? 0 : -1}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
      <img
        ref={imgRef}
        src={`data:image/jpeg;base64,${frame.data}`}
        alt={t('streamAlt')}
        className="pointer-events-none block h-auto w-full select-none"
        draggable={false}
      />
    </div>
  );
}
