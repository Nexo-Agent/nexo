import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { Workspace, WorkspaceSettings } from '@/store/types';
import {
  setWorkspaces,
  setSelectedWorkspace,
  addWorkspace,
  deleteWorkspace as deleteWorkspaceAction,
  updateWorkspaceName, // We might need this for slice sync, but we rely on re-fetch mostly?
} from '@/store/slices/workspacesSlice';
import { setWorkspaceSettings } from '@/store/slices/workspaceSettingsSlice';
import { showError, showSuccess } from '@/store/slices/notificationSlice';
import { setSelectedModel } from '@/store/slices/chatInputSlice';
import { createChat, clearAllChats } from '@/store/slices/chatsSlice';

import {
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
} from '@/store/api/workspacesApi';
import {
  useGetWorkspaceSettingsQuery,
  useSaveWorkspaceSettingsMutation,
} from '@/store/api/workspaceSettingsApi';
import {
  useGetAppSettingQuery,
  useSaveAppSettingMutation,
} from '@/store/api/appSettingsApi';
import { useGetLLMConnectionsQuery } from '@/features/llm';
import { useGetMCPConnectionsQuery } from '@/features/mcp';

/**
 * Hook to access and manage workspaces
 */
export function useWorkspaces() {
  const dispatch = useAppDispatch();
  const { t } = useTranslation(['common', 'settings']);

  // Selectors
  // We still read from slice for components that expect slice structure,
  // or we can return data from RTK Query if we prefer.
  // But to maintain full compatibility with legacy code relying on slices (e.g. stateValidation),
  // we will Sync RTK Query data -> Slice.
  const workspacesFromSlice = useAppSelector(
    (state) => state.workspaces.workspaces
  );
  const selectedWorkspaceId = useAppSelector(
    (state) => state.workspaces.selectedWorkspaceId
  );

  // RTK Query Hooks
  // 1. Fetch Workspaces
  const { data: workspacesData, error: _workspacesError } =
    useGetWorkspacesQuery();

  // 2. Fetch Last Workspace Setting (for init)
  const { data: lastWorkspaceId } = useGetAppSettingQuery('lastWorkspaceId');

  // 3. Fetch Connections (to populate store for other features)
  // We just run these queries to populate cache/slice
  useGetLLMConnectionsQuery();
  useGetMCPConnectionsQuery();

  // 4. Fetch Workspace Settings (if workspace selected)
  // We need the name for the query.
  // We find the selected workspace object from the Data we have (or slice).
  // Use workspacesData if available, fallback to slice.
  const currentWorkspaces = workspacesData || workspacesFromSlice;
  const selectedWorkspace = useMemo(
    () => currentWorkspaces.find((w) => w.id === selectedWorkspaceId) || null,
    [currentWorkspaces, selectedWorkspaceId]
  );

  const { data: settingsData } = useGetWorkspaceSettingsQuery(
    {
      workspaceId: selectedWorkspaceId || '',
      workspaceName: selectedWorkspace?.name || '',
    },
    { skip: !selectedWorkspaceId || !selectedWorkspace }
  );

  // Mutations
  const [createWorkspaceMutation] = useCreateWorkspaceMutation();
  const [updateWorkspaceMutation] = useUpdateWorkspaceMutation();
  const [deleteWorkspaceMutation] = useDeleteWorkspaceMutation();
  const [saveWorkspaceSettingsMutation] = useSaveWorkspaceSettingsMutation();
  const [saveAppSettingMutation] = useSaveAppSettingMutation();

  // --- Synchronization & Side Effects ---

  // Sync Workspaces to Slice
  useEffect(() => {
    if (workspacesData) {
      dispatch(setWorkspaces(workspacesData));
    }
  }, [workspacesData, dispatch]);

  // Sync Settings to Slice
  useEffect(() => {
    if (settingsData && selectedWorkspaceId) {
      dispatch(
        setWorkspaceSettings({
          workspaceId: selectedWorkspaceId,
          settings: settingsData,
        })
      );
    }
  }, [settingsData, selectedWorkspaceId, dispatch]);

  // Handle Workspace Initialization (Last Selected)
  useEffect(() => {
    // If we have workspaces, and no selected workspace, and we know the last workspace ID
    if (workspacesData && workspacesData.length > 0 && !selectedWorkspaceId) {
      if (
        lastWorkspaceId &&
        workspacesData.some((w) => w.id === lastWorkspaceId)
      ) {
        dispatch(setSelectedWorkspace(lastWorkspaceId));
      } else {
        // Fallback to first
        dispatch(setSelectedWorkspace(workspacesData[0].id));
      }
    } else if (
      workspacesData &&
      workspacesData.length > 0 &&
      !selectedWorkspaceId
    ) {
      // Fallback to first if no lastWorkspaceId
      dispatch(setSelectedWorkspace(workspacesData[0].id));
    }
  }, [workspacesData, lastWorkspaceId, selectedWorkspaceId, dispatch]);

  // Handlers
  const handleWorkspaceChange = async (workspace: Workspace) => {
    dispatch(setSelectedWorkspace(workspace.id));
    // Save app setting
    saveAppSettingMutation({
      key: 'lastWorkspaceId',
      value: workspace.id,
    }).catch(console.error);

    // Track workspace switch
    const { trackWorkspaceOperation, setWorkspaceContext } =
      await import('@/lib/sentry-utils');
    trackWorkspaceOperation('switch', workspace.id);
    setWorkspaceContext(workspace.id, workspace.name);
  };

  const handleAddWorkspace = async (name: string) => {
    try {
      const { trackWorkspaceOperation } = await import('@/lib/sentry-utils');

      // Use Mutation
      const newWorkspace = await createWorkspaceMutation(name).unwrap();

      // Select it
      dispatch(setSelectedWorkspace(newWorkspace.id));
      dispatch(addWorkspace(newWorkspace)); // Optimistic sync/Immediate update for slice

      // Save setting
      saveAppSettingMutation({
        key: 'lastWorkspaceId',
        value: newWorkspace.id,
      }).catch(console.error);

      trackWorkspaceOperation('create', newWorkspace.id);

      await dispatch(
        createChat({
          workspaceId: newWorkspace.id,
          title: t('newConversation', { ns: 'common' }),
        })
      ).unwrap();
    } catch (error) {
      console.error('Error creating workspace:', error);
      dispatch(showError(t('cannotCreateWorkspace', { ns: 'settings' })));

      const { trackError } = await import('@/lib/sentry-utils');
      trackError(error as Error, {
        component: 'useWorkspaces',
        action: 'createWorkspace',
      });
    }
  };

  const handleSaveWorkspaceSettings = async (settings: WorkspaceSettings) => {
    try {
      // Save settings via Mutation
      await saveWorkspaceSettingsMutation({
        workspaceId: settings.id,
        settings,
      }).unwrap();

      // Check name change
      if (selectedWorkspace && settings.name !== selectedWorkspace.name) {
        await updateWorkspaceMutation({
          id: settings.id,
          name: settings.name,
        }).unwrap();

        // Sync slice manually if needed (though invalidateTags should re-fetch)
        // updateWorkspaceName in slice is useful for immediate UI feel if refetch is slow
        dispatch(updateWorkspaceName({ id: settings.id, name: settings.name }));
      }

      // Update model selection
      if (selectedWorkspace && settings.id === selectedWorkspace.id) {
        if (settings.defaultModel) {
          dispatch(setSelectedModel(settings.defaultModel));
        } else {
          dispatch(setSelectedModel(undefined));
        }
      }

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
      await deleteWorkspaceMutation(workspaceId).unwrap();

      // Sync Slice
      dispatch(deleteWorkspaceAction(workspaceId));

      await dispatch(clearAllChats(workspaceId)).unwrap();

      dispatch(showSuccess(t('workspaceDeleted', { ns: 'settings' })));

      // Selection logic is handled by useEffect or check here
      // If we deleted selected workspace, the useEffect [workspacesData] might pick the first one
      // But we need to ensure local state is updated.
      if (workspaceId === selectedWorkspaceId) {
        // Rely on useEffect to pick next or manually pick
        const remaining =
          workspacesData?.filter((w) => w.id !== workspaceId) || [];
        if (remaining.length > 0) {
          const nextId = remaining[0].id;
          dispatch(setSelectedWorkspace(nextId));
          saveAppSettingMutation({
            key: 'lastWorkspaceId',
            value: nextId,
          }).catch(console.error);
        } else {
          dispatch(setSelectedWorkspace(null));
          saveAppSettingMutation({ key: 'lastWorkspaceId', value: '' }).catch(
            console.error
          );
        }
      }
    } catch (error) {
      console.error('Error deleting workspace:', error);
      dispatch(showError(t('cannotDeleteWorkspace', { ns: 'settings' })));
    }
  };

  return {
    workspaces: workspacesData || workspacesFromSlice, // Prefer query data
    selectedWorkspace,
    selectedWorkspaceId,
    workspaceSettings: useAppSelector(
      (state) => state.workspaceSettings.settingsByWorkspaceId
    ), // Return slice/map for compatibility
    handleWorkspaceChange,
    handleAddWorkspace,
    handleSaveWorkspaceSettings,
    handleDeleteWorkspace,
  };
}
