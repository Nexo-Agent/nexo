import {
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/ui/atoms/button/button';
import { About } from '@/features/settings';
import { ChatSearchDialog } from '@/features/chat/ui/ChatSearchDialog';
import { ChatRightPanel } from '@/features/chat/ui/ChatRightPanel';
import { KeyboardShortcutsDialog } from '@/features/shortcuts/ui/KeyboardShortcutsDialog';
import { TitleBar } from '@/features/ui/ui/TitleBar';
import { ResizableRightPanel } from '@/features/ui/ui/ResizableRightPanel';
import {
  useRightPanelWidth,
  useSidebarWidth,
  SETTINGS_SIDEBAR_WIDTH,
} from '@/features/ui/hooks/useLayoutWidths';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  toggleSidebar,
  setAboutOpen,
  navigateToChat,
  toggleRightPanel,
  setWorkspaceSettingsOpen,
} from '@/features/ui/state/uiSlice';

// Screens
import { ChatScreen } from '@/features/chat/ui/ChatScreen';
import { SettingsScreen } from '@/features/settings/ui/SettingsScreen';
import { WorkspaceSettingsDialog } from '@/features/workspace';

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
  const workspaceSettingsOpen = useAppSelector(
    (state) => state.ui.workspaceSettingsOpen
  );
  const sidebarWidth = useSidebarWidth();
  const rightPanelWidth = useRightPanelWidth();
  const isChatSidebarCollapsed = activePage === 'chat' && isSidebarCollapsed;
  const sidebarZoneWidth = isChatSidebarCollapsed
    ? undefined
    : activePage === 'chat'
      ? sidebarWidth
      : SETTINGS_SIDEBAR_WIDTH;

  return (
    <div className="flex h-screen flex-col bg-background select-none">
      <TitleBar
        sidebarZoneWidth={sidebarZoneWidth}
        isSidebarCollapsed={isChatSidebarCollapsed}
        rightPanelWidth={rightPanelWidth}
        isRightPanelOpen={isRightPanelOpen}
        leftContent={
          activePage === 'chat' ? (
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
        }
      />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {activePage === 'chat' && <ChatScreen />}
          {activePage === 'settings' && <SettingsScreen />}
        </div>
        <ResizableRightPanel>
          <ChatRightPanel />
        </ResizableRightPanel>
      </div>

      {/* About Dialog */}
      <About
        open={aboutOpen}
        onOpenChange={(open) => dispatch(setAboutOpen(open))}
      />

      <WorkspaceSettingsDialog
        open={workspaceSettingsOpen || activePage === 'workspaceSettings'}
        onOpenChange={(open) => {
          dispatch(setWorkspaceSettingsOpen(open));
          if (!open && activePage === 'workspaceSettings') {
            dispatch(navigateToChat());
          }
        }}
      />

      {/* Chat Search Dialog */}
      <ChatSearchDialog />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog />
    </div>
  );
}
