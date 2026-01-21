import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LLMConnections } from './LLMConnections';
import {
  useGetLLMConnectionsQuery,
  useCreateLLMConnectionMutation,
  useUpdateLLMConnectionMutation,
  useDeleteLLMConnectionMutation,
  useToggleLLMConnectionEnabledMutation,
} from '../hooks/useLLMConnections';
import { useAppDispatch } from '@/app/hooks';
import { showSuccess } from '@/features/notifications/state/notificationSlice';

// Mock dependencies
vi.mock('../hooks/useLLMConnections', () => ({
  useGetLLMConnectionsQuery: vi.fn(),
  useCreateLLMConnectionMutation: vi.fn(),
  useUpdateLLMConnectionMutation: vi.fn(),
  useDeleteLLMConnectionMutation: vi.fn(),
  useToggleLLMConnectionEnabledMutation: vi.fn(),
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
}));

vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="icon-Plus" />,
  Trash2: () => <div data-testid="icon-Trash2" />,
  RefreshCw: () => <div data-testid="icon-RefreshCw" />,
  CheckCircle2: () => <div data-testid="icon-CheckCircle2" />,
  XCircle: () => <div data-testid="icon-XCircle" />,
  Network: () => <div data-testid="icon-Network" />,
  XIcon: () => <div data-testid="icon-XIcon" />,
  ChevronDownIcon: () => <div data-testid="icon-ChevronDownIcon" />,
  ChevronUpIcon: () => <div data-testid="icon-ChevronUpIcon" />,
  CheckIcon: () => <div data-testid="icon-CheckIcon" />,
}));

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    TEST_LLM_CONNECTION: 'test_llm_connection',
  },
}));

// Mock atoms and other components to simplify
vi.mock('@/ui/atoms/provider-icon', () => ({
  ProviderIcon: ({ provider }: { provider: string }) => (
    <div data-testid={`provider-icon-${provider}`} />
  ),
}));

// Mock ScrollArea to just render its children
vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('LLMConnections', () => {
  const mockDispatch = vi.fn();
  const mockCreate = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockToggle = vi.fn();

  const mockConnections = [
    {
      id: '1',
      name: 'Test Connection',
      baseUrl: 'https://api.test.com',
      provider: 'openai',
      apiKey: 'test-key',
      enabled: true,
      models: [{ id: 'gpt-4', name: 'GPT-4' }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppDispatch as unknown as Mock).mockReturnValue(mockDispatch);
    (useGetLLMConnectionsQuery as Mock).mockReturnValue({
      data: mockConnections,
      isLoading: false,
    });
    (useCreateLLMConnectionMutation as Mock).mockReturnValue([
      mockCreate,
      { isLoading: false },
    ]);
    (useUpdateLLMConnectionMutation as Mock).mockReturnValue([
      mockUpdate,
      { isLoading: false },
    ]);
    (useDeleteLLMConnectionMutation as Mock).mockReturnValue([
      mockDelete,
      { isLoading: false },
    ]);
    (useToggleLLMConnectionEnabledMutation as Mock).mockReturnValue([
      mockToggle,
      { isLoading: false },
    ]);

    mockCreate.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockUpdate.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockDelete.mockReturnValue({ unwrap: () => Promise.resolve() });
    mockToggle.mockReturnValue({ unwrap: () => Promise.resolve() });
  });

  it('renders correctly with connections', () => {
    render(<LLMConnections />);
    expect(screen.getByText('manageLLMConnections')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
  });

  it('renders empty state when no connections', () => {
    (useGetLLMConnectionsQuery as Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
    render(<LLMConnections />);
    expect(screen.getByText('noConnections')).toBeInTheDocument();
  });

  it('opens add connection dialog when clicking add button', async () => {
    const user = userEvent.setup();
    render(<LLMConnections />);

    await user.click(screen.getByText('addConnection'));

    expect(screen.getByText('addNewConnection')).toBeInTheDocument();
  });

  it('opens edit connection dialog when clicking on connection', async () => {
    const user = userEvent.setup();
    render(<LLMConnections />);

    await user.click(screen.getByText('Test Connection'));

    expect(screen.getByText('editConnection')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Connection')).toBeInTheDocument();
  });

  it('toggles connection enabled state', async () => {
    const user = userEvent.setup();
    render(<LLMConnections />);

    // Switch is a bit complex to find, might need data-testid or aria-label if available.
    // Looking at the code: <Switch checked={connection.enabled} ... />
    // Radix Switch usually has role="switch"
    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(mockToggle).toHaveBeenCalledWith({ id: '1', enabled: false });
  });

  it('handles delete connection', async () => {
    const user = userEvent.setup();
    render(<LLMConnections />);

    // Click edit first
    await user.click(screen.getByText('Test Connection'));

    // Click delete in dialog
    await user.click(screen.getByText('delete'));

    // Confirm delete in second dialog
    expect(
      await screen.findByText(/confirmDeleteConnection/)
    ).toBeInTheDocument();

    const confirmButtons = screen.getAllByText('delete');
    // The second 'delete' button is in the confirm dialog
    await user.click(confirmButtons[confirmButtons.length - 1]);

    expect(mockDelete).toHaveBeenCalledWith('1');
    expect(mockDispatch).toHaveBeenCalledWith(
      showSuccess('connectionDeleted', 'connectionDeletedDescription')
    );
  });
});
