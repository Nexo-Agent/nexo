import { ReactNode, useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';
import {
  DEFAULT_RIGHT_PANEL_WIDTH,
  usePersistRightPanelWidth,
} from '@/features/ui/hooks/useLayoutWidths';

const MIN_RIGHT_AREA_WIDTH = 300;

interface ResizableRightPanelProps {
  children: ReactNode;
}

export function ResizableRightPanel({ children }: ResizableRightPanelProps) {
  const isRightPanelOpen = useAppSelector((state) => state.ui.isRightPanelOpen);
  const [rightAreaWidth, setRightAreaWidth] = useState(() => {
    const saved = localStorage.getItem('rightAreaWidth');
    const width = saved ? parseInt(saved, 10) : DEFAULT_RIGHT_PANEL_WIDTH;
    const maxWidth = window.innerWidth / 2;
    return Math.min(width, maxWidth);
  });
  const persistRightPanelWidth = usePersistRightPanelWidth();
  const [resizing, setResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    setResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      let newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth / 2;
      if (newWidth < MIN_RIGHT_AREA_WIDTH) newWidth = MIN_RIGHT_AREA_WIDTH;
      if (newWidth > maxWidth) newWidth = maxWidth;
      setRightAreaWidth(newWidth);
      persistRightPanelWidth(newWidth);
    },
    [persistRightPanelWidth]
  );

  const handleWindowResize = useCallback(() => {
    const maxWidth = window.innerWidth / 2;
    setRightAreaWidth((prev) => {
      const next = Math.min(prev, maxWidth);
      if (next !== prev) {
        persistRightPanelWidth(next);
      }
      return next;
    });
  }, [persistRightPanelWidth]);

  useEffect(() => {
    if (!resizing) return;

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, resizing, stopResizing]);

  useEffect(() => {
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [handleWindowResize]);

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-sidebar transition-[width] duration-300 ease-in-out',
        resizing && 'transition-none duration-0',
        !isRightPanelOpen ? 'w-0' : ''
      )}
      style={{ width: isRightPanelOpen ? rightAreaWidth : 0 }}
    >
      {isRightPanelOpen && (
        <div
          onMouseDown={startResizing}
          className={cn(
            'absolute top-0 left-0 bottom-0 w-0.5 cursor-col-resize z-50 transition-colors',
            'hover:bg-primary/20 hover:w-0.5',
            resizing ? 'bg-primary/40 w-0.5' : 'bg-transparent'
          )}
        />
      )}

      <div
        className={cn(
          'h-full transition-opacity duration-300 ease-in-out',
          !isRightPanelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        )}
        style={{ width: rightAreaWidth }}
      >
        {children}
      </div>
    </div>
  );
}
