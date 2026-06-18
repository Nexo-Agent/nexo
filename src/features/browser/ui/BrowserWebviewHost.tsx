import { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { releaseBrowserViewport, syncBrowserBounds } from '../state/browserApi';
import type { BrowserViewport } from '../types';
import { BrowserStreamSkeleton } from './BrowserStreamSkeleton';

interface BrowserWebviewHostProps {
  tabId: string;
  viewport?: BrowserViewport;
  anchorId?: string;
  className?: string;
}

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth)
    return false;
  return true;
}

export function BrowserWebviewHost({
  tabId,
  viewport = 'main_panel',
  anchorId,
  className,
}: BrowserWebviewHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const reportBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const visible = isElementVisible(el);

    syncBrowserBounds(
      tabId,
      viewport,
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible,
      },
      anchorId
    ).catch(() => undefined);
  }, [tabId, viewport, anchorId]);

  const scheduleReport = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      reportBounds();
    });
  }, [reportBounds]);

  useEffect(() => {
    reportBounds();

    const el = containerRef.current;
    if (!el) return undefined;

    const observer = new ResizeObserver(() => {
      scheduleReport();
    });
    observer.observe(el);

    const handleWindowChange = () => scheduleReport();
    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      syncBrowserBounds(
        tabId,
        viewport,
        { x: 0, y: 0, width: 0, height: 0, visible: false },
        anchorId
      ).catch(() => undefined);
      releaseBrowserViewport(viewport, anchorId).catch(() => undefined);
    };
  }, [tabId, viewport, anchorId, reportBounds, scheduleReport]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-64 overflow-hidden rounded-lg border bg-muted/20',
        className
      )}
    >
      <BrowserStreamSkeleton className="pointer-events-none absolute inset-0 rounded-none border-0" />
    </div>
  );
}
