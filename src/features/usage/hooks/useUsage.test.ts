import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useUsage } from './useUsage';
import { invoke } from '@tauri-apps/api/core';
import { useAppDispatch } from '@/app/hooks';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock app hooks
vi.mock('@/app/hooks', () => ({
  useAppDispatch: vi.fn(),
}));

// Mock useLogger
vi.mock('@/hooks/useLogger', () => ({
  useLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    setContext: vi.fn(),
  }),
}));

// Mock notification actions
vi.mock('@/features/notifications/state/notificationSlice', () => ({
  showSuccess: vi.fn((msg) => ({ type: 'success', payload: msg })),
  showError: vi.fn((msg) => ({ type: 'error', payload: msg })),
}));

describe('useUsage', () => {
  const mockDispatch = vi.fn();
  const mockInvoke = invoke as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);

    // Default mock responses
    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'get_usage_summary')
        return Promise.resolve({ total_cost: 0 });
      if (cmd === 'get_usage_chart') return Promise.resolve([]);
      if (cmd === 'get_usage_logs') return Promise.resolve([]);
      return Promise.resolve();
    });
  });

  it('fetches initial data on mount', async () => {
    const { result } = renderHook(() => useUsage());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockInvoke).toHaveBeenCalledWith('get_usage_summary', {
      filter: {},
    });
    expect(mockInvoke).toHaveBeenCalledWith('get_usage_chart', {
      filter: {},
      interval: 'day',
    });
    expect(mockInvoke).toHaveBeenCalledWith('get_usage_logs', {
      filter: {},
      page: 1,
      limit: 20,
    });
  });

  it('updates data when filter changes', async () => {
    const { result } = renderHook(() => useUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setFilter({ model: 'gpt-4' });
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_usage_summary', {
        filter: { model: 'gpt-4' },
      });
    });
  });

  it('updates data when interval changes', async () => {
    const { result } = renderHook(() => useUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.setInterval('hour');
    });

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('get_usage_chart', {
        filter: {},
        interval: 'hour',
      });
    });
  });

  it('handles clear usage successfully', async () => {
    const { result } = renderHook(() => useUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockInvoke.mockResolvedValue(true);

    await act(async () => {
      await result.current.handleClearUsage();
    });

    expect(mockInvoke).toHaveBeenCalledWith('clear_usage');
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'success',
      payload: 'Usage data cleared successfully',
    });
  });

  it('handles clear usage failure', async () => {
    const { result } = renderHook(() => useUsage());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockInvoke.mockImplementation((cmd: string) => {
      if (cmd === 'clear_usage') return Promise.reject(new Error('Failed'));
      // Re-mock other calls to avoid issues during re-fetch triggered by error handling logic if any
      if (cmd === 'get_usage_summary')
        return Promise.resolve({ total_cost: 0 });
      if (cmd === 'get_usage_chart') return Promise.resolve([]);
      if (cmd === 'get_usage_logs') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    await act(async () => {
      await result.current.handleClearUsage();
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'error',
      payload: 'Failed to clear usage data',
    });
  });
});
