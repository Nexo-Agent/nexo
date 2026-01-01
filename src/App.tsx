import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { AppLayout } from '@/ui/AppLayout';
import { Toaster } from '@/ui/atoms/sonner';
import { DialogOriginProvider } from '@/ui/atoms/dialog/provider';
import { ModalStackProvider } from '@/ui/atoms/modal-stack';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMenuEvents } from '@/hooks/useMenuEvents';
import { useChatStreaming } from '@/hooks/useChatStreaming';
import {
  loadAppSettings,
  checkFirstLaunch,
  setWelcomeOpen,
} from '@/store/slices/uiSlice';
import { Welcome } from '@/ui/Welcome';
import i18n from '@/i18n/config';

function AppContent() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.ui.language);
  const theme = useAppSelector((state) => state.ui.theme);
  const welcomeOpen = useAppSelector((state) => state.ui.welcomeOpen);
  const loading = useAppSelector((state) => state.ui.loading);

  // Listen for notification events
  useNotificationListener();

  // Handle keyboard shortcuts
  useKeyboardShortcuts();

  // Handle menu events
  useMenuEvents();

  // Listen for chat streaming events from Rust core
  useChatStreaming();

  // Load all app settings from database on mount
  useEffect(() => {
    dispatch(loadAppSettings());
  }, [dispatch]);

  // Check first launch after settings are loaded (only once)
  useEffect(() => {
    if (!loading) {
      dispatch(checkFirstLaunch());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // Only run when loading changes from true to false

  // Sync Redux state with i18n when language changes
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      // light theme
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      <AppLayout />
      <Toaster />
      <Welcome
        open={welcomeOpen}
        onOpenChange={(open) => dispatch(setWelcomeOpen(open))}
      />
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <DialogOriginProvider>
        <ModalStackProvider>
          <AppContent />
        </ModalStackProvider>
      </DialogOriginProvider>
    </Provider>
  );
}

export default App;
