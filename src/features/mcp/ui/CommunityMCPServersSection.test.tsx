import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityMCPServersSection } from './CommunityMCPServersSection';
import { invokeCommand } from '@/lib/tauri';
import { useAppDispatch } from '@/app/hooks';

// Mock dependencies
vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    FETCH_HUB_MCP_SERVERS: 'fetch_hub_mcp_servers',
    REFRESH_HUB_INDEX: 'refresh_hub_index',
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
  Server: () => <div data-testid="icon-Server" />,
  RefreshCw: () => <div data-testid="icon-RefreshCw" />,
  Search: () => <div data-testid="icon-Search" />,
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

describe('CommunityMCPServersSection', () => {
  const mockDispatch = vi.fn();
  const mockOnInstall = vi.fn();

  const mockServers = [
    {
      id: 'mcp-server-1',
      name: 'Test Hub Server',
      description: 'A test server from hub',
      type: 'sse',
      config: { url: 'http://test.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (invokeCommand as Mock).mockResolvedValue(mockServers);
  });

  it('renders loading state initially', async () => {
    // delay resolve to catch loading state
    (invokeCommand as Mock).mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve(mockServers), 100))
    );

    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    expect(screen.getByText('loadingHubMCPServers')).toBeInTheDocument();
  });

  it('renders servers after loading', async () => {
    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Hub Server')).toBeInTheDocument();
    });
    expect(screen.getByText('A test server from hub')).toBeInTheDocument();
  });

  it('filters servers by search query', async () => {
    const user = userEvent.setup();
    (invokeCommand as Mock).mockResolvedValue([
      ...mockServers,
      {
        id: 'mcp-server-2',
        name: 'Another Server',
        description: 'Different description',
        type: 'stdio',
        config: { command: 'node' },
      },
    ]);

    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Hub Server')).toBeInTheDocument();
    });
    expect(screen.getByText('Another Server')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('searchMCPServers');
    await user.type(searchInput, 'Another');

    expect(screen.queryByText('Test Hub Server')).not.toBeInTheDocument();
    expect(screen.getByText('Another Server')).toBeInTheDocument();
  });

  it('calls onInstall when install button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Hub Server')).toBeInTheDocument();
    });

    const installButton = screen.getByText('install');
    await user.click(installButton);

    expect(mockOnInstall).toHaveBeenCalledWith(mockServers[0]);
  });

  it('shows installed state if server is already installed', async () => {
    render(
      <CommunityMCPServersSection
        installedServerIds={['mcp-server-1']}
        onInstall={mockOnInstall}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('installed')).toBeInTheDocument();
    });
    expect(screen.getByText('installed')).toBeDisabled();
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Hub Server')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('refresh');
    await user.click(refreshButton);

    expect(invokeCommand).toHaveBeenCalledWith('refresh_hub_index');
    expect(invokeCommand).toHaveBeenCalledWith('fetch_hub_mcp_servers');
  });
});
