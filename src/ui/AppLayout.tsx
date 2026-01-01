import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Info,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { WorkspaceSelector } from '@/ui/workspace/WorkspaceSelector';
import { ChatSidebar } from '@/ui/ChatSidebar';
import { ChatArea } from '@/ui/chat-area/ChatArea';
import { Settings } from '@/ui/settings/Settings';
import { WorkspaceSettingsDialog } from '@/ui/workspace/WorkspaceSettings';
import { About } from '@/ui/settings/About';
import { ChatSearchDialog } from '@/ui/chat-search/ChatSearchDialog';
import { KeyboardShortcutsDialog } from '@/ui/KeyboardShortcutsDialog';
import { TitleBar } from '@/ui/TitleBar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { cn } from '@/lib/utils';
import { useDialogClick } from '@/hooks/useDialogClick';
import {
  toggleSidebar,
  setSettingsOpen,
  setWorkspaceSettingsOpen,
  setAboutOpen,
} from '@/store/slices/uiSlice';

export function AppLayout() {
  const { t } = useTranslation(['common', 'settings']);
  const dispatch = useAppDispatch();

  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );
  const settingsOpen = useAppSelector((state) => state.ui.settingsOpen);
  const settingsSection = useAppSelector((state) => state.ui.settingsSection);
  const workspaceSettingsOpen = useAppSelector(
    (state) => state.ui.workspaceSettingsOpen
  );
  const aboutOpen = useAppSelector((state) => state.ui.aboutOpen);

  const handleSettingsClick = useDialogClick(() =>
    dispatch(setSettingsOpen(true))
  );
  const handleAboutClick = useDialogClick(() => dispatch(setAboutOpen(true)));

  return (
    <div className="flex h-screen flex-col bg-background select-none">
      {/* Custom Title Bar with integrated app content */}
      <TitleBar
        leftContent={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(toggleSidebar())}
              aria-label={
                isSidebarCollapsed
                  ? t('expandSidebar', { ns: 'common' })
                  : t('collapseSidebar', { ns: 'common' })
              }
              className="h-7 w-7"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
            <WorkspaceSelector />
          </>
        }
        rightContent={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleAboutClick}
              aria-label={t('about', { ns: 'common' })}
              className="h-7 w-7"
            >
              <Info className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              aria-label={t('settings', { ns: 'common' })}
              className="h-7 w-7"
            >
              <SettingsIcon className="size-4" />
            </Button>
          </>
        }
      />

      {/* Main Content Area */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={cn(
            'relative shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
            isSidebarCollapsed ? 'w-0' : 'w-64'
          )}
        >
          <div
            className={cn(
              'h-full transition-opacity duration-300 ease-in-out',
              isSidebarCollapsed
                ? 'opacity-0 pointer-events-none'
                : 'opacity-100'
            )}
          >
            <ChatSidebar />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <ChatArea />
        </div>
      </div>

      {/* Settings Dialog */}
      <Settings
        open={settingsOpen}
        onOpenChange={(open) => dispatch(setSettingsOpen(open))}
        initialSection={settingsSection}
      />

      {/* Workspace Settings Dialog */}
      <WorkspaceSettingsDialog
        open={workspaceSettingsOpen}
        onOpenChange={(open) => dispatch(setWorkspaceSettingsOpen(open))}
      />

      {/* About Dialog */}
      <About
        open={aboutOpen}
        onOpenChange={(open) => dispatch(setAboutOpen(open))}
      />

      {/* Chat Search Dialog */}
      <ChatSearchDialog />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
    </div>
  );
}
