import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatInputState {
  input: string;
  selectedModel: string | undefined;
  streamEnabled: boolean;
  attachedFiles: File[];
  isLoading: boolean;
  isThinkingEnabled: boolean;
  reasoningEffort: 'low' | 'medium' | 'high';
}

const initialState: ChatInputState = {
  input: '',
  selectedModel: undefined,
  streamEnabled: true,
  attachedFiles: [],
  isLoading: false,
  isThinkingEnabled: false,
  reasoningEffort: 'medium',
};

const chatInputSlice = createSlice({
  name: 'chatInput',
  initialState,
  reducers: {
    setInput: (state, action: PayloadAction<string>) => {
      state.input = action.payload;
    },
    setSelectedModel: (state, action: PayloadAction<string | undefined>) => {
      state.selectedModel = action.payload;
    },
    setStreamEnabled: (state, action: PayloadAction<boolean>) => {
      state.streamEnabled = action.payload;
    },
    setAttachedFiles: (state, action: PayloadAction<File[]>) => {
      state.attachedFiles = action.payload;
    },
    clearInput: (state) => {
      state.input = '';
      state.attachedFiles = [];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsThinkingEnabled: (state, action: PayloadAction<boolean>) => {
      state.isThinkingEnabled = action.payload;
    },
    setReasoningEffort: (
      state,
      action: PayloadAction<'low' | 'medium' | 'high'>
    ) => {
      state.reasoningEffort = action.payload;
    },
    resetChatInput: (state) => {
      state.input = '';
      state.selectedModel = undefined;
      state.streamEnabled = true;
      state.attachedFiles = [];
      state.isThinkingEnabled = false;
      state.reasoningEffort = 'medium';
    },
    restoreChatInputSettings: (
      state,
      action: PayloadAction<{
        selectedModel?: string;
        streamEnabled?: boolean;
      }>
    ) => {
      if (action.payload.selectedModel !== undefined) {
        state.selectedModel = action.payload.selectedModel;
      }
      if (action.payload.streamEnabled !== undefined) {
        state.streamEnabled = action.payload.streamEnabled;
      }
    },
  },
});

export const {
  setInput,
  setSelectedModel,
  setStreamEnabled,
  setAttachedFiles,
  clearInput,
  setLoading,
  setIsThinkingEnabled,
  setReasoningEffort,
  resetChatInput,
  restoreChatInputSettings,
} = chatInputSlice.actions;
export default chatInputSlice.reducer;
