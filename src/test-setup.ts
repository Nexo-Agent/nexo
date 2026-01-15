import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri core API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri event API
vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
  emit: vi.fn(),
}));

// Mock translation if needed (react-i18next)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: () => Promise.resolve(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
