import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HubScreen } from './HubScreen';
import { useGetInstalledPromptsQuery } from '../state/api';

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
// Mock RTK Query hooks
vi.mock('../state/api', () => ({
  useGetHubAgentsQuery: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
  })),
  useGetHubPromptsQuery: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
  })),
  useGetInstalledPromptsQuery: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/features/agent/state/api', () => ({
  useGetInstalledAgentsQuery: vi.fn(() => ({
    refetch: vi.fn(),
  })),
}));

vi.mock('@/features/mcp', () => ({
  useGetMCPConnectionsQuery: vi.fn(() => ({
    data: [],
    refetch: vi.fn(),
  })),
}));

vi.mock('./CommunityAgentsSection', () => ({
  CommunityAgentsSection: () => (
    <div data-testid="community-agents">Community Agents</div>
  ),
}));

vi.mock('@/features/mcp/ui/CommunityMCPServersSection', () => ({
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

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({
    enableAgents: true,
  }),
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

  it('fetches initial data using RTK Query', () => {
    render(<HubScreen />);
    expect(useGetInstalledPromptsQuery).toHaveBeenCalled();
  });
});
