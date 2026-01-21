import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MCPServerConnections } from './MCPServerConnections';
import {
  useGetMCPConnectionsQuery,
  useCreateMCPConnectionMutation,
  useConnectMCPConnectionMutation,
  useDisconnectMCPConnectionMutation,
  useUpdateMCPConnectionMutation,
  useRemoveMCPConnectionMutation,
} from '../hooks/useMCPConnections';
import { useAppDispatch } from '@/app/hooks';
import { showSuccess } from '@/features/notifications/state/notificationSlice';
import { invokeCommand } from '@/lib/tauri';

// Mock dependencies
vi.mock('../hooks/useMCPConnections', () => ({
  useGetMCPConnectionsQuery: vi.fn(),
  useCreateMCPConnectionMutation: vi.fn(),
  useConnectMCPConnectionMutation: vi.fn(),
  useDisconnectMCPConnectionMutation: vi.fn(),
  useUpdateMCPConnectionMutation: vi.fn(),
  useRemoveMCPConnectionMutation: vi.fn(),
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
  Plus: () => <div data-testid="icon-Plus" />,
  Trash2: () => <div data-testid="icon-Trash2" />,
  AlertCircle: () => <div data-testid="icon-AlertCircle" />,
  RefreshCw: () => <div data-testid="icon-RefreshCw" />,
  Server: () => <div data-testid="icon-Server" />,
  PowerOff: () => <div data-testid="icon-PowerOff" />,
  XIcon: () => <div data-testid="icon-XIcon" />,
  ChevronDownIcon: () => <div data-testid="icon-ChevronDownIcon" />,
  ChevronUpIcon: () => <div data-testid="icon-ChevronUpIcon" />,
  CheckIcon: () => <div data-testid="icon-CheckIcon" />,
}));

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    GET_PYTHON_RUNTIMES_STATUS: 'get_python_runtimes_status',
    GET_NODE_RUNTIMES_STATUS: 'get_node_runtimes_status',
    UPDATE_MCP_SERVER_STATUS: 'update_mcp_server_status',
  },
}));

// Mock atoms that might cause issues in tests
vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}));

describe('MCPServerConnections', () => {
  const mockDispatch = vi.fn();
  const mockCreate = vi.fn();
  const mockConnect = vi.fn();
  const mockDisconnect = vi.fn();
  const mockUpdate = vi.fn();
  const mockRemove = vi.fn();
  const mockRefetch = vi.fn();

  const mockConnections = [
    {
      id: '1',
      name: 'Test MCP',
      url: 'http://localhost:8080/sse',
      type: 'sse',
      status: 'connected',
      tools: [{ name: 'test_tool', description: 'A test tool' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (useGetMCPConnectionsQuery as Mock).mockReturnValue({
      data: mockConnections,
      refetch: mockRefetch,
    });
    (useCreateMCPConnectionMutation as Mock).mockReturnValue([
      mockCreate,
      { isLoading: false },
    ]);
    (useConnectMCPConnectionMutation as Mock).mockReturnValue([
      mockConnect,
      { isLoading: false },
    ]);
    (useDisconnectMCPConnectionMutation as Mock).mockReturnValue([
      mockDisconnect,
      { isLoading: false },
    ]);
    (useUpdateMCPConnectionMutation as Mock).mockReturnValue([
      mockUpdate,
      { isLoading: false },
    ]);
    (useRemoveMCPConnectionMutation as Mock).mockReturnValue([
      mockRemove,
      { isLoading: false },
    ]);

    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve({ id: '2' }) });
    mockConnect.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockDisconnect.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockUpdate.mockReturnValue({
      unwrap: () => Promise.resolve({ needsReconnect: true }),
    });
    mockRemove.mockReturnValue({ unwrap: () => Promise.resolve() });

    (invokeCommand as Mock).mockResolvedValue([]);
  });

  it('renders correctly with connections', () => {
    render(<MCPServerConnections />);
    expect(screen.getByText('manageMCPServerConnections')).toBeInTheDocument();
    expect(screen.getByText('Test MCP')).toBeInTheDocument();
    expect(screen.getByText('test_tool')).toBeInTheDocument();
  });

  it('renders empty state when no connections', () => {
    (useGetMCPConnectionsQuery as Mock).mockReturnValue({
      data: [],
      refetch: mockRefetch,
    });
    render(<MCPServerConnections />);
    expect(screen.getByText('noConnections')).toBeInTheDocument();
  });

  it('opens add connection dialog when clicking add button', async () => {
    const user = userEvent.setup();
    render(<MCPServerConnections />);

    await user.click(screen.getByText('addConnection'));

    expect(screen.getByText('addNewConnection')).toBeInTheDocument();
  });

  it('opens edit connection dialog when clicking on connection card', async () => {
    const user = userEvent.setup();
    render(<MCPServerConnections />);

    await user.click(screen.getByText('Test MCP'));

    expect(screen.getByText('editConnection')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test MCP')).toBeInTheDocument();
  });

  it('handles reload connection', async () => {
    const user = userEvent.setup();
    render(<MCPServerConnections />);

    const reloadButton = screen.getByTitle('reloadConnection');
    await user.click(reloadButton);

    expect(invokeCommand).toHaveBeenCalledWith(
      'update_mcp_server_status',
      expect.any(Object)
    );
    expect(mockRefetch).toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('handles disconnect connection', async () => {
    const user = userEvent.setup();
    render(<MCPServerConnections />);

    const disconnectButton = screen.getByTitle('disconnectConnection');
    await user.click(disconnectButton);

    expect(mockDisconnect).toHaveBeenCalledWith('1');
    expect(mockDispatch).toHaveBeenCalledWith(
      showSuccess('connectionDisconnected', 'connectionDisconnectedDescription')
    );
  });

  it('handles delete connection from dialog', async () => {
    const user = userEvent.setup();
    render(<MCPServerConnections />);

    // Open edit dialog
    await user.click(screen.getByText('Test MCP'));

    // Click delete in edit dialog
    await user.click(screen.getByText('delete'));

    // Confirm in delete dialog
    expect(screen.getByText(/deleteConnectionConfirm/)).toBeInTheDocument();

    // There might be multiple 'delete' buttons (one in edit dialog, one in confirm dialog)
    const deleteButtons = screen.getAllByText('delete');
    await user.click(deleteButtons[deleteButtons.length - 1]);

    expect(mockRemove).toHaveBeenCalledWith('1');
  });
});
