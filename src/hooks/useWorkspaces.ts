import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Workspace, WorkspaceSettings } from '@/store/types';
import {
  fetchWorkspaces,
  createWorkspace,
  setSelectedWorkspace,
  updateWorkspaceName,
  deleteWorkspace,
} from '@/store/slices/workspacesSlice';
import {
  fetchWorkspaceSettings,
  saveWorkspaceSettings,
} from '@/store/slices/workspaceSettingsSlice';
import { fetchLLMConnections } from '@/store/slices/llmConnectionsSlice';
import { fetchMCPConnections } from '@/store/slices/mcpConnectionsSlice';
import { showError, showSuccess } from '@/store/slices/notificationSlice';
import { setSelectedModel } from '@/store/slices/chatInputSlice';
import { clearAllChats } from '@/store/slices/chatsSlice';

/**
 * Hook to access and manage workspaces
 */
export function useWorkspaces() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['common', 'settings']);

  // Selectors
  const workspaces = useAppSelector((state) => state.workspaces.workspaces);
  const selectedWorkspaceId = useAppSelector(
    (state) => state.workspaces.selectedWorkspaceId
  );
  const selectedWorkspace = useMemo(
    () => workspaces.find((w) => w.id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId]
  );
  const workspaceSettings = useAppSelector(
    (state) => state.workspaceSettings.settingsByWorkspaceId
  );

  // Load connections and workspaces on mount
  useEffect(() => {
    dispatch(fetchLLMConnections());
    dispatch(fetchMCPConnections());
    dispatch(fetchWorkspaces());
  }, [dispatch]);

  // Load workspace settings when workspace changes
  useEffect(() => {
    if (!selectedWorkspace) return;

    dispatch(
      fetchWorkspaceSettings({
        workspaceId: selectedWorkspace.id,
        workspaceName: selectedWorkspace.name,
      })
    );
  }, [selectedWorkspace, dispatch]);

  // Handlers
  const handleWorkspaceChange = (workspace: Workspace) => {
    dispatch(setSelectedWorkspace(workspace.id));
  };

  const handleAddWorkspace = async (name: string) => {
    try {
      await dispatch(createWorkspace(name)).unwrap();
    } catch (error) {
      console.error('Error creating workspace:', error);
      dispatch(showError(t('cannotCreateWorkspace', { ns: 'settings' })));
    }
  };

  const handleSaveWorkspaceSettings = async (settings: WorkspaceSettings) => {
    try {
      // Save workspace settings
      await dispatch(
        saveWorkspaceSettings({
          workspaceId: settings.id,
          settings,
        })
      ).unwrap();

      // Update workspace name if changed
      if (settings.name !== selectedWorkspace?.name) {
        await dispatch(
          updateWorkspaceName({ id: settings.id, name: settings.name })
        ).unwrap();
      }

      // Update model selection if LLM connection or default model changed
      if (selectedWorkspace && settings.id === selectedWorkspace.id) {
        if (settings.defaultModel) {
          dispatch(setSelectedModel(settings.defaultModel));
        } else {
          dispatch(setSelectedModel(undefined));
        }
      }

      // Show success notification
      dispatch(
        showSuccess(
          t('workspaceSettingsSaved', { ns: 'settings' }),
          t('workspaceSettingsSavedDescription', { ns: 'settings' })
        )
      );
    } catch (error) {
      console.error('Error saving workspace settings:', error);
      dispatch(showError(t('cannotSaveWorkspaceSettings', { ns: 'settings' })));
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      // Delete workspace
      await dispatch(deleteWorkspace(workspaceId)).unwrap();

      // Clear all chats for this workspace
      await dispatch(clearAllChats(workspaceId)).unwrap();

      dispatch(showSuccess(t('workspaceDeleted', { ns: 'settings' })));
    } catch (error) {
      console.error('Error deleting workspace:', error);
      dispatch(showError(t('cannotDeleteWorkspace', { ns: 'settings' })));
    }
  };

  return {
    workspaces,
    selectedWorkspace,
    selectedWorkspaceId,
    workspaceSettings,
    handleWorkspaceChange,
    handleAddWorkspace,
    handleSaveWorkspaceSettings,
    handleDeleteWorkspace,
  };
}
