import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSelector } from './WorkspaceSelector';
import * as useWorkspacesModule from '../hooks/useWorkspaces';

// Mock dependencies
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/ui/atoms/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, className, ...props }: any) => (
    <button className={className} {...props} data-testid="dropdown-trigger">
      {children}
    </button>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div onClick={onClick} className={className} data-testid="dropdown-item">
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock('./AddWorkspaceDialog', () => ({
  AddWorkspaceDialog: ({ open, onOpenChange, onAddWorkspace }: any) =>
    open ? (
      <div data-testid="add-workspace-dialog">
        <button onClick={() => onAddWorkspace('New Work')}>Confirm Add</button>
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock useWorkspaces at the top level
vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaces: vi.fn(),
}));

describe('WorkspaceSelector', () => {
  const mockHandleWorkspaceChange = vi.fn();
  const mockHandleAddWorkspace = vi.fn();
  const mockWorkspaces = [
    { id: '1', name: 'Work 1' },
    { id: '2', name: 'Work 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspacesModule.useWorkspaces).mockReturnValue({
      workspaces: mockWorkspaces,
      selectedWorkspace: mockWorkspaces[0],
      handleWorkspaceChange: mockHandleWorkspaceChange,
      handleAddWorkspace: mockHandleAddWorkspace,
    } as any);
  });

  it('renders correctly with selected workspace', () => {
    const { container } = render(<WorkspaceSelector />);
    expect(container.textContent).toContain('Work 1');
  });

  it('shows list of workspaces when clicked', () => {
    render(<WorkspaceSelector />);

    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);

    expect(screen.getByText(/Work 2/i)).toBeInTheDocument();
  });

  it('calls handleWorkspaceChange when a workspace is selected', () => {
    render(<WorkspaceSelector />);

    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);

    const work2Item = screen.getByText(/Work 2/i);
    fireEvent.click(work2Item);

    expect(mockHandleWorkspaceChange).toHaveBeenCalledWith(mockWorkspaces[1]);
  });

  it('opens add workspace dialog when add clicked', () => {
    render(<WorkspaceSelector />);

    const trigger = screen.getByTestId('dropdown-trigger');
    fireEvent.click(trigger);

    const addBtn = screen.getByText(/addWorkspace/i);
    fireEvent.click(addBtn);

    expect(screen.getByTestId('add-workspace-dialog')).toBeInTheDocument();
  });

  it('returns null if no selected workspace', () => {
    vi.mocked(useWorkspacesModule.useWorkspaces).mockReturnValue({
      workspaces: [],
      selectedWorkspace: null,
      handleWorkspaceChange: vi.fn(),
      handleAddWorkspace: vi.fn(),
    } as any);

    const { container } = render(<WorkspaceSelector />);
    expect(container.firstChild).toBeNull();
  });
});
