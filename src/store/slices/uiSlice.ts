import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { invokeCommand, TauriCommands } from '@/lib/tauri';

interface UIState {
  isSidebarCollapsed: boolean;
  settingsOpen: boolean;
  workspaceSettingsOpen: boolean;
  welcomeOpen: boolean;
  aboutOpen: boolean;
  keyboardShortcutsOpen: boolean;
  settingsSection: 'general' | 'llm' | 'mcp' | 'prompts' | 'about';
  language: 'vi' | 'en';
  userMode: 'normal' | 'developer';
  theme: 'light' | 'dark' | 'system';
  loading: boolean;
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
      let finalTheme: 'light' | 'dark' | 'system' = 'light';
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        finalTheme = theme;
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
  isSidebarCollapsed: false,
  settingsOpen: false,
  workspaceSettingsOpen: false,
  welcomeOpen: false,
  aboutOpen: false,
  keyboardShortcutsOpen: false,
  settingsSection: 'general',
  language: 'vi',
  userMode: 'normal',
  theme: 'light',
  loading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarCollapsed = !state.isSidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.settingsOpen = action.payload;
    },
    setSettingsSection: (
      state,
      action: PayloadAction<'general' | 'llm' | 'mcp' | 'prompts' | 'about'>
    ) => {
      state.settingsSection = action.payload;
    },
    setWorkspaceSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.workspaceSettingsOpen = action.payload;
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
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      invokeCommand(TauriCommands.SAVE_APP_SETTING, {
        key: 'theme',
        value: action.payload,
      }).catch((error) => {
        console.error('Failed to save theme to database:', error);
      });
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
  toggleSidebar,
  setSidebarCollapsed,
  setSettingsOpen,
  setSettingsSection,
  setWorkspaceSettingsOpen,
  setWelcomeOpen,
  setAboutOpen,
  setKeyboardShortcutsOpen,
  setLanguage,
  setUserMode,
  setTheme,
} = uiSlice.actions;
export default uiSlice.reducer;
