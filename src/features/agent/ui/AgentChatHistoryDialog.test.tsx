import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AgentChatHistoryDialog } from './AgentChatHistoryDialog';
import { invokeCommand } from '@/lib/tauri';
import type { Message } from '@/features/chat/types';

// Mock dependencies
vi.mock('@/lib/tauri');
vi.mock('use-stick-to-bottom', () => ({
  useStickToBottom: () => ({
    scrollRef: vi.fn(),
    contentRef: { current: null },
    scrollToBottom: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bot: () => <div data-testid="bot-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

// Mock MessageList component
vi.mock('@/features/chat/ui/chat/MessageList', () => ({
  MessageList: ({ messages }: { messages: Message[] }) => (
    <div data-testid="message-list">
      {messages.map((msg) => (
        <div key={msg.id} data-testid={`message-${msg.role}`}>
          {msg.content}
        </div>
      ))}
    </div>
  ),
}));

// Mock useAppSettings
vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({}),
}));

// Mock RTK Query API
const mockGetInstalledAgentsQuery = vi.fn();
vi.mock('../state/api', () => ({
  useGetInstalledAgentsQuery: (...args: any[]) =>
    mockGetInstalledAgentsQuery(...args),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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

const mockMessages = [
  {
    id: 'msg-1',
    role: 'user',
    content: 'Hello agent',
    timestamp: 1000000,
    assistant_message_id: null,
    reasoning: null,
    metadata: null,
  },
  {
    id: 'msg-2',
    role: 'assistant',
    content: 'Hello! How can I help?',
    timestamp: 2000000,
    assistant_message_id: null,
    reasoning: null,
    metadata: null,
  },
];

const mockAgent = {
  manifest: {
    id: 'test-agent',
    name: 'Test Agent',
    description: 'A test agent',
    author: 'Test Author',
    schema_version: '1.0.0',
    permissions: [],
  },
  version_ref: 'abc123',
  path: '/path/to/agent',
  install_info: null,
};

describe('AgentChatHistoryDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInstalledAgentsQuery.mockReturnValue({
      data: [mockAgent],
      isLoading: false,
    });
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      open: true,
      onOpenChange: vi.fn(),
      sessionId: 'session-123',
      agentId: 'test-agent',
    };

    return render(
      <Provider store={mockStore}>
        <AgentChatHistoryDialog {...defaultProps} {...props} />
      </Provider>
    );
  };

  describe('Loading State', () => {
    it.skip('should show loading spinner when fetching messages', async () => {
      // Mock invokeCommand to delay response
      (invokeCommand as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockMessages), 100);
          })
      );

      renderComponent();

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });
    });

    it.skip('should match snapshot for loading state', async () => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockMessages), 100);
          })
      );

      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('Loaded State', () => {
    beforeEach(() => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMessages
      );
    });

    it('should render agent name in dialog header', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('Test Agent')).toBeInTheDocument();
      });
    });

    it('should render agent ID when agent name is available', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('test-agent')).toBeInTheDocument();
      });
    });

    it('should render messages after loading', async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      expect(screen.getByText('Hello agent')).toBeInTheDocument();
      expect(screen.getByText('Hello! How can I help?')).toBeInTheDocument();
    });

    it('should filter out tool messages from display', async () => {
      const messagesWithTool = [
        ...mockMessages,
        {
          id: 'msg-3',
          role: 'tool',
          content: 'Tool result',
          timestamp: 3000000,
          assistant_message_id: null,
          reasoning: null,
          metadata: null,
        },
      ];

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(
        messagesWithTool
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      // Should not render tool message
      expect(screen.queryByText('Tool result')).not.toBeInTheDocument();
    });

    it('should match snapshot for loaded state', async () => {
      const { container } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no messages', async () => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText('No messages in this chat')
        ).toBeInTheDocument();
      });
    });

    it('should render Bot icon in empty state', async () => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      renderComponent();

      await waitFor(() => {
        const botIcons = screen.getAllByTestId('bot-icon');
        expect(botIcons.length).toBeGreaterThan(0);
      });
    });

    it('should match snapshot for empty state', async () => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const { container } = renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText('No messages in this chat')
        ).toBeInTheDocument();
      });

      expect(container).toMatchSnapshot();
    });
  });

  describe('Dialog Behavior', () => {
    beforeEach(() => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMessages
      );
    });

    it('should not fetch messages when dialog is closed', () => {
      renderComponent({ open: false });

      expect(invokeCommand).not.toHaveBeenCalled();
    });

    it('should not fetch messages when sessionId is null', () => {
      renderComponent({ sessionId: null });

      expect(invokeCommand).not.toHaveBeenCalled();
    });

    it('should clear messages when dialog closes', async () => {
      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      // Close dialog
      rerender(
        <Provider store={mockStore}>
          <AgentChatHistoryDialog
            open={false}
            onOpenChange={vi.fn()}
            sessionId="session-123"
            agentId="test-agent"
          />
        </Provider>
      );

      // Messages should be cleared
      expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
    });

    it.skip('should refetch messages when sessionId changes', async () => {
      const { rerender } = renderComponent();

      await waitFor(() => {
        expect(invokeCommand).toHaveBeenCalledWith('get_messages', {
          chatId: 'session-123',
        });
      });

      // Change sessionId
      rerender(
        <Provider store={mockStore}>
          <AgentChatHistoryDialog
            open={true}
            onOpenChange={vi.fn()}
            sessionId="session-456"
            agentId="test-agent"
          />
        </Provider>
      );

      await waitFor(() => {
        expect(invokeCommand).toHaveBeenCalledWith('get_messages', {
          chatId: 'session-456',
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error gracefully', async () => {
      (invokeCommand as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch')
      );

      renderComponent();
    });

    it('should show empty state when fetch fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      (invokeCommand as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to fetch')
      );

      renderComponent();

      await waitFor(() => {
        expect(
          screen.getByText('No messages in this chat')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Agent Name Display', () => {
    it('should show agent ID when agent name is not found', async () => {
      mockGetInstalledAgentsQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMessages
      );

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('test-agent')).toBeInTheDocument();
      });
    });

    it('should show fallback text when both agent name and ID are null', async () => {
      mockGetInstalledAgentsQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMessages
      );

      renderComponent({ agentId: null });

      await waitFor(() => {
        expect(screen.getByText('Agent Chat History')).toBeInTheDocument();
      });
    });

    it('should skip agent query when agentId is null', () => {
      renderComponent({ agentId: null });

      // Query should be skipped
      expect(mockGetInstalledAgentsQuery).toHaveBeenCalledWith(undefined, {
        skip: true,
      });
    });
  });

  describe('Message Transformation', () => {
    it('should transform database messages to Message format', async () => {
      const dbMessages = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test message',
          timestamp: 1000, // seconds
          assistant_message_id: 'asst-1',
          reasoning: 'Some reasoning',
          metadata: '{"key": "value"}',
        },
      ];

      (invokeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(dbMessages);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      // Verify message is displayed
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });
});
