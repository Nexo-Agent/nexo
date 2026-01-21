import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InstallMCPServerDialog } from './InstallMCPServerDialog';
import { invokeCommand } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';
import { showSuccess } from '@/features/notifications/state/notificationSlice';
import { HubMCPServer } from '../types';

// Mock dependencies
vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    INSTALL_MCP_SERVER_FROM_HUB: 'install_mcp_server_from_hub',
  },
}));

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

vi.mock('@/features/notifications/state/notificationSlice', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="icon-Download" />,
  Loader2: () => <div data-testid="icon-Loader2" />,
  XIcon: () => <div data-testid="icon-XIcon" />,
  ChevronDownIcon: () => <div data-testid="icon-ChevronDownIcon" />,
  ChevronUpIcon: () => <div data-testid="icon-ChevronUpIcon" />,
  CheckIcon: () => <div data-testid="icon-CheckIcon" />,
}));

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('InstallMCPServerDialog', () => {
  const mockDispatch = vi.fn();
  const mockOnOpenChange = vi.fn();
  const mockOnInstalled = vi.fn();

  const mockServer: HubMCPServer = {
    id: 'mcp-server-1',
    name: 'Test Hub Server',
    description: 'A test server from hub',
    type: 'sse',
    icon: '',
    config: {
      url: 'http://test.com',
      headers: { Authorization: 'Bearer test' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
  });

  it('renders correctly when open', () => {
    render(
      <InstallMCPServerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        server={mockServer}
        onInstalled={mockOnInstalled}
      />
    );

    expect(screen.getByText(/installMCPServer/)).toBeInTheDocument();
    expect(screen.getByText(/Test Hub Server/)).toBeInTheDocument();
    expect(screen.getByText(/A test server from hub/)).toBeInTheDocument();
    expect(screen.getByText(/SSE/)).toBeInTheDocument();
    expect(screen.getByText(/http:\/\/test\.com/)).toBeInTheDocument();
  });

  it('renders stdio config correctly', () => {
    const stdioServer: HubMCPServer = {
      ...mockServer,
      type: 'stdio',
      config: {
        command: 'npx',
        args: ['-y', 'test-server'],
        env: { KEY: 'VALUE' },
      },
    };

    render(
      <InstallMCPServerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        server={stdioServer}
        onInstalled={mockOnInstalled}
      />
    );

    expect(screen.getByText('STDIO')).toBeInTheDocument();
    expect(screen.getByText(/Command: npx/)).toBeInTheDocument();
    expect(screen.getByText(/Args: -y test-server/)).toBeInTheDocument();
    expect(screen.getByText(/"KEY": "VALUE"/)).toBeInTheDocument();
  });

  it('handles install process', async () => {
    const user = userEvent.setup();
    (invokeCommand as Mock).mockResolvedValue({});

    render(
      <InstallMCPServerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        server={mockServer}
        onInstalled={mockOnInstalled}
      />
    );

    const installButton = screen.getByText('install');
    await user.click(installButton);

    expect(invokeCommand).toHaveBeenCalledWith(
      'install_mcp_server_from_hub',
      expect.any(Object)
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      showSuccess('mcpServerInstalled', 'mcpServerInstalledDescription')
    );
    expect(mockOnInstalled).toHaveBeenCalled();
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles cancel', async () => {
    const user = userEvent.setup();

    render(
      <InstallMCPServerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        server={mockServer}
        onInstalled={mockOnInstalled}
      />
    );

    const cancelButton = screen.getByText('cancel');
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('returns null if no server is provided', () => {
    const { container } = render(
      <InstallMCPServerDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        server={null}
        onInstalled={mockOnInstalled}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
