import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceSettingsForm } from './WorkspaceSettingsForm';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  CheckIcon: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader" />,
  XCircle: () => <div data-testid="x-circle" />,
  Trash2: () => <div data-testid="trash" />,
  Search: () => <div data-testid="search" />,
  Info: () => <div data-testid="info" />,
}));

// Mock UI components
vi.mock('@/ui/atoms/button/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/ui/atoms/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/ui/atoms/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select-mock" data-value={value}>
      {children}
      <button type="button" onClick={() => onValueChange('conn1::model1')}>
        Change Model
      </button>
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
  SelectGroup: ({ children }: any) => <div>{children}</div>,
  SelectLabel: ({ children }: any) => <div>{children}</div>,
  SelectSeparator: () => <hr />,
}));

vi.mock('@/ui/atoms/dialog/component', () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog-mock">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/ui/atoms/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/hooks/useSlashCommand', () => ({
  useSlashCommand: () => ({
    isActive: false,
    filteredPrompts: [],
    selectedIndex: 0,
    handleKeyDown: vi.fn(),
    handleSelect: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('@/ui/molecules/SlashCommandDropdown', () => ({
  SlashCommandDropdown: () => <div data-testid="slash-command-dropdown" />,
}));

vi.mock('@/ui/molecules/VariableInputDialog', () => ({
  VariableInputDialog: () => <div data-testid="variable-input-dialog" />,
}));

vi.mock('@/features/skill/ui/SkillSelector', () => ({
  SkillSelector: ({ selectedSkillIds, onChange }: any) => (
    <div data-testid="skill-selector">
      <div>Selected: {selectedSkillIds?.join(', ') || 'none'}</div>
      <button onClick={() => onChange(['skill1'])}>Select Skill</button>
    </div>
  ),
}));

describe('WorkspaceSettingsForm', () => {
  const mockWorkspace = { id: '1', name: 'Original Name' };
  const mockInitialSettings = {
    id: '1',
    name: 'Original Name',
    systemMessage: 'System Message',
    llmConnectionId: 'conn1',
    defaultModel: 'model1',
    mcpToolIds: { tool1: 'conn-mcp1' },
  };
  const mockLLMConnections = [
    {
      id: 'conn1',
      name: 'OpenAI',
      enabled: true,
      provider: 'openai',
      models: [{ id: 'model1', name: 'GPT-4' }],
    },
  ];
  const mockMCPConnections = [
    {
      id: 'conn-mcp1',
      name: 'FileSystem',
      status: 'connected',
      tools: [{ name: 'read_file', description: 'Read a file' }],
    },
  ];

  const onSave = vi.fn();
  const onDeleteWorkspace = vi.fn();
  const onClearAllChats = vi.fn();
  const onOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial values correctly', () => {
    render(
      <WorkspaceSettingsForm
        workspace={mockWorkspace}
        initialSettings={mockInitialSettings as any}
        llmConnections={mockLLMConnections as any}
        allMcpConnections={mockMCPConnections as any}
        hasChats={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDeleteWorkspace={onDeleteWorkspace}
        onClearAllChats={onClearAllChats}
      />
    );

    expect(screen.getByLabelText('workspaceName')).toHaveValue('Original Name');
    expect(screen.getByLabelText('systemMessage')).toHaveValue(
      'System Message'
    );
    expect(screen.getByText('FileSystem')).toBeInTheDocument();
  });

  it('updates state when name is changed', async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceSettingsForm
        workspace={mockWorkspace}
        initialSettings={mockInitialSettings as any}
        llmConnections={mockLLMConnections as any}
        allMcpConnections={mockMCPConnections as any}
        hasChats={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDeleteWorkspace={onDeleteWorkspace}
        onClearAllChats={onClearAllChats}
      />
    );

    const nameInput = screen.getByLabelText('workspaceName');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    expect(nameInput).toHaveValue('New Name');
  });

  it('calls onSave when form is submitted', async () => {
    const { container } = render(
      <WorkspaceSettingsForm
        workspace={mockWorkspace}
        initialSettings={mockInitialSettings as any}
        llmConnections={mockLLMConnections as any}
        allMcpConnections={mockMCPConnections as any}
        hasChats={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDeleteWorkspace={onDeleteWorkspace}
        onClearAllChats={onClearAllChats}
      />
    );

    // Directly click the submit button
    const saveBtn = container.querySelector('button[type="submit"]');
    if (!saveBtn) throw new Error('Save button not found');
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalled();
  });

  it('shows clear chats dialog when button is clicked', async () => {
    render(
      <WorkspaceSettingsForm
        workspace={mockWorkspace}
        initialSettings={mockInitialSettings as any}
        llmConnections={mockLLMConnections as any}
        allMcpConnections={mockMCPConnections as any}
        hasChats={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDeleteWorkspace={onDeleteWorkspace}
        onClearAllChats={onClearAllChats}
      />
    );

    const clearBtn = screen.getByText('clearAllChats', { selector: 'button' });
    fireEvent.click(clearBtn);

    expect(await screen.findByText('confirmClearAllChats')).toBeInTheDocument();
  });

  it('shows delete workspace dialog when button is clicked', async () => {
    render(
      <WorkspaceSettingsForm
        workspace={mockWorkspace}
        initialSettings={mockInitialSettings as any}
        llmConnections={mockLLMConnections as any}
        allMcpConnections={mockMCPConnections as any}
        hasChats={true}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDeleteWorkspace={onDeleteWorkspace}
        onClearAllChats={onClearAllChats}
      />
    );

    const deleteBtn = screen.getByText('deleteWorkspace', {
      selector: 'button',
    });
    fireEvent.click(deleteBtn);

    expect(
      await screen.findByText('confirmDeleteWorkspace')
    ).toBeInTheDocument();
  });
});
