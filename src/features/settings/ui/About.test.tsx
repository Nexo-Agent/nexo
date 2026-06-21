import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { About } from './About';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
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

vi.mock('lucide-react', () => ({
  Info: () => <div data-testid="info-icon" />,
  Github: () => <div data-testid="github-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  BookOpen: () => <div data-testid="book-icon" />,
  Heart: () => <div data-testid="heart-icon" />,
}));

const mockOpenUrl = vi.fn();
// Mock dynamic import for @tauri-apps/plugin-opener
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: (url: string) => {
    mockOpenUrl(url);
    return Promise.resolve();
  },
}));

interface MockComponentProps {
  children?: React.ReactNode;
}

// Mock atoms
vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogHeader: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogTitle: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogBody: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

vi.mock('@/ui/atoms/separator', () => ({
  Separator: () => <hr />,
}));

vi.mock('@/ui/atoms/button/button', () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe('About', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app name and version', () => {
    render(<About {...defaultProps} />);

    expect(screen.getByText('Nexo')).toBeInTheDocument();
    expect(screen.getByText(/version/i)).toBeInTheDocument();
  });

  it('renders key features', () => {
    render(<About {...defaultProps} />);

    expect(screen.getByText('Key Features')).toBeInTheDocument();
    expect(screen.getByText('Multi-LLM Support')).toBeInTheDocument();
    expect(screen.getByText('MCP Integration')).toBeInTheDocument();
  });

  it('calls openUrl when link buttons are clicked', async () => {
    render(<About {...defaultProps} />);

    const githubButton = screen.getByText('GitHub').closest('button');
    if (githubButton) fireEvent.click(githubButton);
    await waitFor(() =>
      expect(mockOpenUrl).toHaveBeenCalledWith(
        'https://github.com/Nexo-Agent/nexo'
      )
    );

    const websiteButton = screen.getByText('Website').closest('button');
    if (websiteButton) fireEvent.click(websiteButton);
    await waitFor(() =>
      expect(mockOpenUrl).toHaveBeenCalledWith('https://nexo.nkthanh.dev')
    );

    const docsButton = screen.getByText('Docs').closest('button');
    if (docsButton) fireEvent.click(docsButton);
    await waitFor(() =>
      expect(mockOpenUrl).toHaveBeenCalledWith('https://nexo-docs.nkthanh.dev')
    );
  });

  it('does not render when open is false', () => {
    render(<About {...defaultProps} open={false} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});
