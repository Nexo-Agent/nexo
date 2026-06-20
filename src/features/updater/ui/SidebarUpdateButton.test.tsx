import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarUpdateButton } from './SidebarUpdateButton';
import { useAppUpdate } from '../UpdateProvider';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: string | { defaultValue?: string; version?: string }
    ) => {
      if (typeof options === 'string') {
        return options;
      }
      if (options?.defaultValue) {
        return options.defaultValue.replace(
          '{{version}}',
          options.version ?? ''
        );
      }
      return key;
    },
  }),
}));

vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
}));

vi.mock('../UpdateProvider', () => ({
  useAppUpdate: vi.fn(),
}));

describe('SidebarUpdateButton', () => {
  const mockInstallUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'idle',
      update: null,
      installUpdate: mockInstallUpdate,
      downloadProgress: 0,
    });
  });

  it('renders nothing when no update is available', () => {
    const { container } = render(<SidebarUpdateButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders update button when update is available', () => {
    (useAppUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'available',
      update: { version: '1.1.0' },
      installUpdate: mockInstallUpdate,
      downloadProgress: 0,
    });

    render(<SidebarUpdateButton />);
    expect(screen.getByText('Cập nhật v1.1.0')).toBeInTheDocument();
  });

  it('calls installUpdate when button is clicked', () => {
    (useAppUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'available',
      update: { version: '1.1.0' },
      installUpdate: mockInstallUpdate,
      downloadProgress: 0,
    });

    render(<SidebarUpdateButton />);
    fireEvent.click(screen.getByText('Cập nhật v1.1.0'));
    expect(mockInstallUpdate).toHaveBeenCalled();
  });

  it('shows progress bar while downloading', () => {
    (useAppUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'downloading',
      update: { version: '1.1.0' },
      installUpdate: mockInstallUpdate,
      downloadProgress: 42,
    });

    render(<SidebarUpdateButton />);
    expect(screen.getAllByText('42%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Đang tải xuống...').length).toBeGreaterThan(0);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });

  it('disables button while updating', () => {
    (useAppUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      status: 'downloading',
      update: { version: '1.1.0' },
      installUpdate: mockInstallUpdate,
      downloadProgress: 10,
    });

    render(<SidebarUpdateButton />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
