import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsagePage } from './UsagePage';
import { useUsage } from '../hooks/useUsage';

import { Mock } from 'vitest';

// Mock child components to simplify the page test
vi.mock('./UsageHeader', () => ({
  UsageHeader: () => <div data-testid="usage-header" />,
}));
vi.mock('./UsageOverview', () => ({
  UsageOverview: () => <div data-testid="usage-overview" />,
}));
vi.mock('./UsageChart', () => ({
  UsageChart: () => <div data-testid="usage-chart" />,
}));
vi.mock('./UsageLogs', () => ({
  UsageLogs: () => <div data-testid="usage-logs" />,
}));

// Mock useUsage hook
vi.mock('../hooks/useUsage', () => ({
  useUsage: vi.fn(),
}));

describe('UsagePage', () => {
  const mockUseUsage = useUsage as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUsage.mockReturnValue({
      filter: {},
      setFilter: vi.fn(),
      summary: {
        total_cost: 0,
        total_input_tokens: 0,
        total_output_tokens: 0,
        total_requests: 0,
        average_latency: 0,
      },
      chartData: [],
      logs: [],
      loading: false,
      interval: 'hour',
      setInterval: vi.fn(),
      page: 1,
      setPage: vi.fn(),
      LIMIT: 10,
      handleClearUsage: vi.fn(),
    });
  });

  it('renders all sections', () => {
    render(<UsagePage />);
    expect(screen.getByTestId('usage-header')).toBeInTheDocument();
    // Overview is only rendered if summary is present
    expect(screen.getByTestId('usage-overview')).toBeInTheDocument();
    expect(screen.getByTestId('usage-chart')).toBeInTheDocument();
    expect(screen.getByTestId('usage-logs')).toBeInTheDocument();
  });

  it('shows loading state overlay', () => {
    mockUseUsage.mockReturnValue({
      ...mockUseUsage(),
      loading: true,
    });
    const { container } = render(<UsagePage />);
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });

  it('does not render usage overview if summary is null', () => {
    mockUseUsage.mockReturnValue({
      ...mockUseUsage(),
      summary: null,
    });
    render(<UsagePage />);
    expect(screen.queryByTestId('usage-overview')).not.toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<UsagePage />);
    expect(container).toMatchSnapshot();
  });
});
