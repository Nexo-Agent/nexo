import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  Info,
  Bot,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { WorkspaceSelector } from '@/features/workspace';
import { About } from '@/features/settings';
import { ChatSearchDialog } from '@/features/chat/ui/ChatSearchDialog';
import { KeyboardShortcutsDialog } from '@/features/shortcuts/ui/KeyboardShortcutsDialog';
import { TitleBar } from '@/features/ui/ui/TitleBar';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { useDialogClick } from '@/hooks/useDialogClick';
import {
  toggleSidebar,
  setAboutOpen,
  navigateToSettings,
  setSettingsSection,
} from '@/features/ui/state/uiSlice';

// Screens
import { ChatScreen } from '@/features/chat/ui/ChatScreen';
import { SettingsScreen } from '@/features/settings/ui/SettingsScreen';
import { WorkspaceSettingsScreen } from '@/features/workspace/ui/WorkspaceSettingsScreen';

export function MainLayout() {
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
              data-tour="settings-nav"
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
      {activePage === 'chat' && <ChatScreen />}
      {activePage === 'settings' && <SettingsScreen />}
      {activePage === 'workspaceSettings' && <WorkspaceSettingsScreen />}

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
