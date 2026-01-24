import { FileText, Layout, Info, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotesPanel } from '@/features/notes/ui/NotesPanel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/atoms/tooltip';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setRightPanelTab } from '@/features/ui/state/uiSlice';

export function ChatRightPanel() {
  const dispatch = useAppDispatch();
  const activeTab = useAppSelector((state) => state.ui.rightPanelTab);

  const tabs = [
    { id: 'notes' as const, icon: FileText, label: 'Notes' },
    { id: 'skills' as const, icon: Code2, label: 'Skills' },
    { id: 'info' as const, icon: Info, label: 'Chat Info' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'notes':
        return <NotesPanel />;
      default:
        return (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <Layout className="size-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-foreground">
              {tabs.find((t) => t.id === activeTab)?.label} coming soon
            </h3>
            <p className="max-w-[200px] text-sm text-muted-foreground">
              This area will contain secondary tools, context, or visualizations
              for {activeTab}.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col bg-background border-l border-border">
      {/* Topbar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/50 backdrop-blur-md px-1 pr-3">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <Tooltip key={tab.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => dispatch(setRightPanelTab(tab.id))}
                  className={cn(
                    'relative flex size-9 items-center justify-center rounded-md transition-colors duration-200',
                    activeTab === tab.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                  )}
                >
                  <tab.icon className="size-4" />
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-primary" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {tab.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden bg-linear-to-b from-background to-accent/5">
        {renderContent()}
      </div>
    </div>
  );
}
