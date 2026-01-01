import { useAppSelector } from '@/store/hooks';

/**
 * Hook to access current theme from Redux store
 * Returns the theme value that can be used by components like Sonner
 */
export function useTheme() {
  const theme = useAppSelector((state) => state.ui.theme);

  // For Sonner and other components that expect "light" | "dark" | "system"
  // If theme is "system", we need to detect the actual system preference
  const getEffectiveTheme = (): 'light' | 'dark' | 'system' => {
    if (theme === 'system') {
      return 'system';
    }
    return theme;
  };

  return { theme: getEffectiveTheme() };
}
