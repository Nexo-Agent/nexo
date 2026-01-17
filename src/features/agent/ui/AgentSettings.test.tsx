import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AgentSettings } from './AgentSettings';
import type { InstalledAgent } from '../types';

// Mock dependencies
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock RTK Query API
const mockRefetch = vi.fn();
const mockUseGetInstalledAgentsQuery = vi.fn();
vi.mock('../state/api', () => ({
  useGetInstalledAgentsQuery: () => mockUseGetInstalledAgentsQuery(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Download: () => <div data-testid="download-icon" />,
  GitBranch: () => <div data-testid="git-branch-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  ChevronUp: () => <div data-testid="chevron-up-icon" />,
  Bot: () => <div data-testid="bot-icon" />,
  ExternalLink: () => <div data-testid="external-link-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Wrench: () => <div data-testid="wrench-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

// Mock Radix UI Dialog
vi.mock('@radix-ui/react-dialog', () => ({
  Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Portal: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Overlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Content: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Description: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Close: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockStore = configureStore({
  reducer: {
    // Add minimal reducers if needed
  },
});

const mockAgents: InstalledAgent[] = [
  {
    manifest: {
      id: 'test-agent-1',
      name: 'Test Agent 1',
      description: 'A test agent for unit testing',
      author: 'Test Author',
      schema_version: 1,
      permissions: ['read', 'write'],
      homepage: 'https://example.com',
      repository: 'https://github.com/test/agent1',
      license: 'MIT',
    },
    version_ref: 'abc123def456',
    path: '/path/to/agent1',
    install_info: {
      source: {
        type: 'git',
        url: 'https://github.com/test/agent1',
      },
      installed_at: 1640000000,
      updated_at: 1640000000,
    },
  },
  {
    manifest: {
      id: 'test-agent-2',
      name: 'Test Agent 2',
      description: 'Another test agent',
      author: 'Test Author 2',
      schema_version: 1,
      permissions: [],
    },
    version_ref: 'xyz789',
    path: '/path/to/agent2',
    install_info: {
      source: {
        type: 'local',
      },
      installed_at: 1650000000,
      updated_at: 1650000000,
    },
  },
];

describe('AgentSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetInstalledAgentsQuery.mockReturnValue({
      data: mockAgents,
      isLoading: false,
      refetch: mockRefetch,
    });
  });

  const renderComponent = () => {
    return render(
      <Provider store={mockStore}>
        <AgentSettings />
      </Provider>
    );
  };

  describe('Initial Rendering', () => {
    it('should render installation section', () => {
      renderComponent();

      expect(screen.getByText('Install New Agent')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Install agents from local zip files or remote Git repositories.'
        )
      ).toBeInTheDocument();
    });

    it('should render local installation card', () => {
      renderComponent();

      expect(screen.getByText('Local Installation')).toBeInTheDocument();
      expect(
        screen.getByText('Install an agent from a .zip file on your computer.')
      ).toBeInTheDocument();
    });

    it('should render git installation card', () => {
      renderComponent();

      expect(screen.getByText('Install from Git')).toBeInTheDocument();
      expect(
        screen.getByText('Clone and install directly from a repository.')
      ).toBeInTheDocument();
    });

    it('should render installed agents section', () => {
      renderComponent();

      expect(screen.getByText('Installed Agents')).toBeInTheDocument();
      expect(
        screen.getByText('Manage your local agent installations.')
      ).toBeInTheDocument();
    });

    it('should display total agent count', () => {
      renderComponent();

      expect(screen.getByText('2 Total')).toBeInTheDocument();
    });

    it('should match snapshot', () => {
      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Installed Agents Display', () => {
    it('should render all installed agents', () => {
      renderComponent();

      expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
      expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    });

    it('should display agent IDs', () => {
      renderComponent();

      expect(screen.getByText('test-agent-1')).toBeInTheDocument();
      expect(screen.getByText('test-agent-2')).toBeInTheDocument();
    });

    it('should display agent descriptions', () => {
      renderComponent();

      expect(
        screen.getByText('A test agent for unit testing')
      ).toBeInTheDocument();
      expect(screen.getByText('Another test agent')).toBeInTheDocument();
    });

    it('should display agent authors', () => {
      renderComponent();

      expect(screen.getByText('by Test Author')).toBeInTheDocument();
      expect(screen.getByText('by Test Author 2')).toBeInTheDocument();
    });

    it('should display truncated version refs', () => {
      renderComponent();

      expect(screen.getByText('vabc123d')).toBeInTheDocument();
      expect(screen.getByText('vxyz789')).toBeInTheDocument();
    });

    it('should render Bot icons for each agent', () => {
      renderComponent();

      const botIcons = screen.getAllByTestId('bot-icon');
      expect(botIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no agents installed', () => {
      mockUseGetInstalledAgentsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByText('No agents installed yet.')).toBeInTheDocument();
    });

    it('should display 0 Total when no agents', () => {
      mockUseGetInstalledAgentsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      renderComponent();

      expect(screen.getByText('0 Total')).toBeInTheDocument();
    });

    it('should match snapshot for empty state', () => {
      mockUseGetInstalledAgentsQuery.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });

      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Local Installation', () => {
    it('should render select zip file button', () => {
      renderComponent();

      expect(screen.getByText('Select Zip File')).toBeInTheDocument();
    });

    it('should call file dialog when select button is clicked', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const user = userEvent.setup();

      renderComponent();

      const selectButton = screen.getByText('Select Zip File');
      await user.click(selectButton);

      expect(open).toHaveBeenCalledWith({
        multiple: false,
        filters: [
          {
            name: 'Agent Package',
            extensions: ['zip'],
          },
        ],
      });
    });

    it.skip('should show loading state during installation', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const user = userEvent.setup();

      (open as ReturnType<typeof vi.fn>).mockResolvedValue(
        '/path/to/agent.zip'
      );
      (invoke as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderComponent();

      const selectButton = screen.getByText('Select Zip File');
      await user.click(selectButton);

      // Should show loader icon during installation
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Git Installation', () => {
    it('should render git URL input', () => {
      renderComponent();

      const input = screen.getByPlaceholderText('https://github.com/user/repo');
      expect(input).toBeInTheDocument();
    });

    it('should render Clone & Install button', () => {
      renderComponent();

      expect(screen.getByText('Clone & Install')).toBeInTheDocument();
    });

    it('should disable install button when URL is empty', () => {
      renderComponent();

      const installButton = screen.getByText('Clone & Install');
      expect(installButton).toBeDisabled();
    });

    it('should enable install button when URL is provided', async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText('https://github.com/user/repo');
      await user.type(input, 'https://github.com/test/repo');

      const installButton = screen.getByText('Clone & Install');
      expect(installButton).not.toBeDisabled();
    });

    it('should toggle advanced options', async () => {
      const user = userEvent.setup();
      renderComponent();

      const advancedButton = screen.getByText('Advanced options');
      await user.click(advancedButton);

      expect(screen.getByText('Hide options')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('main')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('/')).toBeInTheDocument();
    });

    it('should submit git installation form', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const user = userEvent.setup();

      renderComponent();

      const input = screen.getByPlaceholderText('https://github.com/user/repo');
      await user.type(input, 'https://github.com/test/repo');

      const installButton = screen.getByText('Clone & Install');
      await user.click(installButton);

      expect(invoke).toHaveBeenCalledWith('install_agent', {
        payload: {
          source_type: 'git',
          url: 'https://github.com/test/repo',
          revision: 'main',
          sub_path: '/',
        },
      });
    });

    it('should use custom revision and subpath when provided', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const user = userEvent.setup();

      renderComponent();

      // Enter URL
      const urlInput = screen.getByPlaceholderText(
        'https://github.com/user/repo'
      );
      await user.type(urlInput, 'https://github.com/test/repo');

      // Show advanced options
      const advancedButton = screen.getByText('Advanced options');
      await user.click(advancedButton);

      // Enter revision and subpath
      const revisionInput = screen.getByPlaceholderText('main');
      await user.type(revisionInput, 'develop');

      const subpathInput = screen.getByPlaceholderText('/');
      await user.type(subpathInput, '/agents/my-agent');

      const installButton = screen.getByText('Clone & Install');
      await user.click(installButton);

      expect(invoke).toHaveBeenCalledWith('install_agent', {
        payload: {
          source_type: 'git',
          url: 'https://github.com/test/repo',
          revision: 'develop',
          sub_path: '/agents/my-agent',
        },
      });
    });
  });

  describe('Agent Detail Dialog', () => {
    it.skip('should open dialog when agent card is clicked', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Agent Details')).toBeInTheDocument();
      });
    });

    it.skip('should display agent information in dialog', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
        expect(screen.getByText('test-agent-1')).toBeInTheDocument();
        expect(screen.getByText('Test Author')).toBeInTheDocument();
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
        expect(screen.getByText('MIT')).toBeInTheDocument();
      });
    });

    it('should display agent permissions', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Permissions (2)')).toBeInTheDocument();
        expect(screen.getByText('read')).toBeInTheDocument();
        expect(screen.getByText('write')).toBeInTheDocument();
      });
    });

    it('should fetch and display agent tools', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [
          { name: 'tool1', description: 'Tool 1 description' },
          { name: 'tool2', description: 'Tool 2 description' },
        ],
        instructions: 'Test instructions',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Tools (2)')).toBeInTheDocument();
        expect(screen.getByText('tool1')).toBeInTheDocument();
        expect(screen.getByText('Tool 1 description')).toBeInTheDocument();
        expect(screen.getByText('tool2')).toBeInTheDocument();
        expect(screen.getByText('Tool 2 description')).toBeInTheDocument();
      });
    });

    it('should display agent instructions', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: 'These are test instructions for the agent',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(
          screen.getByText('These are test instructions for the agent')
        ).toBeInTheDocument();
      });
    });

    it('should show loading state when fetching agent info', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);
      });
    });

    it('should show update button for git-installed agents', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument();
      });
    });

    it('should not show update button for locally installed agents', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 2');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.queryByText('Update')).not.toBeInTheDocument();
      });
    });

    it.skip('should show delete button', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Update', () => {
    it('should call update command when update button is clicked', async () => {
      const user = userEvent.setup();
      const { invoke } = await import('@tauri-apps/api/core');
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      // Open dialog
      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument();
      });

      // Click update
      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      expect(invoke).toHaveBeenCalledWith('update_agent', {
        agentId: 'test-agent-1',
      });
    });

    it('should show updating state', async () => {
      const user = userEvent.setup();
      const { invoke } = await import('@tauri-apps/api/core');
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      (invoke as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderComponent();

      // Open dialog
      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Update')).toBeInTheDocument();
      });

      // Click update
      const updateButton = screen.getByText('Update');
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Updating...')).toBeInTheDocument();
      });
    });
  });

  describe('Agent Deletion', () => {
    it.skip('should open delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      // Open agent dialog
      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      // Click delete
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Agent')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete/)
        ).toBeInTheDocument();
      });
    });

    it.skip('should call delete command when confirmed', async () => {
      const user = userEvent.setup();
      const { invoke } = await import('@tauri-apps/api/core');
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      renderComponent();

      // Open agent dialog
      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      // Click delete
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Agent')).toBeInTheDocument();
      });

      // Confirm delete
      const confirmButtons = screen.getAllByText('Delete');
      const confirmButton = confirmButtons.find(
        (btn) => btn.closest('button')?.type !== 'button'
      );
      if (confirmButton) {
        await user.click(confirmButton);
      }

      expect(invoke).toHaveBeenCalledWith('delete_agent', {
        agentId: 'test-agent-1',
      });
    });

    it.skip('should show deleting state', async () => {
      const user = userEvent.setup();
      const { invoke } = await import('@tauri-apps/api/core');
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue({
        tools: [],
        instructions: '',
      });

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd) => {
        if (cmd === 'delete_agent') {
          return new Promise((resolve) => setTimeout(resolve, 100));
        }
        return Promise.resolve();
      });

      renderComponent();

      // Open agent dialog
      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);

      await waitFor(() => {
        expect(screen.getByText('Delete')).toBeInTheDocument();
      });

      // Click delete
      const deleteButtons = screen.getAllByText('Delete');
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Agent')).toBeInTheDocument();
      });

      // Confirm delete
      const confirmButtons = screen.getAllByText('Delete');
      const confirmButton = confirmButtons[confirmButtons.length - 1];
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Deleting...')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error toast when local installation fails', async () => {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const { toast } = await import('sonner');
      const user = userEvent.setup();

      (open as ReturnType<typeof vi.fn>).mockResolvedValue(
        '/path/to/agent.zip'
      );
      (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Installation failed')
      );

      renderComponent();

      const selectButton = screen.getByText('Select Zip File');
      await user.click(selectButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to install agent')
        );
      });
    });

    it('should show error toast when git installation fails', async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      const { toast } = await import('sonner');
      const user = userEvent.setup();

      (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Git clone failed')
      );

      renderComponent();

      const input = screen.getByPlaceholderText('https://github.com/user/repo');
      await user.type(input, 'https://github.com/test/repo');

      const installButton = screen.getByText('Clone & Install');
      await user.click(installButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Installation failed')
        );
      });
    });

    it('should handle agent info fetch error gracefully', async () => {
      const user = userEvent.setup();
      const { invokeCommand } = await import('@/lib/tauri');

      (invokeCommand as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch agent info')
      );

      renderComponent();

      const agentCard = screen.getByText('Test Agent 1');
      await user.click(agentCard);
    });
  });

  describe('Responsive Layout', () => {
    it('should render grid layout for installation cards', () => {
      const { container } = renderComponent();

      const gridElement = container.querySelector(
        '.grid.gap-4.md\\:grid-cols-2'
      );
      expect(gridElement).toBeInTheDocument();
    });

    it('should render grid layout for agent cards', () => {
      const { container } = renderComponent();

      const gridElement = container.querySelector(
        '.grid.gap-3.md\\:grid-cols-2.lg\\:grid-cols-3'
      );
      expect(gridElement).toBeInTheDocument();
    });
  });
});
