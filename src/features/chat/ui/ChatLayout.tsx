import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
}

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const DEFAULT_SIDEBAR_WIDTH = 240;

export const CHAT_WIDTH_CLASSES =
  'mx-auto max-w-2xl lg:max-w-3xl xl:max-w-4xl px-3';

export function ChatLayout({ sidebar, content }: ChatLayoutProps) {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const [resizingSidebar, setResizingSidebar] = useState(false);

  const startResizingSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizingSidebar(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizingSidebar = useCallback(() => {
    setResizingSidebar(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resizeSidebar = useCallback((e: MouseEvent) => {
    let newWidth = e.clientX;
    if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
    if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
    setSidebarWidth(newWidth);
    localStorage.setItem('sidebarWidth', newWidth.toString());
  }, []);

  useEffect(() => {
    if (!resizingSidebar) return;

    window.addEventListener('mousemove', resizeSidebar);
    window.addEventListener('mouseup', stopResizingSidebar);
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
      window.removeEventListener('mouseup', stopResizingSidebar);
    };
  }, [resizeSidebar, resizingSidebar, stopResizingSidebar]);

  return (
    <div className="relative flex flex-1 overflow-hidden h-full">
      {/* Sidebar Container */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out',
          resizingSidebar && 'transition-none duration-0',
          isSidebarCollapsed ? 'w-0 border-r-0' : ''
        )}
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
      >
        <div
          className={cn(
            'h-full overflow-hidden transition-opacity duration-300 ease-in-out',
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
              resizingSidebar ? 'bg-primary/40 w-0.5' : 'bg-transparent'
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
