import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 280;

export function ChatLayout({ sidebar, content }: ChatLayoutProps) {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    isResizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;

    let newWidth = e.clientX;
    if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
    if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;

    setSidebarWidth(newWidth);
    localStorage.setItem('sidebarWidth', newWidth.toString());
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className="relative flex flex-1 overflow-hidden h-full">
      {/* Sidebar Container */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-r border-border bg-sidebar transition-all duration-300 ease-in-out',
          isResizing && 'transition-none duration-0',
          isSidebarCollapsed ? 'w-0 border-r-0' : ''
        )}
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <div
          className={cn(
            'h-full transition-opacity duration-300 ease-in-out',
            isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
          style={{ width: sidebarWidth }}
        >
          {sidebar}
        </div>

        {/* Resize Handle - Invisible but draggable handle */}
        {!isSidebarCollapsed && (
          <div
            onMouseDown={startResizing}
            className={cn(
              'absolute top-0 right-0 bottom-0 w-0.5 cursor-col-resize z-50 transition-colors',
              'hover:bg-primary/20 hover:w-0.5',
              isResizing ? 'bg-primary/40 w-0.5' : 'bg-transparent'
            )}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {content}
      </div>
    </div>
  );
}
