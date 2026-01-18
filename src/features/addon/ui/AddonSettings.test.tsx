import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AddonSettings from './AddonSettings';
import { useAddons } from '../hooks/useAddons';
import type {
  AddonConfig,
  PythonRuntimeStatus,
  NodeRuntimeStatus,
} from '../types';

// Mock the useAddons hook
vi.mock('../hooks/useAddons');

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  CheckCircle2: () => <div data-testid="check-circle-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Package: () => <div data-testid="package-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  X: () => <div data-testid="x-icon" />,
  XIcon: () => <div data-testid="x-icon" />,
}));

const mockStore = configureStore({
  reducer: {
    // Add minimal reducers if needed
  },
});

const mockAddonConfig: AddonConfig = {
  addons: {
    python: {
      versions: ['3.12.0', '3.11.0'],
      uv: {
        version: '0.1.0',
      },
    },
    nodejs: {
      versions: ['20.0.0', '18.0.0'],
    },
  },
};

const mockPythonRuntimes: PythonRuntimeStatus[] = [
  {
    version: '3.12.0',
    installed: true,
    path: '/usr/local/bin/python3.12',
  },
  {
    version: '3.11.0',
    installed: false,
    path: null,
  },
];

const mockNodeRuntimes: NodeRuntimeStatus[] = [
  {
    version: '20.0.0',
    installed: true,
    path: '/usr/local/bin/node',
  },
  {
    version: '18.0.0',
    installed: false,
    path: null,
  },
];

const mockActions = {
  loadAddonConfig: vi.fn(),
  loadPythonStatus: vi.fn(),
  loadNodeStatus: vi.fn(),
  installPython: vi.fn(),
  uninstallPython: vi.fn(),
  installNode: vi.fn(),
  uninstallNode: vi.fn(),
};

describe('AddonSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <Provider store={mockStore}>
        <AddonSettings />
      </Provider>
    );
  };

  describe('Loading State', () => {
    it('should render skeleton loaders when loading', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: null,
        pythonRuntimes: [],
        nodeRuntimes: [],
        isLoading: true,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();

      // Should render 2 skeleton cards (Python and Node)
      const skeletons = container.querySelectorAll(
        '.flex.flex-col.rounded-xl.border.bg-card.p-6.shadow-sm'
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should match snapshot for loading state', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: null,
        pythonRuntimes: [],
        nodeRuntimes: [],
        isLoading: true,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Loaded State', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });
    });

    it('should render runtime environment title and description', () => {
      renderComponent();

      expect(screen.getByText('runtimeEnvironment')).toBeInTheDocument();
      expect(
        screen.getByText('addonManagementDescription')
      ).toBeInTheDocument();
    });

    it('should render Python runtime card with correct information', () => {
      renderComponent();

      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('v3.12.0')).toBeInTheDocument();
      expect(screen.getByText('(uv 0.1.0)')).toBeInTheDocument();
      expect(screen.getByText('pythonRuntimeDescription')).toBeInTheDocument();
    });

    it('should render Node.js runtime card with correct information', () => {
      renderComponent();

      expect(screen.getByText('Node.js')).toBeInTheDocument();
      expect(screen.getByText('v20.0.0')).toBeInTheDocument();
      expect(screen.getByText('nodeRuntimeDescription')).toBeInTheDocument();
    });

    it('should show installed status for Python', () => {
      renderComponent();

      const installedBadges = screen.getAllByText('installed');
      expect(installedBadges.length).toBeGreaterThan(0);
    });

    it('should display runtime path for installed runtimes', () => {
      renderComponent();

      // Python path should be displayed (with middle ellipsis if long)
      const pathElement = screen.getByTitle('/usr/local/bin/python3.12');
      expect(pathElement).toBeInTheDocument();
    });

    it('should match snapshot for loaded state', () => {
      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Python Runtime Actions', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });
    });

    it('should call installPython when reinstall button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find the reinstall button for Python (first reinstall button)
      const reinstallButtons = screen.getAllByText('reinstall');
      await user.click(reinstallButtons[0]);

      expect(mockActions.installPython).toHaveBeenCalledWith('3.12.0');
    });

    it('should call uninstallPython when uninstall button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find the uninstall button for Python
      const uninstallButtons = screen.getAllByText('uninstall');
      await user.click(uninstallButtons[0]);

      expect(mockActions.uninstallPython).toHaveBeenCalledWith('3.12.0');
    });

    it('should show installing state when Python is being installed', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: '3.12.0',
        installingNode: null,
        actions: mockActions,
      });

      renderComponent();

      expect(screen.getByText('installing')).toBeInTheDocument();
    });

    it('should disable buttons when Python is being installed', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: '3.12.0',
        installingNode: null,
        actions: mockActions,
      });

      renderComponent();

      const buttons = screen.getAllByRole('button');
      const disabledButtons = buttons.filter((btn) =>
        btn.hasAttribute('disabled')
      );
      expect(disabledButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Node Runtime Actions', () => {
    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });
    });

    it('should call installNode when reinstall button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find the reinstall button for Node (second reinstall button)
      const reinstallButtons = screen.getAllByText('reinstall');
      await user.click(reinstallButtons[1]);

      expect(mockActions.installNode).toHaveBeenCalledWith('20.0.0');
    });

    it('should call uninstallNode when uninstall button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      // Find the uninstall button for Node
      const uninstallButtons = screen.getAllByText('uninstall');
      await user.click(uninstallButtons[1]);

      expect(mockActions.uninstallNode).toHaveBeenCalledWith('20.0.0');
    });

    it('should show installing state when Node is being installed', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: '20.0.0',
        actions: mockActions,
      });

      renderComponent();

      expect(screen.getByText('installing')).toBeInTheDocument();
    });
  });

  describe('Not Installed State', () => {
    it('should show install button for not installed runtime', () => {
      const notInstalledPython: PythonRuntimeStatus[] = [
        {
          version: '3.12.0',
          installed: false,
          path: null,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: notInstalledPython,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      renderComponent();

      expect(screen.getByText('install')).toBeInTheDocument();
      expect(screen.getByText('notInstalled')).toBeInTheDocument();
    });

    it('should not show path for not installed runtime', () => {
      const notInstalledPython: PythonRuntimeStatus[] = [
        {
          version: '3.12.0',
          installed: false,
          path: null,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: notInstalledPython,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();

      // Should not have Info icon for path
      const infoIcons = container.querySelectorAll('[data-testid="info-icon"]');
      expect(infoIcons.length).toBe(1); // Only for Node.js which is installed
    });

    it('should match snapshot for not installed state', () => {
      const notInstalledPython: PythonRuntimeStatus[] = [
        {
          version: '3.12.0',
          installed: false,
          path: null,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: notInstalledPython,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Middle Ellipsis for Long Paths', () => {
    it('should truncate very long paths with middle ellipsis', () => {
      const longPath =
        '/very/long/path/to/python/installation/directory/that/exceeds/fifty/characters/python3.12';
      const pythonWithLongPath: PythonRuntimeStatus[] = [
        {
          version: '3.12.0',
          installed: true,
          path: longPath,
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: pythonWithLongPath,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      renderComponent();

      const pathElement = screen.getByTitle(longPath);
      expect(pathElement).toBeInTheDocument();
      // The displayed text should contain '...'
      expect(pathElement.textContent).toContain('...');
    });
  });

  describe('Empty State', () => {
    it('should handle empty runtimes gracefully', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: [],
        nodeRuntimes: [],
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      renderComponent();

      // Should still render the title and description
      expect(screen.getByText('runtimeEnvironment')).toBeInTheDocument();

      // But no runtime cards
      expect(screen.queryByText('Python')).not.toBeInTheDocument();
      expect(screen.queryByText('Node.js')).not.toBeInTheDocument();
    });

    it('should match snapshot for empty state', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: [],
        nodeRuntimes: [],
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();
      expect(container).toMatchSnapshot();
    });
  });

  describe('Responsive Grid Layout', () => {
    it('should render grid layout with correct classes', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useAddons as any).mockReturnValue({
        addonConfig: mockAddonConfig,
        pythonRuntimes: mockPythonRuntimes,
        nodeRuntimes: mockNodeRuntimes,
        isLoading: false,
        installingPython: null,
        installingNode: null,
        actions: mockActions,
      });

      const { container } = renderComponent();

      const gridElement = container.querySelector(
        '.grid.grid-cols-1.md\\:grid-cols-2.gap-6'
      );
      expect(gridElement).toBeInTheDocument();
    });
  });
});
