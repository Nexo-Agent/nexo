import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HubCommunitySection } from './HubCommunitySection';
import { Settings } from 'lucide-react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Search: () => <div data-testid="search-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  LucideIcon: () => <div />,
}));

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock UI components
vi.mock('@/ui/atoms/button/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: React.ComponentProps<'button'>) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-testid="ui-button"
    >
      {children}
    </button>
  ),
}));

vi.mock('@/ui/atoms/input', () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    disabled,
    className,
  }: React.ComponentProps<'input'>) => (
    <input
      data-testid="ui-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  ),
}));

vi.mock('@/ui/atoms/card', () => ({
  Card: ({ children, className }: React.ComponentProps<'div'>) => (
    <div data-testid="ui-card" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: React.ComponentProps<'div'>) => (
    <div data-testid="ui-card-header" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: React.ComponentProps<'div'>) => (
    <div data-testid="ui-card-content" className={className}>
      {children}
    </div>
  ),
  CardFooter: ({ children, className }: React.ComponentProps<'div'>) => (
    <div data-testid="ui-card-footer" className={className}>
      {children}
    </div>
  ),
}));

vi.mock('@/ui/atoms/empty-state', () => ({
  EmptyState: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children, className }: React.ComponentProps<'div'>) => (
    <div data-testid="scroll-area" className={className}>
      {children}
    </div>
  ),
}));

describe('HubCommunitySection', () => {
  interface MockItem {
    id: string;
    name: string;
  }

  const mockData: MockItem[] = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];

  const defaultProps = {
    data: mockData,
    loading: false,
    refreshing: false,
    error: null as string | null,
    onRefresh: vi.fn(),
    onRetry: vi.fn(),
    searchPlaceholder: 'Search items...',
    renderItem: (item: MockItem) => <div key={item.id}>{item.name}</div>,
    filterFn: (item: MockItem, query: string) =>
      item.name.toLowerCase().includes(query.toLowerCase()),
    emptyIcon: Settings,
    emptyTitle: 'No Items',
    emptyDescription: 'There are no items to display',
    noResultsText: 'No matching items found',
  };

  it('renders loading skeletons when loading and no data', () => {
    render(<HubCommunitySection {...defaultProps} loading={true} data={[]} />);

    expect(screen.getAllByTestId('ui-card')).toHaveLength(6);
    expect(screen.getByTestId('ui-input')).toBeDisabled();
    expect(screen.getByText('Refresh')).toBeDisabled();
  });

  it('renders error state', () => {
    const errorMsg = 'Failed to fetch';
    render(<HubCommunitySection {...defaultProps} error={errorMsg} />);

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(
      <HubCommunitySection {...defaultProps} error="Error" onRetry={onRetry} />
    );

    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders empty state when no data and not loading', () => {
    render(<HubCommunitySection {...defaultProps} data={[]} />);

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Items')).toBeInTheDocument();
  });

  it('renders data items', () => {
    render(<HubCommunitySection {...defaultProps} />);

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('filters data based on search query', () => {
    render(<HubCommunitySection {...defaultProps} />);

    const input = screen.getByTestId('ui-input');
    fireEvent.change(input, { target: { value: 'Item 1' } });

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('shows no results message when filter matches nothing', () => {
    render(<HubCommunitySection {...defaultProps} />);

    const input = screen.getByTestId('ui-input');
    fireEvent.change(input, { target: { value: 'Non-existent' } });

    expect(screen.getByText('No matching items found')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<HubCommunitySection {...defaultProps} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByText('Refresh'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('disables refresh button while refreshing', () => {
    render(<HubCommunitySection {...defaultProps} refreshing={true} />);

    expect(screen.getByText('Refresh').closest('button')).toBeDisabled();
  });
});
