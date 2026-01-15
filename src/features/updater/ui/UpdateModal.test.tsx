import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateModal } from './UpdateModal';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Info: () => <div data-testid="info-icon" />,
}));

vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogBody: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/ui/atoms/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/ui/organisms/markdown/MarkdownContent', () => ({
  MarkdownContent: ({ content }: { content: string }) => (
    <div data-testid="markdown">{content}</div>
  ),
}));

describe('UpdateModal', () => {
  const mockUpdate = {
    version: '1.1.0',
    date: '2024-01-01',
    body: 'New features and bug fixes',
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    status: 'available' as const,
    update: mockUpdate as any, // Typed as Update | null in component, but it's complex to mock fully
    installUpdate: vi.fn(),
    downloadProgress: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders update information correctly', () => {
    render(<UpdateModal {...defaultProps} />);
    expect(screen.getByText('v1.1.0')).toBeInTheDocument();
    expect(screen.getByText('updateAvailable')).toBeInTheDocument();
  });

  it('shows release notes when toggled', () => {
    render(<UpdateModal {...defaultProps} />);
    const toggleButton = screen.getByText('viewReleaseNotes');
    fireEvent.click(toggleButton);
    expect(screen.getByTestId('markdown')).toHaveTextContent(
      'New features and bug fixes'
    );
  });

  it('shows progress bar when downloading', () => {
    render(
      <UpdateModal
        {...defaultProps}
        status="downloading"
        downloadProgress={45}
      />
    );
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('downloading')).toBeInTheDocument();
  });

  it('shows progress bar when installing', () => {
    render(
      <UpdateModal
        {...defaultProps}
        status="installing"
        downloadProgress={90}
      />
    );
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('installing')).toBeInTheDocument();
  });

  it('shows ready message when status is ready-to-restart', () => {
    render(<UpdateModal {...defaultProps} status="ready-to-restart" />);
    expect(screen.getByText('updateReadyRestart')).toBeInTheDocument();
  });

  it('calls installUpdate when button is clicked', () => {
    render(<UpdateModal {...defaultProps} />);
    const updateButton = screen.getByText('updateNow');
    fireEvent.click(updateButton);
    expect(defaultProps.installUpdate).toHaveBeenCalled();
  });

  it('disables buttons during installation', () => {
    render(<UpdateModal {...defaultProps} status="installing" />);
    const updateButton = screen.getByText('updateNow');
    const laterButton = screen.getByText('remindMeLater');
    expect(updateButton).toBeDisabled();
    expect(laterButton).toBeDisabled();
  });

  it('calls onOpenChange when close button is clicked', () => {
    render(<UpdateModal {...defaultProps} />);
    const laterButton = screen.getByText('remindMeLater');
    fireEvent.click(laterButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });
});
