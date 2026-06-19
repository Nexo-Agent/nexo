import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/hooks';
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

const PANEL_OPEN_RESYNC_DELAYS_MS = [50, 350, 500] as const;

function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.bottom < 0 || rect.right < 0) return false;
  if (rect.top > window.innerHeight || rect.left > window.innerWidth)
    return false;
  return true;
}

export function resolveWebviewVisible(
  viewport: BrowserViewport,
  geometryVisible: boolean,
  isRightPanelOpen: boolean,
  rightPanelTab: string
): boolean {
  if (!geometryVisible) return false;

  if (viewport === 'main_panel') {
    return isRightPanelOpen && rightPanelTab === 'browser';
  }

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
  const isRightPanelOpen = useAppSelector((state) => state.ui.isRightPanelOpen);
  const rightPanelTab = useAppSelector((state) => state.ui.rightPanelTab);

  const reportBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const geometryVisible = isElementVisible(el);
    const effectiveVisible = resolveWebviewVisible(
      viewport,
      geometryVisible,
      isRightPanelOpen,
      rightPanelTab
    );

    syncBrowserBounds(
      tabId,
      viewport,
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: effectiveVisible,
      },
      anchorId
    ).catch(() => undefined);
  }, [tabId, viewport, anchorId, isRightPanelOpen, rightPanelTab]);

  const reportBoundsRef = useRef(reportBounds);

  useEffect(() => {
    reportBoundsRef.current = reportBounds;
  }, [reportBounds]);

  const scheduleReport = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      reportBoundsRef.current();
    });
  }, []);

  useEffect(() => {
    scheduleReport();

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
  }, [tabId, viewport, anchorId, scheduleReport]);

  useEffect(() => {
    reportBoundsRef.current();
  }, [reportBounds]);

  useEffect(() => {
    if (viewport !== 'main_panel') return;

    const panelActive = isRightPanelOpen && rightPanelTab === 'browser';

    if (!panelActive) {
      syncBrowserBounds(
        tabId,
        viewport,
        { x: 0, y: 0, width: 0, height: 0, visible: false },
        anchorId
      ).catch(() => undefined);
      return;
    }

    reportBoundsRef.current();
    const timeouts = PANEL_OPEN_RESYNC_DELAYS_MS.map((delay) =>
      window.setTimeout(() => reportBoundsRef.current(), delay)
    );
    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [tabId, viewport, anchorId, isRightPanelOpen, rightPanelTab]);

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
