import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddWorkspaceDialog } from './AddWorkspaceDialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Dialog to avoid Portal issues in tests
vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogBody: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

describe('AddWorkspaceDialog', () => {
  const onAddWorkspace = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <AddWorkspaceDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddWorkspace={onAddWorkspace}
      />
    );

    expect(screen.getByText('addNewWorkspace')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('enterWorkspaceName')
    ).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <AddWorkspaceDialog
        open={false}
        onOpenChange={onOpenChange}
        onAddWorkspace={onAddWorkspace}
      />
    );

    expect(screen.queryByText('addNewWorkspace')).not.toBeInTheDocument();
  });

  it('calls onAddWorkspace when form is submitted', async () => {
    const user = userEvent.setup();
    render(
      <AddWorkspaceDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddWorkspace={onAddWorkspace}
      />
    );

    const input = screen.getByPlaceholderText('enterWorkspaceName');
    await user.type(input, 'New Workspace');

    const submitBtn = screen.getByText('add');
    await user.click(submitBtn);

    expect(onAddWorkspace).toHaveBeenCalledWith('New Workspace');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables submit button when input is empty', () => {
    render(
      <AddWorkspaceDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddWorkspace={onAddWorkspace}
      />
    );

    const submitBtn = screen.getByText('add');
    expect(submitBtn).toBeDisabled();
  });

  it('calls onOpenChange(false) when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AddWorkspaceDialog
        open={true}
        onOpenChange={onOpenChange}
        onAddWorkspace={onAddWorkspace}
      />
    );

    const cancelBtn = screen.getByText('cancel');
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
