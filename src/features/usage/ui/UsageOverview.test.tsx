import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageOverview } from './UsageOverview';
import { UsageSummary } from '@/models/usage';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Coins: () => <div data-testid="coins-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  MessageSquare: () => <div data-testid="message-square-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
}));

describe('UsageOverview', () => {
  const mockSummary: UsageSummary = {
    total_cost: 1.234567,
    total_input_tokens: 1000,
    total_output_tokens: 500,
    total_requests: 50,
    average_latency: 120.5,
  };

  it('renders loading state', () => {
    const { container } = render(
      <UsageOverview summary={mockSummary} loading={true} />
    );
    // Check for skeletons
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0
    );
  });

  it('renders summary data correctly', () => {
    render(<UsageOverview summary={mockSummary} loading={false} />);

    // Total Cost (formatted with currency)
    expect(screen.getByText(/\$1\.2346/)).toBeInTheDocument();

    // Total Tokens (1000 + 500 = 1500)
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('1,000')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();

    // Total Requests
    expect(screen.getByText('50')).toBeInTheDocument();

    // Avg Latency
    expect(screen.getByText('121')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <UsageOverview summary={mockSummary} loading={false} />
    );
    expect(container).toMatchSnapshot();
  });
});
