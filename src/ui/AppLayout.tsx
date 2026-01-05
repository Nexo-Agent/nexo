import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Info,
  Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { WorkspaceSelector } from '@/ui/workspace/WorkspaceSelector';
import { About } from '@/ui/settings/About';
import { ChatSearchDialog } from '@/ui/chat-search/ChatSearchDialog';
import { KeyboardShortcutsDialog } from '@/ui/KeyboardShortcutsDialog';
import { TitleBar } from '@/ui/TitleBar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDialogClick } from '@/hooks/useDialogClick';
import {
  toggleSidebar,
  setAboutOpen,
  navigateToSettings,
  setSettingsSection,
} from '@/store/slices/uiSlice';

// Pages
import { ChatPage } from '@/pages/chat';
import { SettingsPage } from '@/pages/settings';
import { WorkspaceSettingsPage } from '@/pages/workspace-settings';

export function AppLayout() {
  const { t } = useTranslation(['common', 'settings']);
  const dispatch = useAppDispatch();

  const isSidebarCollapsed = useAppSelector(
    (state) => state.ui.isSidebarCollapsed
  );
  const activePage = useAppSelector((state) => state.ui.activePage);
  const settingsSection = useAppSelector((state) => state.ui.settingsSection);
  const aboutOpen = useAppSelector((state) => state.ui.aboutOpen);

  const handleSettingsClick = () => {
    dispatch(navigateToSettings());
  };

  const handleAboutClick = useDialogClick(() => dispatch(setAboutOpen(true)));

  return (
    <div className="flex h-screen flex-col bg-background select-none">
      {/* Custom Title Bar with integrated app content - Only show complex title bar on Chat Page? 
          Actually, we want TitleBar everywhere. 
          But the content of TitleBar (Sidebar toggle, Workspace Selector) might be specific to ChatPage.
          Let's adjust TitleBar usage.
      */}
      <TitleBar
        leftContent={
          activePage === 'chat' ? (
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
          ) : (
            // Keep Workspace Selector in Settings? Or just the Back button (handled in SettingsPage)
            // Maybe empty left content for Settings Page, as it has its own header/sidebar
            <div className="flex items-center gap-2">
              {/* Optional: Breadcrumbs or Title */}
            </div>
          )
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
              onClick={() => {
                dispatch(navigateToSettings());
                dispatch(setSettingsSection('agent'));
              }}
              aria-label="Agents"
              className={
                activePage === 'settings' && settingsSection === 'agent'
                  ? 'bg-accent text-accent-foreground h-7 w-7'
                  : 'h-7 w-7'
              }
            >
              <Bot className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSettingsClick}
              aria-label={t('settings', { ns: 'common' })}
              className={
                activePage === 'settings' && settingsSection !== 'agent'
                  ? 'bg-accent text-accent-foreground h-7 w-7'
                  : 'h-7 w-7'
              }
            >
              <SettingsIcon className="size-4" />
            </Button>
          </>
        }
      />

      {/* Main Content Area */}
      {activePage === 'chat' && <ChatPage />}
      {activePage === 'settings' && <SettingsPage />}
      {activePage === 'workspaceSettings' && <WorkspaceSettingsPage />}

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
