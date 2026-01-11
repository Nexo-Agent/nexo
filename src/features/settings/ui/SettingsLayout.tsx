import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/ui/atoms/button/button';
import { useAppDispatch } from '@/app/hooks';
import { navigateToChat } from '@/features/ui/state/uiSlice';
import { ScrollArea } from '@/ui/atoms/scroll-area';

interface SettingsLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  title: string;
}

export function SettingsLayout({
  children,
  sidebar,
  title,
}: SettingsLayoutProps) {
  const dispatch = useAppDispatch();

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-64 lg:w-72 xl:w-80 border-r border-sidebar-border bg-sidebar flex flex-col shrink-0">
        <div className="p-4 border-b border-sidebar-border flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dispatch(navigateToChat())}
            className="h-8 w-8"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <ScrollArea className="flex-1">{sidebar}</ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pb-4">{children}</div>
    </div>
  );
}
