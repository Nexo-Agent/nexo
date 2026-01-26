import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PromptManagement } from './PromptManagement';
import { invokeCommand, TauriCommands } from '@/lib/tauri';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  FileText: () => <div data-testid="file-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

vi.mock('@/ui/molecules/ConfirmDialog', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
    title,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    title: string;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <button onClick={onConfirm}>delete</button>
        <button onClick={() => onOpenChange(false)}>cancel</button>
      </div>
    ) : null,
}));

vi.mock('@/lib/tauri', () => ({
  invokeCommand: vi.fn(),
  TauriCommands: {
    GET_PROMPTS: 'get_prompts',
    CREATE_PROMPT: 'create_prompt',
    UPDATE_PROMPT: 'update_prompt',
    DELETE_PROMPT: 'delete_prompt',
  },
}));

vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => vi.fn(),
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

vi.mock('@/features/notifications/state/notificationSlice', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

interface MockComponentProps {
  children?: React.ReactNode;
}

// Mock atoms
vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogHeader: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogTitle: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogBody: ({ children }: MockComponentProps) => <div>{children}</div>,
  DialogFooter: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: MockComponentProps) => <div>{children}</div>,
}));

vi.mock('@/ui/atoms/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/ui/atoms/button/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  ),
}));

vi.mock('@/ui/atoms/input', () => ({
  Input: ({
    value,
    onChange,
    id,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
  }) => <input id={id} value={value} onChange={onChange} />,
}));

vi.mock('@/ui/atoms/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    id,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    id?: string;
  }) => <textarea id={id} value={value} onChange={onChange} />,
}));

vi.mock('@/ui/atoms/label', () => ({
  Label: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: number;
  updated_at: number;
}

const mockPrompts: Prompt[] = [
  {
    id: '1',
    name: 'Prompt 1',
    content: 'Content 1',
    created_at: Date.now(),
    updated_at: Date.now(),
  },
];

import { Mock } from 'vitest';

describe('PromptManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (invokeCommand as Mock).mockImplementation((command: string) => {
      if (command === TauriCommands.GET_PROMPTS) {
        return Promise.resolve(mockPrompts);
      }
      return Promise.resolve();
    });
  });

  it('renders prompts list', async () => {
    render(<PromptManagement />);

    await waitFor(() => {
      expect(screen.getByText('Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Content 1')).toBeInTheDocument();
    });
  });

  it('shows empty state when no prompts', async () => {
    (invokeCommand as Mock).mockImplementation((command: string) => {
      if (command === TauriCommands.GET_PROMPTS) {
        return Promise.resolve([]);
      }
      return Promise.resolve();
    });

    render(<PromptManagement />);

    await waitFor(() => {
      expect(screen.getByText('noPrompts')).toBeInTheDocument();
    });
  });

  it('opens add prompt dialog', async () => {
    render(<PromptManagement />);

    const addButton = await screen.findByText('addPrompt');
    fireEvent.click(addButton);

    expect(screen.getByText('addNewPrompt')).toBeInTheDocument();
  });

  it('handles adding a new prompt', async () => {
    render(<PromptManagement />);

    const addButton = await screen.findByText('addPrompt');
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('promptName');
    const contentInput = screen.getByLabelText('promptContent');
    const saveButton = screen.getByText('add');

    fireEvent.change(nameInput, { target: { value: 'New Prompt' } });
    fireEvent.change(contentInput, { target: { value: 'New Content' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(invokeCommand).toHaveBeenCalledWith(
        TauriCommands.CREATE_PROMPT,
        expect.any(Object)
      );
    });
  });

  it('handles deleting a prompt', async () => {
    render(<PromptManagement />);

    const promptCard = await screen.findByText('Prompt 1');
    fireEvent.click(promptCard);

    // Click delete in the first dialog
    const deleteButtonInDialog = screen.getByText('delete');
    fireEvent.click(deleteButtonInDialog);

    // Wait for the confirmation dialog to appear and click its delete button
    await waitFor(() => {
      const deleteButtons = screen.getAllByText('delete');
      // In our mock, setDialogOpen(false) and then setDeleteDialogOpen(true)
      // might mean both could be in the DOM or only the new one.
      // Let's just pick the last one that exists.
      const confirmButton = deleteButtons[deleteButtons.length - 1];
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(invokeCommand).toHaveBeenCalledWith(TauriCommands.DELETE_PROMPT, {
        id: '1',
      });
    });
  });
});
