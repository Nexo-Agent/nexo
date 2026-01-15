import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UpdateSection } from './UpdateSection';
import { useUpdate } from '../lib/useUpdate';
import { getVersion } from '@tauri-apps/api/app';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  CheckCircle2: () => <div data-testid="check-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

vi.mock('../lib/useUpdate', () => ({
  useUpdate: vi.fn(),
}));

vi.mock('@tauri-apps/api/app', () => ({
  getVersion: vi.fn(),
}));

describe('UpdateSection', () => {
  const mockCheckUpdate = vi.fn();
  const mockInstallUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (getVersion as any).mockResolvedValue('1.0.0');
    (useUpdate as any).mockReturnValue({
      status: 'idle',
      update: null,
      error: null,
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });
  });

  it('renders current version', async () => {
    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText(/1.0.0/)).toBeInTheDocument();
    });
  });

  it('shows check for updates button initially', async () => {
    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('checkForUpdates')).toBeInTheDocument();
    });
  });

  it('calls checkUpdate when button is clicked', async () => {
    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('checkForUpdates')).toBeInTheDocument();
    });
    const button = screen.getByText('checkForUpdates');
    fireEvent.click(button);
    expect(mockCheckUpdate).toHaveBeenCalledWith(false);
  });

  it('shows available update and update now button', async () => {
    (useUpdate as any).mockReturnValue({
      status: 'available',
      update: { version: '1.1.0' },
      error: null,
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });

    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('newVersionAvailable')).toBeInTheDocument();
    });
    expect(screen.getByText('updateNow')).toBeInTheDocument();
  });

  it('calls installUpdate when update now button is clicked', async () => {
    (useUpdate as any).mockReturnValue({
      status: 'available',
      update: { version: '1.1.0' },
      error: null,
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });

    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('updateNow')).toBeInTheDocument();
    });
    const button = screen.getByText('updateNow');
    fireEvent.click(button);
    expect(mockInstallUpdate).toHaveBeenCalled();
  });

  it('shows up-to-date status', async () => {
    (useUpdate as any).mockReturnValue({
      status: 'up-to-date',
      update: null,
      error: null,
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });

    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('upToDate')).toBeInTheDocument();
    });
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows error message', async () => {
    (useUpdate as any).mockReturnValue({
      status: 'error',
      update: null,
      error: 'Failed to fetch',
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });

    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('shows loading state when checking', async () => {
    (useUpdate as any).mockReturnValue({
      status: 'checking',
      update: null,
      error: null,
      checkUpdate: mockCheckUpdate,
      installUpdate: mockInstallUpdate,
    });

    render(<UpdateSection />);
    await waitFor(() => {
      expect(screen.getByText('checking')).toBeInTheDocument();
    });
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
  });
});
