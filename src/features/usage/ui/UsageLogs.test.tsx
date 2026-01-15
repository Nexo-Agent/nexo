import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageLogs } from './UsageLogs';
import { UsageStat } from '@/models/usage';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Database: () => <div data-testid="database-icon" />,
}));

describe('UsageLogs', () => {
  const mockLogs: UsageStat[] = [
    {
      id: '1',
      workspace_id: 'ws1',
      chat_id: 'c1',
      message_id: 'm1',
      timestamp: 1640000000,
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
      total_tokens: 150,
      latency_ms: 500,
      cost: 0.0045,
      status: 'success',
      is_stream: false,
      request_type: 'chat',
    },
    {
      id: '2',
      workspace_id: 'ws1',
      chat_id: 'c1',
      message_id: 'm2',
      timestamp: 164003600,
      model: 'claude-3',
      provider: 'anthropic',
      input_tokens: 200,
      output_tokens: 80,
      total_tokens: 280,
      latency_ms: 800,
      cost: 0.0084,
      status: 'error',
      is_stream: false,
      request_type: 'chat',
    },
  ];

  const mockOnPageChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    const { container } = render(
      <UsageLogs
        logs={[]}
        page={1}
        limit={10}
        onPageChange={mockOnPageChange}
        hasMore={false}
        loading={true}
      />
    );
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('renders logs correctly', () => {
    render(
      <UsageLogs
        logs={mockLogs}
        page={1}
        limit={10}
        onPageChange={mockOnPageChange}
        hasMore={false}
        loading={false}
      />
    );

    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    expect(screen.getByText('openai')).toBeInTheDocument();
    expect(screen.getByText('claude-3')).toBeInTheDocument();
    expect(screen.getByText('anthropic')).toBeInTheDocument();

    expect(screen.getByText('$0.00450')).toBeInTheDocument();
    expect(screen.getByText('$0.00840')).toBeInTheDocument();

    expect(screen.getByText('success')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('handles pagination clicks', () => {
    render(
      <UsageLogs
        logs={mockLogs}
        page={2}
        limit={2}
        onPageChange={mockOnPageChange}
        hasMore={true}
        loading={false}
      />
    );

    const prevButton = screen.getByText('Previous');
    const nextButton = screen.getByText('Next');

    fireEvent.click(prevButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(1);

    fireEvent.click(nextButton);
    expect(mockOnPageChange).toHaveBeenCalledWith(3);
  });

  it('disables pagination buttons appropriately', () => {
    render(
      <UsageLogs
        logs={mockLogs}
        page={1}
        limit={10}
        onPageChange={mockOnPageChange}
        hasMore={false}
        loading={false}
      />
    );

    expect(screen.getByText('Previous').closest('button')).toBeDisabled();
    expect(screen.getByText('Next').closest('button')).toBeDisabled();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <UsageLogs
        logs={mockLogs}
        page={1}
        limit={10}
        onPageChange={mockOnPageChange}
        hasMore={false}
        loading={false}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
