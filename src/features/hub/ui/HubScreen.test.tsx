import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HubScreen } from './HubScreen';

// Mock dependencies
vi.mock('@/ui/atoms/tabs', () => {
  return {
    Tabs: ({
      value,
      onValueChange,
      children,
    }: {
      value: string;
      onValueChange: (val: string) => void;
      children: React.ReactNode;
    }) => (
      <div>
        <div data-testid="tabs-value">{value}</div>
        <div data-testid="tabs-buttons">
          <button onClick={() => onValueChange('agent')}>Agent Tab</button>
          <button onClick={() => onValueChange('mcp')}>MCP Tab</button>
          <button onClick={() => onValueChange('prompt')}>Prompt Tab</button>
        </div>
        {children}
      </div>
    ),
    TabsList: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    TabsTrigger: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    TabsContent: ({
      value,
      children,
    }: {
      value: string;
      children: React.ReactNode;
    }) => <div data-testid={`tab-content-${value}`}>{children}</div>,
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

vi.mock('@/features/agent/state/api', () => ({
  useGetInstalledAgentsQuery: vi.fn(() => ({
    refetch: vi.fn(),
  })),
}));

vi.mock('@/features/mcp/hooks/useMCPConnections', () => ({
  useGetMCPConnectionsQuery: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
  })),
}));

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(() => Promise.resolve([])),
  TauriCommands: {
    GET_PROMPTS: 'get_prompts',
  },
}));

vi.mock('./CommunityAgentsSection', () => ({
  CommunityAgentsSection: () => (
    <div data-testid="community-agents">Community Agents</div>
  ),
}));

vi.mock('./CommunityMCPServersSection', () => ({
  CommunityMCPServersSection: () => (
    <div data-testid="community-mcp">Community MCP</div>
  ),
}));

vi.mock('./CommunityPromptsSection', () => ({
  CommunityPromptsSection: () => (
    <div data-testid="community-prompts">Community Prompts</div>
  ),
}));

vi.mock('./InstallMCPServerDialog', () => ({
  InstallMCPServerDialog: () => <div data-testid="install-mcp-dialog" />,
}));

vi.mock('./InstallPromptDialog', () => ({
  InstallPromptDialog: () => <div data-testid="install-prompt-dialog" />,
}));

vi.mock('lucide-react', () => ({
  Bot: () => <div />,
  Server: () => <div />,
  FileText: () => <div />,
}));

describe('HubScreen', () => {
  it('renders correctly with default tab', () => {
    render(<HubScreen />);

    expect(screen.getByTestId('tabs-value')).toHaveTextContent('agent');
    expect(screen.getByTestId('community-agents')).toBeInTheDocument();
  });

  it('switches to MCP tab', () => {
    render(<HubScreen />);

    fireEvent.click(screen.getByText('MCP Tab'));

    expect(screen.getByTestId('tabs-value')).toHaveTextContent('mcp');
    // Note: Since all TabsContent are rendered in our mock (just wrapped), we can check existence.
    // But testing the visibility logic depends on real Tabs implementation.
    // Here we mainly test that HubScreen updates the state passed to Tabs.
    expect(screen.getByTestId('tab-content-mcp')).toBeInTheDocument();
  });

  it('switches to Prompt tab', () => {
    render(<HubScreen />);

    fireEvent.click(screen.getByText('Prompt Tab'));

    expect(screen.getByTestId('tabs-value')).toHaveTextContent('prompt');
    expect(screen.getByTestId('tab-content-prompt')).toBeInTheDocument();
  });

  it('fetches prompts on mount', async () => {
    const { invokeCommand } = await import('@/lib/tauri');
    render(<HubScreen />);

    await waitFor(() => {
      expect(invokeCommand).toHaveBeenCalledWith('get_prompts');
    });
  });
});
