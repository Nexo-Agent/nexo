import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsageChart } from './UsageChart';
import { UsageChartPoint } from '@/models/usage';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Legend: () => <div data-testid="legend" />,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
}));

describe('UsageChart', () => {
  const mockData: UsageChartPoint[] = [
    {
      timestamp: 1640000000,
      input_tokens: 100,
      output_tokens: 50,
      requests: 1,
      cost: 0.001,
    },
    {
      timestamp: 1640003600,
      input_tokens: 200,
      output_tokens: 80,
      requests: 2,
      cost: 0.002,
    },
  ];

  it('renders loading state', () => {
    const { container } = render(<UsageChart data={mockData} loading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(<UsageChart data={[]} loading={false} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart when data is provided', () => {
    render(<UsageChart data={mockData} loading={false} />);
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('Usage Trend')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(
      <UsageChart data={mockData} loading={false} />
    );
    expect(container).toMatchSnapshot();
  });
});
