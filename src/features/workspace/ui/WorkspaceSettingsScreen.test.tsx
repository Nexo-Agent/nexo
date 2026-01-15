import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceSettingsScreen } from './WorkspaceSettingsScreen';
import { navigateToChat } from '@/features/ui/state/uiSlice';
import * as useWorkspacesModule from '../hooks/useWorkspaces';
import * as notificationSlice from '@/features/notifications/state/notificationSlice';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockDispatch = vi.fn();
vi.mock('@/app/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) =>
    selector({
      chats: {
        chatsByWorkspaceId: {
          '1': [{ id: 'chat1', title: 'Chat 1' }],
        },
      },
    }),
}));

const mockHandleSaveWorkspaceSettings = vi.fn();
const mockHandleDeleteWorkspace = vi.fn();

vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaces: vi.fn(() => ({
    selectedWorkspace: { id: '1', name: 'Work 1' },
    workspaceSettings: { '1': { systemMessage: 'Hello' } },
    handleSaveWorkspaceSettings: mockHandleSaveWorkspaceSettings,
    handleDeleteWorkspace: mockHandleDeleteWorkspace,
  })),
}));

vi.mock('@/features/llm', () => ({
  useGetLLMConnectionsQuery: () => ({ data: [] }),
}));

vi.mock('@/features/mcp', () => ({
  useGetMCPConnectionsQuery: () => ({ data: [] }),
}));

vi.mock('./WorkspaceSettingsForm', () => ({
  WorkspaceSettingsForm: ({
    onSave,
    onDeleteWorkspace,
    onClearAllChats,
    workspace,
  }: any) => (
    <div data-testid="workspace-settings-form">
      <button onClick={() => onSave({ name: 'Updated' })}>Save</button>
      <button onClick={() => onDeleteWorkspace(workspace.id)}>Delete</button>
      <button onClick={() => onClearAllChats(workspace.id)}>Clear Chats</button>
    </div>
  ),
}));

vi.mock('@/features/ui/state/uiSlice', () => ({
  navigateToChat: vi.fn(),
}));

vi.mock('@/features/chat/state/chatsSlice', () => ({
  clearAllChats: vi.fn(() => ({ unwrap: () => Promise.resolve() })),
  createChat: vi.fn(() => ({
    unwrap: () => Promise.resolve({ id: 'new-chat-id' }),
  })),
  setSelectedChat: vi.fn(),
}));

vi.mock('@/features/chat/state/messages', () => ({
  clearMessages: vi.fn(),
  clearStreamingByChatId: vi.fn(),
  stopStreaming: vi.fn(),
}));

vi.mock('@/features/notifications/state/notificationSlice', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

describe('WorkspaceSettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockImplementation((action) => {
      if (typeof action === 'function')
        return action(vi.fn(), vi.fn(), undefined);
      return action;
    });
  });

  it('renders "No workspace selected" if no workspace matches', () => {
    vi.mocked(useWorkspacesModule.useWorkspaces).mockReturnValueOnce({
      selectedWorkspace: null,
      workspaceSettings: {},
      handleSaveWorkspaceSettings: vi.fn(),
      handleDeleteWorkspace: vi.fn(),
    } as any);

    render(<WorkspaceSettingsScreen />);
    expect(screen.getByText('common:noWorkspaceSelected')).toBeInTheDocument();
  });

  it('renders WorkspaceSettingsForm when workspace is selected', () => {
    render(<WorkspaceSettingsScreen />);
    expect(screen.getByTestId('workspace-settings-form')).toBeInTheDocument();
  });

  it('calls navigateToChat when ESC is pressed', () => {
    render(<WorkspaceSettingsScreen />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockDispatch).toHaveBeenCalledWith(navigateToChat());
  });

  it('handles save settings', async () => {
    mockHandleSaveWorkspaceSettings.mockResolvedValueOnce(undefined);
    render(<WorkspaceSettingsScreen />);

    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    await vi.waitFor(() => {
      expect(mockHandleSaveWorkspaceSettings).toHaveBeenCalledWith({
        name: 'Updated',
      });
      expect(mockDispatch).toHaveBeenCalledWith(navigateToChat());
    });
  });

  it('handles delete workspace', async () => {
    mockHandleDeleteWorkspace.mockResolvedValueOnce(undefined);
    render(<WorkspaceSettingsScreen />);

    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);

    await vi.waitFor(() => {
      expect(mockHandleDeleteWorkspace).toHaveBeenCalledWith('1');
      expect(mockDispatch).toHaveBeenCalledWith(navigateToChat());
    });
  });

  it('handles clear all chats', async () => {
    render(<WorkspaceSettingsScreen />);

    const clearBtn = screen.getByText('Clear Chats');
    fireEvent.click(clearBtn);

    await vi.waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
      // Should show success notification
      expect(notificationSlice.showSuccess).toHaveBeenCalled();
    });
  });
});
