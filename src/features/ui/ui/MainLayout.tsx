import {
  PanelLeftClose,
  PanelLeftOpen,
  Settings as SettingsIcon,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { WorkspaceSelector } from '@/features/workspace';
import { About } from '@/features/settings';
import { ChatSearchDialog } from '@/features/chat/ui/ChatSearchDialog';
import { KeyboardShortcutsDialog } from '@/features/shortcuts/ui/KeyboardShortcutsDialog';
import { TitleBar } from '@/features/ui/ui/TitleBar';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  toggleSidebar,
  setAboutOpen,
  navigateToSettings,
  navigateToChat,
  toggleRightPanel,
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
  const titleBarText = useAppSelector((state) => state.ui.titleBarText);
  const isRightPanelOpen = useAppSelector((state) => state.ui.isRightPanelOpen);
  const aboutOpen = useAppSelector((state) => state.ui.aboutOpen);

  const handleSettingsClick = () => {
    dispatch(navigateToSettings());
  };

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
          ) : titleBarText ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch(navigateToChat())}
                aria-label={t('back', { ns: 'common' })}
                className="h-7 w-7"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <span className="text-sm font-medium text-foreground">
                {t(titleBarText, { ns: 'settings' })}
              </span>
            </div>
          ) : null
        }
        rightContent={
          <>
            {activePage !== 'settings' && (
              <Button
                variant="ghost"
                onClick={handleSettingsClick}
                aria-label={t('settings', { ns: 'common' })}
                data-tour="settings-nav"
                className="h-7 gap-1.5 px-1.5 py-1 hover:bg-accent"
              >
                <div className="flex size-5 items-center justify-center rounded bg-primary text-primary-foreground">
                  <SettingsIcon className="size-3" />
                </div>
                <span className="text-sm font-medium">
                  {t('settings', { ns: 'common' })}
                </span>
              </Button>
            )}
            {activePage === 'chat' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => dispatch(toggleRightPanel())}
                aria-label={
                  isRightPanelOpen
                    ? t('collapseRightPanel', { ns: 'common' })
                    : t('expandRightPanel', { ns: 'common' })
                }
                className="h-7 w-7"
              >
                {isRightPanelOpen ? (
                  <PanelRightClose className="size-4" />
                ) : (
                  <PanelRightOpen className="size-4" />
                )}
              </Button>
            )}
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
