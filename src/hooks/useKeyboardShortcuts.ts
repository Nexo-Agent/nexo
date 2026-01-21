import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { setSearchOpen } from '@/features/chat/state/chatSearchSlice';
import {
  navigateToSettings,
  navigateToChat,
  setKeyboardShortcutsOpen,
  setAboutOpen,
} from '@/features/ui/state/uiSlice';
import { closeCurrentChat } from '@/features/chat/state/chatsSlice';
import { clearInput } from '@/features/chat/state/chatInputSlice';
import { createChat } from '@/features/chat/state/chatsSlice';
import { useWorkspaces } from '@/features/workspace';
import { useTranslation } from 'react-i18next';

/**
 * Hook to handle global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const dispatch = useAppDispatch();
  const { selectedWorkspaceId } = useWorkspaces();
  const { t } = useTranslation(['common']);

  // Get dialog states to determine which one to close on Esc
  const activePage = useAppSelector((state) => state.ui.activePage);
  const aboutOpen = useAppSelector((state) => state.ui.aboutOpen);
  const keyboardShortcutsOpen = useAppSelector(
    (state) => state.ui.keyboardShortcutsOpen
  );
  const searchOpen = useAppSelector((state) => state.chatSearch.searchOpen);

  // Use refs to store latest values without recreating listeners
  const dispatchRef = useRef(dispatch);
  const selectedWorkspaceIdRef = useRef(selectedWorkspaceId);
  const tRef = useRef(t);
  const activePageRef = useRef(activePage);
  const aboutOpenRef = useRef(aboutOpen);
  const keyboardShortcutsOpenRef = useRef(keyboardShortcutsOpen);
  const searchOpenRef = useRef(searchOpen);

  // Update refs when values change
  useEffect(() => {
    dispatchRef.current = dispatch;
    selectedWorkspaceIdRef.current = selectedWorkspaceId;
    tRef.current = t;
    activePageRef.current = activePage;
    aboutOpenRef.current = aboutOpen;
    keyboardShortcutsOpenRef.current = keyboardShortcutsOpen;
    searchOpenRef.current = searchOpen;
  }, [
    dispatch,
    selectedWorkspaceId,
    t,
    activePage,
    aboutOpen,
    keyboardShortcutsOpen,
    searchOpen,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInputFocused =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true');

      // Determine modifier key (Cmd on macOS, Ctrl on Windows/Linux)
      // Use userAgent as platform is deprecated and inconsistent
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      // Handle Esc key - always works, even in input fields
      if (e.key === 'Escape') {
        // Check if there are any Radix UI dialogs open (they handle Escape themselves)
        const openDialogs = document.querySelectorAll(
          '[data-slot="dialog-content"][data-state="open"]'
        );
        if (openDialogs.length > 0) {
          // Let Dialog components handle Escape via onEscapeKeyDown
          // Don't prevent default here, let the modal stack logic handle it
          return;
        }

        // Close dialogs in priority order (most specific first) - only if no Radix dialogs are open
        if (keyboardShortcutsOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setKeyboardShortcutsOpen(false));
          return;
        }
        if (searchOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setSearchOpen(false));
          return;
        }
        if (aboutOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setAboutOpen(false));
          return;
        }

        // If on Settings page, navigate back to Chat
        if (activePageRef.current === 'settings') {
          e.preventDefault();
          dispatchRef.current(navigateToChat());
          return;
        }

        return;
      }

      // Skip other shortcuts if user is typing in an input field
      if (isInputFocused && e.key !== 'Escape') {
        return;
      }

      // Cmd/Ctrl + K: Open chat search
      if (modifierKey && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        dispatchRef.current(setSearchOpen(true));
        return;
      }

      // Cmd/Ctrl + N: Create new chat
      if (modifierKey && e.key === 'n') {
        e.preventDefault();
        e.stopPropagation();
        const currentWorkspaceId = selectedWorkspaceIdRef.current;
        if (currentWorkspaceId) {
          dispatchRef.current(
            createChat({
              workspaceId: currentWorkspaceId,
              title: tRef.current('newConversation', { ns: 'common' }),
            })
          );
        }
        return;
      }

      // Cmd/Ctrl + ,: Open settings
      if (modifierKey && e.key === ',') {
        e.preventDefault();
        e.stopPropagation();
        dispatchRef.current(navigateToSettings());
        return;
      }

      // Cmd/Ctrl + W: Close current chat
      if (modifierKey && e.key === 'w') {
        e.preventDefault();
        e.stopPropagation();
        dispatchRef.current(closeCurrentChat());
        dispatchRef.current(clearInput());
        return;
      }

      // Cmd/Ctrl + /: Show keyboard shortcuts
      if (modifierKey && e.key === '/') {
        e.preventDefault();
        e.stopPropagation();
        dispatchRef.current(setKeyboardShortcutsOpen(true));
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // Setup only once on mount
}
