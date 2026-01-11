import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  setInput,
  setSelectedModel,
  setAttachedFiles,
  clearInput,
  restoreChatInputSettings,
  setIsThinkingEnabled,
  setReasoningEffort,
} from '../state/chatInputSlice';
import {
  useGetChatInputSettingsQuery,
  useSaveChatInputSettingsMutation,
} from '../state/chatInputApi';
import { useWorkspaces } from '@/features/workspace';
import { useGetLLMConnectionsQuery } from '@/features/llm';

/**
 * Hook to access and manage chat input state
 */
export function useChatInput(selectedWorkspaceId: string | null) {
  const dispatch = useAppDispatch();
  const isLoadingSettingsRef = useRef(false);
  const { workspaceSettings } = useWorkspaces();

  // Get LLM connections to validate models
  const { data: llmConnections = [] } = useGetLLMConnectionsQuery();

  // Get chat input settings from SQLite
  const { data: sqliteSettings, isSuccess: isSettingsLoaded } =
    useGetChatInputSettingsQuery(selectedWorkspaceId || '', {
      skip: !selectedWorkspaceId,
    });
  const [saveSettings] = useSaveChatInputSettingsMutation();

  // Selectors
  const input = useAppSelector((state) => state.chatInput.input);
  const selectedModel = useAppSelector(
    (state) => state.chatInput.selectedModel
  );
  const attachedFiles = useAppSelector(
    (state) => state.chatInput.attachedFiles
  );
  const isLoading = useAppSelector((state) => state.chatInput.isLoading);
  const isThinkingEnabled = useAppSelector(
    (state) => state.chatInput.isThinkingEnabled
  );
  const reasoningEffort = useAppSelector(
    (state) => state.chatInput.reasoningEffort
  );

  // Get current workspace settings - memoize to avoid unnecessary re-renders
  const currentWorkspaceSettings = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return workspaceSettings[selectedWorkspaceId] || null;
  }, [selectedWorkspaceId, workspaceSettings]);

  // Get streamEnabled from workspace settings
  const streamEnabled = useMemo(() => {
    if (!selectedWorkspaceId) return true; // Default to true
    return currentWorkspaceSettings?.streamEnabled ?? true;
  }, [selectedWorkspaceId, currentWorkspaceSettings?.streamEnabled]);

  // Helper function to validate if a model exists in connections
  const isValidModel = useCallback(
    (modelStr: string | undefined): boolean => {
      if (!modelStr) return false;

      // Parse the model string
      let connId: string;
      let modelId: string;

      if (modelStr.includes('::')) {
        const [parsedConnId, ...modelIdParts] = modelStr.split('::');
        connId = parsedConnId;
        modelId = modelIdParts.join('::');
      } else {
        // If no '::' then we can't validate properly, return false
        return false;
      }

      // Find the connection
      const connection = llmConnections.find((conn) => conn.id === connId);
      if (!connection) return false;

      // Check if model exists in this connection
      const modelExists = connection.models?.some((m) => m.id === modelId);
      return !!modelExists;
    },
    [llmConnections]
  );

  // Load chat input settings from SQLite when workspace changes or data is loaded
  useEffect(() => {
    if (!selectedWorkspaceId || !isSettingsLoaded) return;

    isLoadingSettingsRef.current = true;

    // Priority: SQLite model > default model from workspace settings
    let modelToUse = sqliteSettings?.selectedModel;

    // Validate saved model - if it doesn't exist anymore, clear it
    if (modelToUse && !isValidModel(modelToUse)) {
      console.error(
        `Saved model "${modelToUse}" no longer exists in SQLite, clearing it`
      );
      modelToUse = undefined;
    }

    // If no saved model, use default model from workspace settings
    if (!modelToUse && currentWorkspaceSettings?.defaultModel) {
      const defaultModel = currentWorkspaceSettings.defaultModel;
      const llmConnectionId = currentWorkspaceSettings.llmConnectionId;

      if (defaultModel && llmConnectionId && !defaultModel.includes('::')) {
        modelToUse = `${llmConnectionId}::${defaultModel}`;
      } else {
        modelToUse = defaultModel;
      }

      // Validate default model too
      if (modelToUse && !isValidModel(modelToUse)) {
        console.error(
          `Default model "${modelToUse}" no longer exists, clearing it`
        );
        modelToUse = undefined;
      }
    }

    // Calculate streamEnabled from workspace settings
    const workspaceStreamEnabled =
      currentWorkspaceSettings?.streamEnabled ?? true;

    // Restore settings
    dispatch(
      restoreChatInputSettings({
        selectedModel: modelToUse,
        streamEnabled: sqliteSettings?.streamEnabled ?? workspaceStreamEnabled,
      })
    );

    // Reset flag after a short delay
    setTimeout(() => {
      isLoadingSettingsRef.current = false;
    }, 100);
  }, [
    selectedWorkspaceId,
    isSettingsLoaded,
    sqliteSettings,
    dispatch,
    currentWorkspaceSettings?.defaultModel,
    currentWorkspaceSettings?.llmConnectionId,
    currentWorkspaceSettings?.streamEnabled,
    isValidModel,
  ]);

  // Save chat input settings to SQLite when they change
  useEffect(() => {
    if (!selectedWorkspaceId || isLoadingSettingsRef.current) return;

    saveSettings({
      workspaceId: selectedWorkspaceId,
      selectedModel,
      streamEnabled,
    });
  }, [selectedWorkspaceId, selectedModel, streamEnabled, saveSettings]);

  // Handlers
  const handleInputChange = useCallback(
    (value: string) => {
      dispatch(setInput(value));
    },
    [dispatch]
  );

  const handleModelChange = useCallback(
    (model: string | undefined) => {
      dispatch(setSelectedModel(model));
    },
    [dispatch]
  );

  const handleFileUpload = useCallback(
    (files: File[]) => {
      dispatch(setAttachedFiles(files));
    },
    [dispatch]
  );

  const handleClearInput = useCallback(() => {
    dispatch(clearInput());
  }, [dispatch]);

  const handleThinkingToggle = useCallback(() => {
    dispatch(setIsThinkingEnabled(!isThinkingEnabled));
  }, [dispatch, isThinkingEnabled]);

  const handleReasoningEffortChange = useCallback(
    (effort: 'low' | 'medium' | 'high') => {
      dispatch(setReasoningEffort(effort));
    },
    [dispatch]
  );

  return {
    input,
    selectedModel,
    streamEnabled,
    attachedFiles,
    isLoading,
    handleInputChange,
    handleModelChange,
    handleFileUpload,
    handleClearInput,
    isThinkingEnabled,
    reasoningEffort,
    handleThinkingToggle,
    handleReasoningEffortChange,
  };
}
