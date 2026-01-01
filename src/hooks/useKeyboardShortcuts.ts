import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setSearchOpen } from '@/store/slices/chatSearchSlice';
import {
  setSettingsOpen,
  setKeyboardShortcutsOpen,
  setAboutOpen,
  setWorkspaceSettingsOpen,
  setWelcomeOpen,
} from '@/store/slices/uiSlice';
import { closeCurrentChat } from '@/store/slices/chatsSlice';
import { clearInput } from '@/store/slices/chatInputSlice';
import { createChat } from '@/store/slices/chatsSlice';
import { useWorkspaces } from './useWorkspaces';
import { useTranslation } from 'react-i18next';

/**
 * Hook to handle global keyboard shortcuts
 */
export function useKeyboardShortcuts() {
  const dispatch = useAppDispatch();
  const { selectedWorkspaceId } = useWorkspaces();
  const { t } = useTranslation(['common']);

  // Get dialog states to determine which one to close on Esc
  const settingsOpen = useAppSelector((state) => state.ui.settingsOpen);
  const workspaceSettingsOpen = useAppSelector(
    (state) => state.ui.workspaceSettingsOpen
  );
  const aboutOpen = useAppSelector((state) => state.ui.aboutOpen);
  const keyboardShortcutsOpen = useAppSelector(
    (state) => state.ui.keyboardShortcutsOpen
  );
  const searchOpen = useAppSelector((state) => state.chatSearch.searchOpen);
  const welcomeOpen = useAppSelector((state) => state.ui.welcomeOpen);

  // Use refs to store latest values without recreating listeners
  const dispatchRef = useRef(dispatch);
  const selectedWorkspaceIdRef = useRef(selectedWorkspaceId);
  const tRef = useRef(t);
  const settingsOpenRef = useRef(settingsOpen);
  const workspaceSettingsOpenRef = useRef(workspaceSettingsOpen);
  const aboutOpenRef = useRef(aboutOpen);
  const keyboardShortcutsOpenRef = useRef(keyboardShortcutsOpen);
  const searchOpenRef = useRef(searchOpen);
  const welcomeOpenRef = useRef(welcomeOpen);

  // Update refs when values change
  useEffect(() => {
    dispatchRef.current = dispatch;
    selectedWorkspaceIdRef.current = selectedWorkspaceId;
    tRef.current = t;
    settingsOpenRef.current = settingsOpen;
    workspaceSettingsOpenRef.current = workspaceSettingsOpen;
    aboutOpenRef.current = aboutOpen;
    keyboardShortcutsOpenRef.current = keyboardShortcutsOpen;
    searchOpenRef.current = searchOpen;
    welcomeOpenRef.current = welcomeOpen;
  }, [
    dispatch,
    selectedWorkspaceId,
    t,
    settingsOpen,
    workspaceSettingsOpen,
    aboutOpen,
    keyboardShortcutsOpen,
    searchOpen,
    welcomeOpen,
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
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
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
        if (workspaceSettingsOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setWorkspaceSettingsOpen(false));
          return;
        }
        if (settingsOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setSettingsOpen(false));
          return;
        }
        if (aboutOpenRef.current) {
          e.preventDefault();
          dispatchRef.current(setAboutOpen(false));
          return;
        }
        if (welcomeOpenRef.current) {
          e.preventDefault();
          // Welcome dialog is handled by its own component
          return;
        }
        return;
      }

      // Cmd/Ctrl + Shift + H: Open welcome screen (for debug)
      // Check this first before other shortcuts to avoid conflicts
      // Use toLowerCase() to handle both uppercase and lowercase
      if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        e.stopPropagation();
        dispatchRef.current(setWelcomeOpen(true));
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
        dispatchRef.current(setSettingsOpen(true));
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
