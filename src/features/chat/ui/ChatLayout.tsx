import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
  rightArea?: ReactNode;
}

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 600;
const DEFAULT_SIDEBAR_WIDTH = 280;

const MIN_RIGHT_AREA_WIDTH = 300;
const DEFAULT_RIGHT_AREA_WIDTH = 400;

export function ChatLayout({ sidebar, content, rightArea }: ChatLayoutProps) {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );
  const isRightPanelOpen = useAppSelector((state) => state.ui.isRightPanelOpen);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const [rightAreaWidth, setRightAreaWidth] = useState(() => {
    const saved = localStorage.getItem('rightAreaWidth');
    const width = saved ? parseInt(saved, 10) : DEFAULT_RIGHT_AREA_WIDTH;
    const maxWidth = window.innerWidth / 2;
    return Math.min(width, maxWidth);
  });

  const [resizingType, setResizingType] = useState<
    'sidebar' | 'rightPanel' | null
  >(null);
  const resizingTypeRef = useRef<'sidebar' | 'rightPanel' | null>(null);

  const startResizingSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingType('sidebar');
    resizingTypeRef.current = 'sidebar';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const startResizingRightPanel = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingType('rightPanel');
    resizingTypeRef.current = 'rightPanel';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    setResizingType(null);
    resizingTypeRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (!resizingTypeRef.current) return;

    if (resizingTypeRef.current === 'sidebar') {
      let newWidth = e.clientX;
      if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
      if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
      setSidebarWidth(newWidth);
      localStorage.setItem('sidebarWidth', newWidth.toString());
    } else if (resizingTypeRef.current === 'rightPanel') {
      let newWidth = window.innerWidth - e.clientX;
      const maxWidth = window.innerWidth / 2;
      if (newWidth < MIN_RIGHT_AREA_WIDTH) newWidth = MIN_RIGHT_AREA_WIDTH;
      if (newWidth > maxWidth) newWidth = maxWidth;
      setRightAreaWidth(newWidth);
      localStorage.setItem('rightAreaWidth', newWidth.toString());
    }
  }, []);

  useEffect(() => {
    const handleWindowResize = () => {
      const maxWidth = window.innerWidth / 2;
      setRightAreaWidth((prev) => Math.min(prev, maxWidth));
    };

    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [resize, stopResizing]);

  return (
    <div className="relative flex flex-1 overflow-hidden h-full">
      {/* Sidebar Container */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out',
          resizingType === 'sidebar' && 'transition-none duration-0',
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
            onMouseDown={startResizingSidebar}
            className={cn(
              'absolute top-0 right-0 bottom-0 w-0.5 cursor-col-resize z-50 transition-colors',
              'hover:bg-primary/20 hover:w-0.5',
              resizingType === 'sidebar'
                ? 'bg-primary/40 w-0.5'
                : 'bg-transparent'
            )}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {content}
      </div>

      {/* Right Area Container */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-l border-border bg-sidebar transition-[width] duration-300 ease-in-out',
          resizingType === 'rightPanel' && 'transition-none duration-0',
          !isRightPanelOpen ? 'w-0 border-l-0' : ''
        )}
        style={{ width: isRightPanelOpen ? rightAreaWidth : 0 }}
      >
        {/* Resize Handle - Left side of the right panel */}
        {isRightPanelOpen && (
          <div
            onMouseDown={startResizingRightPanel}
            className={cn(
              'absolute top-0 left-0 bottom-0 w-0.5 cursor-col-resize z-50 transition-colors',
              'hover:bg-primary/20 hover:w-0.5',
              resizingType === 'rightPanel'
                ? 'bg-primary/40 w-0.5'
                : 'bg-transparent'
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
          {rightArea}
        </div>
      </div>
    </div>
  );
}
