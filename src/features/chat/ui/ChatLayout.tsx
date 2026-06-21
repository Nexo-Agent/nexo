import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { toggleSidebar } from '@/features/ui/state/uiSlice';
import { cn } from '@/lib/utils';
import {
  DEFAULT_SIDEBAR_WIDTH,
  usePersistSidebarWidth,
} from '@/features/ui/hooks/useLayoutWidths';
import { SidebarResizer } from './SidebarResizer';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
}

const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;

export const CHAT_WIDTH_CLASSES =
  'mx-auto max-w-2xl lg:max-w-3xl xl:max-w-4xl px-3';

export function ChatLayout({ sidebar, content }: ChatLayoutProps) {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
  });

  const persistSidebarWidth = usePersistSidebarWidth();

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

  const resizeSidebar = useCallback(
    (e: MouseEvent) => {
      let newWidth = e.clientX;
      if (newWidth < MIN_SIDEBAR_WIDTH) newWidth = MIN_SIDEBAR_WIDTH;
      if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
      setSidebarWidth(newWidth);
      persistSidebarWidth(newWidth);
    },
    [persistSidebarWidth]
  );

  const handleResizeEnd = useCallback(
    (didDrag: boolean) => {
      stopResizingSidebar();
      if (!didDrag) {
        dispatch(toggleSidebar());
      }
    },
    [dispatch, stopResizingSidebar]
  );

  useEffect(() => {
    if (!resizingSidebar) return;

    window.addEventListener('mousemove', resizeSidebar);
    return () => {
      window.removeEventListener('mousemove', resizeSidebar);
    };
  }, [resizeSidebar, resizingSidebar]);

  return (
    <div className="relative flex flex-1 overflow-hidden h-full">
      {/* Sidebar Container */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-sidebar transition-[width] duration-300 ease-in-out',
          resizingSidebar && 'transition-none duration-0',
          isSidebarCollapsed ? 'w-0' : ''
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
      </div>

      {!isSidebarCollapsed ? (
        <SidebarResizer
          isResizing={resizingSidebar}
          style={{ left: sidebarWidth }}
          onResizeStart={startResizingSidebar}
          onResizeEnd={handleResizeEnd}
        />
      ) : null}

      {/* Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {content}
      </div>
    </div>
  );
}
