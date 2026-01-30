import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FirstRunSetup } from './FirstRunSetup';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => vi.fn(),
}));

vi.mock('@/features/ui/state/uiSlice', () => ({
  setSetupCompleted: vi.fn(),
}));

vi.mock('@/features/llm/state/api', () => ({
  useCreateLLMConnectionMutation: () => [
    vi.fn().mockReturnValue({ unwrap: vi.fn() }),
  ],
}));

vi.mock('@/lib/tauri', async () => {
  const actual = await vi.importActual('@/lib/tauri');
  return {
    ...actual,
    invokeCommand: vi.fn(),
  };
});

// Mock react-i18next if used by FormDialog or children
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

describe('FirstRunSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome step initially', () => {
    render(<FirstRunSetup open={true} />);
    expect(screen.getByText('Chào mừng đến với Nexo')).toBeInTheDocument();
    expect(screen.getByText('Bắt đầu thiết lập')).toBeInTheDocument();
  });

  it('transitions to llm-setup step on start', () => {
    render(<FirstRunSetup open={true} />);

    fireEvent.click(screen.getByText('Bắt đầu thiết lập'));

    expect(screen.getByText('Kết nối AI của bạn')).toBeInTheDocument();
    expect(screen.getByText('Nhà cung cấp AI')).toBeInTheDocument();
  });
});
