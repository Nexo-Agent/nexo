import { ReactNode } from 'react';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
}

export function ChatLayout({ sidebar, content }: ChatLayoutProps) {
  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );

  return (
    <div className="relative flex flex-1 overflow-hidden h-full">
      {/* Sidebar */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
          isSidebarCollapsed ? 'w-0' : 'w-64 lg:w-72 xl:w-80'
        )}
      >
        <div
          className={cn(
            'h-full transition-opacity duration-300 ease-in-out',
            isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          {sidebar}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {content}
      </div>
    </div>
  );
}
