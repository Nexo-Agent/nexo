import { useAppSelector, useAppDispatch } from '@/app/hooks';
import {
  setLanguage,
  setTheme,
  setShowUsage,
  setEnableWorkflowEditor,
  setEnableRawText,
  setEnableAgents,
  loadAppSettings,
} from '@/features/ui/state/uiSlice';

type Theme =
  | 'light'
  | 'dark'
  | 'system'
  | 'github-light'
  | 'github-dark'
  | 'gruvbox'
  | 'dracula'
  | 'solarized-light'
  | 'solarized-dark'
  | 'one-dark-pro'
  | 'one-light'
  | 'monokai'
  | 'nord'
  | 'ayu-dark';

/**
 * Hook to access and manage app settings (language and theme)
 */
export function useAppSettings() {
  const dispatch = useAppDispatch();
  const language = useAppSelector((state) => state.ui.language);
  const theme = useAppSelector((state) => state.ui.theme);
  const loading = useAppSelector((state) => state.ui.loading);
  const showUsage = useAppSelector((state) => state.ui.experiments.showUsage);
  const enableWorkflowEditor = useAppSelector(
    (state) => state.ui.experiments.enableWorkflowEditor
  );
  const enableRawText = useAppSelector(
    (state) => state.ui.experiments.enableRawText
  );
  const enableAgents = useAppSelector(
    (state) => state.ui.experiments.enableAgents
  );

  const updateLanguage = (lang: 'vi' | 'en') => {
    dispatch(setLanguage(lang));
  };

  const updateTheme = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
  };

  const updateShowUsage = (show: boolean) => {
    dispatch(setShowUsage(show));
  };

  const updateEnableWorkflowEditor = (enable: boolean) => {
    dispatch(setEnableWorkflowEditor(enable));
  };

  const updateEnableRawText = (enable: boolean) => {
    dispatch(setEnableRawText(enable));
  };

  const updateEnableAgents = (enable: boolean) => {
    dispatch(setEnableAgents(enable));
  };

  const reloadSettings = () => {
    dispatch(loadAppSettings());
  };

  return {
    language,
    theme,
    loading,
    showUsage,
    enableWorkflowEditor,
    enableRawText,
    enableAgents,
    updateLanguage,
    updateTheme,
    updateShowUsage,
    updateEnableWorkflowEditor,
    updateEnableRawText,
    updateEnableAgents,
    reloadSettings,
  };
}
