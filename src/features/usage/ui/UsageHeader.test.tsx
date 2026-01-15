import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UsageHeader } from './UsageHeader';
import { UsageFilter } from '@/models/usage';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: () => <div data-testid="clock-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
}));

// Mock Shadcn UI components
vi.mock('@/ui/atoms/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (val: string) => void;
  }) => (
    <select
      data-testid="select-mock"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

vi.mock('@/ui/atoms/dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-root">{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe('UsageHeader', () => {
  const mockFilter: UsageFilter = {
    date_from: undefined,
    date_to: undefined,
  };
  const mockOnFilterChange = vi.fn();
  const mockOnIntervalChange = vi.fn();
  const mockOnClearUsage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    return render(
      <UsageHeader
        filter={mockFilter}
        onFilterChange={mockOnFilterChange}
        interval="hour"
        onIntervalChange={mockOnIntervalChange}
        onClearUsage={mockOnClearUsage}
        {...props}
      />
    );
  };

  it('renders filter and interval options', () => {
    renderComponent();
    expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    expect(screen.getByText('Clear Data')).toBeInTheDocument();
  });

  it('calls onIntervalChange when interval is changed', async () => {
    renderComponent();
    const selects = screen.getAllByTestId('select-mock');
    const intervalSelect = selects[0];

    fireEvent.change(intervalSelect, { target: { value: 'day' } });
    expect(mockOnIntervalChange).toHaveBeenCalledWith('day');
  });

  it('calls onFilterChange when period is changed', async () => {
    renderComponent();
    const selects = screen.getAllByTestId('select-mock');
    const periodSelect = selects[1];

    // Mock Date.now to have predictable results
    const now = 1640000000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(now * 1000);

    fireEvent.change(periodSelect, { target: { value: '24h' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...mockFilter,
      date_from: now - 86400,
      date_to: undefined,
    });

    fireEvent.change(periodSelect, { target: { value: '7d' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...mockFilter,
      date_from: now - 7 * 86400,
      date_to: undefined,
    });

    fireEvent.change(periodSelect, { target: { value: '30d' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...mockFilter,
      date_from: now - 30 * 86400,
      date_to: undefined,
    });

    fireEvent.change(periodSelect, { target: { value: 'all' } });
    expect(mockOnFilterChange).toHaveBeenCalledWith({
      ...mockFilter,
      date_from: undefined,
      date_to: undefined,
    });

    dateSpy.mockRestore();
  });

  it('calls onClearUsage when delete is clicked', () => {
    renderComponent();
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);
    expect(mockOnClearUsage).toHaveBeenCalled();
  });

  it('matches snapshot', () => {
    const { container } = renderComponent();
    expect(container).toMatchSnapshot();
  });
});
