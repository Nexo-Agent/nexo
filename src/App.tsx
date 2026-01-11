import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/app/store';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { MainLayout } from '@/features/ui/ui/MainLayout';
import { Toaster } from '@/ui/atoms/sonner';
import { DialogOriginProvider } from '@/ui/atoms/dialog/provider';
import { ModalStackProvider } from '@/ui/atoms/modal-stack';
import { useNotificationListener } from '@/hooks/useNotificationListener';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMenuEvents } from '@/hooks/useMenuEvents';
import { useChatStreaming } from '@/features/chat/hooks/useChatStreaming';
import {
  loadAppSettings,
  checkFirstLaunch,
  setWelcomeOpen,
} from '@/features/ui/state/uiSlice';
import { WelcomeScreen } from '@/features/onboarding/ui/WelcomeScreen';
import OnboardingGuide from '@/features/onboarding/ui/OnboardingGuide';
import { OnboardingScreen } from '@/features/onboarding/ui/OnboardingScreen';
import { useWorkspaces } from '@/features/workspace';
import i18n from '@/i18n/config';

function AppContent() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.ui.language);
  const theme = useAppSelector((state) => state.ui.theme);
  const welcomeOpen = useAppSelector((state) => state.ui.welcomeOpen);
  const loading = useAppSelector((state) => state.ui.loading);

  const { workspaces } = useWorkspaces();

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
    const allThemes = [
      'theme-github-light',
      'theme-github-dark',
      'theme-gruvbox',
      'theme-midnight',
      'theme-dracula',
    ];
    root.classList.remove(...allThemes);

    if (theme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

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
    }

    if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add(`theme-${theme}`);
      const isDark = ['github-dark', 'gruvbox', 'midnight', 'dracula'].includes(
        theme
      );
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [theme]);

  // Show onboarding if no workspaces exist
  const showOnboarding = workspaces.length === 0;

  return (
    <>
      {!loading && showOnboarding ? <OnboardingScreen /> : <MainLayout />}
      <Toaster />
      <WelcomeScreen
        open={welcomeOpen}
        onOpenChange={(open) => dispatch(setWelcomeOpen(open))}
      />
      <OnboardingGuide />
    </>
  );
}

import { ErrorBoundary } from '@/ui/atoms/ErrorBoundary';

function App() {
  return (
    <Provider store={store}>
      <DialogOriginProvider>
        <ModalStackProvider>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </ModalStackProvider>
      </DialogOriginProvider>
    </Provider>
  );
}

export default App;
