import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';

export type Page = 'chat' | 'settings' | 'workspaceSettings';

interface UIState {
  activePage: Page;
  isSidebarCollapsed: boolean;
  titleBarText: string | null;
  welcomeOpen: boolean;
  aboutOpen: boolean;
  keyboardShortcutsOpen: boolean;
  settingsSection:
    | 'general'
    | 'llm'
    | 'mcp'
    | 'prompts'
    | 'addon'
    | 'usage'
    | 'agent'
    | 'about';
  language: 'vi' | 'en';
  userMode: 'normal' | 'developer';
  theme:
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

  loading: boolean;
  agentChatHistoryDrawerOpen: boolean;
  agentChatHistorySessionId: string | null;
  agentChatHistoryAgentId: string | null;
  imagePreviewOpen: boolean;
  imagePreviewUrl: string | null;
}

// Load all app settings from database
export const loadAppSettings = createAsyncThunk(
  'ui/loadAppSettings',
  async () => {
    try {
      // Load all settings in parallel
      const [language, userMode, theme] = await Promise.all([
        invokeCommand<string | null>(TauriCommands.GET_APP_SETTING, {
          key: 'language',
        }),
        invokeCommand<string | null>(TauriCommands.GET_APP_SETTING, {
          key: 'userMode',
        }),
        invokeCommand<string | null>(TauriCommands.GET_APP_SETTING, {
          key: 'theme',
        }),
      ]);

      // Validate and set language
      let finalLanguage: 'vi' | 'en' = 'vi';
      if (language === 'vi' || language === 'en') {
        finalLanguage = language;
      } else {
        // If not found, save default value to SQLite
        await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
          key: 'language',
          value: 'vi',
        });
      }

      // Validate and set userMode
      let finalUserMode: 'normal' | 'developer' = 'normal';
      if (userMode === 'normal' || userMode === 'developer') {
        finalUserMode = userMode;
      } else {
        // If not found, save default value
        await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
          key: 'userMode',
          value: 'normal',
        });
      }

      // Validate and set theme
      let finalTheme: UIState['theme'] = 'light';
      const validThemes = [
        'light',
        'dark',
        'system',
        'github-light',
        'github-dark',
        'gruvbox',
        'dracula',
        'solarized-light',
        'solarized-dark',
        'one-dark-pro',
        'one-light',
        'monokai',
        'nord',
        'ayu-dark',
      ];

      if (theme && validThemes.includes(theme)) {
        finalTheme = theme as UIState['theme'];
      } else {
        // If not found, save default value
        await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
          key: 'theme',
          value: 'light',
        });
      }

      return {
        language: finalLanguage,
        userMode: finalUserMode,
        theme: finalTheme,
      };
    } catch (error) {
      console.error('Failed to load app settings from database:', error);
      return {
        language: 'vi' as const,
        userMode: 'normal' as const,
        theme: 'light' as const,
      };
    }
  }
);

// Check if this is the first launch
export const checkFirstLaunch = createAsyncThunk(
  'ui/checkFirstLaunch',
  async () => {
    try {
      const hasSeenWelcome = await invokeCommand<string | null>(
        TauriCommands.GET_APP_SETTING,
        {
          key: 'hasSeenWelcome',
        }
      );
      return hasSeenWelcome !== 'true';
    } catch (error) {
      console.error('Failed to check first launch:', error);
      return true; // Default to showing welcome if check fails
    }
  }
);

// Keep individual loaders for backward compatibility (can be removed later)
export const loadUserMode = createAsyncThunk('ui/loadUserMode', async () => {
  try {
    const userMode = await invokeCommand<string | null>(
      TauriCommands.GET_APP_SETTING,
      {
        key: 'userMode',
      }
    );
    if (userMode === 'normal' || userMode === 'developer') {
      return userMode;
    }
    await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
      key: 'userMode',
      value: 'normal',
    });
    return 'normal' as const;
  } catch (error) {
    console.error('Failed to load userMode from database:', error);
    return 'normal' as const;
  }
});

export const loadLanguage = createAsyncThunk('ui/loadLanguage', async () => {
  try {
    const language = await invokeCommand<string | null>(
      TauriCommands.GET_APP_SETTING,
      {
        key: 'language',
      }
    );
    if (language === 'vi' || language === 'en') {
      return language;
    }
    await invokeCommand(TauriCommands.SAVE_APP_SETTING, {
      key: 'language',
      value: 'vi',
    });
    return 'vi' as const;
  } catch (error) {
    console.error('Failed to load language from SQLite:', error);
    return 'vi' as const;
  }
});

const initialState: UIState = {
  activePage: 'chat',
  isSidebarCollapsed: false,
  titleBarText: null,
  welcomeOpen: false,
  aboutOpen: false,
  keyboardShortcutsOpen: false,
  settingsSection: 'general',
  language: 'vi',
  userMode: 'normal',
  theme: 'light',
  loading: false,
  agentChatHistoryDrawerOpen: false,
  agentChatHistorySessionId: null,
  agentChatHistoryAgentId: null,
  imagePreviewOpen: false,
  imagePreviewUrl: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    navigateToChat: (state) => {
      state.activePage = 'chat';
      state.titleBarText = null;
    },
    navigateToSettings: (state) => {
      state.activePage = 'settings';
      state.titleBarText = 'title'; // Translation key for "Settings"
    },
    navigateToWorkspaceSettings: (state) => {
      state.activePage = 'workspaceSettings';
      state.titleBarText = 'workspaceSettings'; // Translation key
    },
    setTitleBarText: (state, action: PayloadAction<string | null>) => {
      state.titleBarText = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setSettingsSection: (
      state,
      action: PayloadAction<
        | 'general'
        | 'llm'
        | 'mcp'
        | 'prompts'
        | 'agent'
        | 'addon'
        | 'usage'
        | 'about'
      >
    ) => {
      state.settingsSection = action.payload;
    },
    setWelcomeOpen: (state, action: PayloadAction<boolean>) => {
      state.welcomeOpen = action.payload;
    },
    setAboutOpen: (state, action: PayloadAction<boolean>) => {
      state.aboutOpen = action.payload;
    },
    setKeyboardShortcutsOpen: (state, action: PayloadAction<boolean>) => {
      state.keyboardShortcutsOpen = action.payload;
    },
    setLanguage: (state, action: PayloadAction<'vi' | 'en'>) => {
      state.language = action.payload;
      invokeCommand(TauriCommands.SAVE_APP_SETTING, {
        key: 'language',
        value: action.payload,
      }).catch((error) => {
        console.error('Failed to save language to database:', error);
      });
    },
    setUserMode: (state, action: PayloadAction<'normal' | 'developer'>) => {
      state.userMode = action.payload;
      invokeCommand(TauriCommands.SAVE_APP_SETTING, {
        key: 'userMode',
        value: action.payload,
      }).catch((error) => {
        console.error('Failed to save userMode to database:', error);
      });
    },
    setTheme: (state, action: PayloadAction<UIState['theme']>) => {
      state.theme = action.payload;
      invokeCommand(TauriCommands.SAVE_APP_SETTING, {
        key: 'theme',
        value: action.payload,
      }).catch((error) => {
        console.error('Failed to save theme to database:', error);
      });
    },
    setAgentChatHistoryDrawerOpen: (
      state,
      action: PayloadAction<{
        open: boolean;
        sessionId?: string | null;
        agentId?: string | null;
      }>
    ) => {
      state.agentChatHistoryDrawerOpen = action.payload.open;
      if (action.payload.open) {
        state.agentChatHistorySessionId = action.payload.sessionId ?? null;
        state.agentChatHistoryAgentId = action.payload.agentId ?? null;
      } else {
        state.agentChatHistorySessionId = null;
        state.agentChatHistoryAgentId = null;
      }
    },
    setImagePreviewOpen: (
      state,
      action: PayloadAction<{ open: boolean; url?: string | null }>
    ) => {
      state.imagePreviewOpen = action.payload.open;
      if (action.payload.open && action.payload.url) {
        state.imagePreviewUrl = action.payload.url;
      } else if (!action.payload.open) {
        state.imagePreviewUrl = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAppSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadAppSettings.fulfilled, (state, action) => {
        state.language = action.payload.language;
        state.userMode = action.payload.userMode;
        state.theme = action.payload.theme;
        state.loading = false;
      })
      .addCase(loadAppSettings.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadUserMode.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUserMode.fulfilled, (state, action) => {
        state.userMode = action.payload;
        state.loading = false;
      })
      .addCase(loadUserMode.rejected, (state) => {
        state.loading = false;
      })
      .addCase(loadLanguage.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadLanguage.fulfilled, (state, action) => {
        state.language = action.payload;
        state.loading = false;
      })
      .addCase(loadLanguage.rejected, (state) => {
        state.loading = false;
      })
      .addCase(checkFirstLaunch.fulfilled, (state, action) => {
        state.welcomeOpen = action.payload;
      });
  },
});

export const {
  navigateToChat,
  navigateToSettings,
  navigateToWorkspaceSettings,
  setTitleBarText,
  toggleSidebar,
  setSidebarCollapsed,
  setSettingsSection,
  setWelcomeOpen,
  setAboutOpen,
  setKeyboardShortcutsOpen,
  setLanguage,
  setUserMode,
  setTheme,
  setAgentChatHistoryDrawerOpen,
  setImagePreviewOpen,
} = uiSlice.actions;
export default uiSlice.reducer;
