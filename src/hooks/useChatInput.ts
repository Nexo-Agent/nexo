import { useEffect, useRef, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setInput,
  setSelectedModel,
  setAttachedFiles,
  clearInput,
  restoreChatInputSettings,
  setIsThinkingEnabled,
  setReasoningEffort,
} from '@/store/slices/chatInputSlice';
import {
  loadChatInputSettings,
  saveChatInputSettings,
} from '@/lib/chat-input-settings-storage';
import { useWorkspaces } from '@/hooks/useWorkspaces';

/**
 * Hook to access and manage chat input state
 */
export function useChatInput(selectedWorkspaceId: string | null) {
  const dispatch = useAppDispatch();
  const isLoadingSettingsRef = useRef(false);
  const { workspaceSettings } = useWorkspaces();

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

  // Get streamEnabled from workspace settings
  const streamEnabled = useMemo(() => {
    if (!selectedWorkspaceId) return true; // Default to true
    const settings = workspaceSettings[selectedWorkspaceId];
    return settings?.streamEnabled ?? true;
  }, [selectedWorkspaceId, workspaceSettings]);

  // Load chat input settings when workspace changes
  useEffect(() => {
    if (!selectedWorkspaceId) return;

    isLoadingSettingsRef.current = true;
    const currentSettings = workspaceSettings[selectedWorkspaceId];
    const savedSettings = loadChatInputSettings(selectedWorkspaceId);

    // Priority: saved model > default model from workspace settings
    // This ensures user's model selection persists across app restarts and message edits
    const modelToUse =
      savedSettings?.selectedModel || currentSettings?.defaultModel;

    // Calculate streamEnabled from workspace settings
    const workspaceStreamEnabled = currentSettings?.streamEnabled ?? true;

    // Restore settings with priority: default model > saved model
    dispatch(
      restoreChatInputSettings({
        selectedModel: modelToUse,
        streamEnabled: savedSettings?.streamEnabled ?? workspaceStreamEnabled,
      })
    );

    // Reset flag after a short delay to allow state to update
    setTimeout(() => {
      isLoadingSettingsRef.current = false;
    }, 100);
  }, [selectedWorkspaceId, dispatch, workspaceSettings]);

  // Save chat input settings when they change (within same workspace)
  // Skip saving if we're currently loading settings to avoid overwriting
  useEffect(() => {
    if (!selectedWorkspaceId || isLoadingSettingsRef.current) return;

    saveChatInputSettings(selectedWorkspaceId, {
      selectedModel,
      streamEnabled,
    });
  }, [selectedWorkspaceId, selectedModel, streamEnabled]);

  // Handlers
  const handleInputChange = (value: string) => {
    dispatch(setInput(value));
  };

  const handleModelChange = (model: string | undefined) => {
    dispatch(setSelectedModel(model));
  };

  const handleFileUpload = (files: File[]) => {
    dispatch(setAttachedFiles(files));
  };

  const handleClearInput = () => {
    dispatch(clearInput());
  };

  const handleThinkingToggle = () => {
    dispatch(setIsThinkingEnabled(!isThinkingEnabled));
  };

  const handleReasoningEffortChange = (effort: 'low' | 'medium' | 'high') => {
    dispatch(setReasoningEffort(effort));
  };

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
