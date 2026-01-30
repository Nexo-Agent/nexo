import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityMCPServersSection } from './CommunityMCPServersSection';

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
  Check: () => <div data-testid="icon-Check" />,
}));

interface MockComponentProps {
  children?: React.ReactNode;
}

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: MockComponentProps) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogHeader: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogTitle: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogDescription: ({ children }: MockComponentProps) => (
    <div>{children}</div>
  ),
  DialogBody: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogFooter: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

vi.mock('@/ui/molecules/EntityCard', () => ({
  EntityCard: ({
    title,
    description,
    onClick,
    footer,
    extra,
    actions,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    onClick?: () => void;
    footer?: React.ReactNode;
    extra?: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div data-testid="entity-card" onClick={onClick}>
      <div>{title}</div>
      {description && <div>{description}</div>}
      {actions && <div>{actions}</div>}
      {extra && <div>{extra}</div>}
      {footer && <div>{footer}</div>}
    </div>
  ),
}));

vi.mock('@/ui/atoms/button/button', () => ({
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

// Mock RTK Query hooks
vi.mock('../state/api', () => ({
  useGetHubMCPServersQuery: vi.fn(),
  useRefreshHubIndexMutation: vi.fn(),
}));

import {
  useGetHubMCPServersQuery,
  useRefreshHubIndexMutation,
} from '../state/api';

describe('CommunityMCPServersSection', () => {
  const mockDispatch = vi.fn();
  const mockOnInstall = vi.fn();

  const mockServers = [
    {
      id: 'mcp-server-1',
      name: 'Test Hub Server',
      description: 'A test server from hub',
      icon: '',
      type: 'sse',
      config: { url: 'http://test.com' },
    },
  ];

  const mockRefetch = vi.fn();
  const mockRefreshHub = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);

    // Default mock implementation
    (useGetHubMCPServersQuery as Mock).mockReturnValue({
      data: mockServers,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    (useRefreshHubIndexMutation as Mock).mockReturnValue([
      mockRefreshHub.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
  });

  it('renders loading state initially', () => {
    (useGetHubMCPServersQuery as Mock).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

    render(
      <CommunityMCPServersSection
        installedServerIds={[]}
        onInstall={mockOnInstall}
      />
    );

    // HubCommunitySection renders skeletons during loading, so we check for the container
    expect(screen.getByTestId('scroll-area')).toBeInTheDocument();
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
    (useGetHubMCPServersQuery as Mock).mockReturnValue({
      data: [
        ...mockServers,
        {
          id: 'mcp-server-2',
          name: 'Another Server',
          description: 'Different description',
          type: 'stdio',
          config: { command: 'node' },
        },
      ],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: mockRefetch,
    });

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

    expect(mockRefreshHub).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });
});
