import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/app/hooks';
import { showSuccess } from '@/features/notifications/state/notificationSlice';
import { handleCommandError } from '@/lib/tauri';
import type {
  AddonConfig,
  PythonRuntimeStatus,
  NodeRuntimeStatus,
} from '../types';
import { logger } from '@/lib/logger';

export function useAddons() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();
  const [addonConfig, setAddonConfig] = useState<AddonConfig | null>(null);
  const [pythonRuntimes, setPythonRuntimes] = useState<PythonRuntimeStatus[]>(
    []
  );
  const [nodeRuntimes, setNodeRuntimes] = useState<NodeRuntimeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track installing state by version (string) or null if not installing
  const [installingPython, setInstallingPython] = useState<string | null>(null);
  const [installingNode, setInstallingNode] = useState<string | null>(null);

  const loadAddonConfig = useCallback(async () => {
    try {
      const config = await invoke<AddonConfig>('get_addon_config');
      setAddonConfig(config);
    } catch (error) {
      logger.error('Failed to load addon config:', error);
    }
  }, []);

  const loadPythonStatus = useCallback(async () => {
    try {
      const status = await invoke<PythonRuntimeStatus[]>(
        'get_python_runtimes_status'
      );
      setPythonRuntimes(status);
    } catch (error) {
      handleCommandError(dispatch, error);
    }
  }, [dispatch]);

  const loadNodeStatus = useCallback(async () => {
    try {
      const status = await invoke<NodeRuntimeStatus[]>(
        'get_node_runtimes_status'
      );
      setNodeRuntimes(status);
    } catch (error) {
      handleCommandError(dispatch, error);
    }
  }, [dispatch]);

  const installPython = async (version: string) => {
    setInstallingPython(version);
    try {
      await invoke('install_python_runtime', { version });
      dispatch(showSuccess(t('pythonInstalled', { version })));
      await loadPythonStatus();
    } catch (error) {
      handleCommandError(dispatch, error);
    } finally {
      setInstallingPython(null);
    }
  };

  const uninstallPython = async (version: string) => {
    try {
      await invoke('uninstall_python_runtime', { version });
      dispatch(showSuccess(t('pythonUninstalled', { version })));
      await loadPythonStatus();
    } catch (error) {
      handleCommandError(dispatch, error);
    }
  };

  const installNode = async (version: string) => {
    setInstallingNode(version);
    try {
      await invoke('install_node_runtime', { version });
      dispatch(showSuccess(t('nodeInstalled', { version })));
      await loadNodeStatus();
    } catch (error) {
      handleCommandError(dispatch, error);
    } finally {
      setInstallingNode(null);
    }
  };

  const uninstallNode = async (version: string) => {
    try {
      await invoke('uninstall_node_runtime', { version });
      dispatch(showSuccess(t('nodeUninstalled', { version })));
      await loadNodeStatus();
    } catch (error) {
      handleCommandError(dispatch, error);
    }
  };

  const installPythonPackages = async (packages: string[]) => {
    try {
      await invoke('install_python_packages', {
        packages,
        version: null, // Use default/latest installed Python runtime
      });
      dispatch(
        showSuccess(
          t('pythonPackagesInstalled', {
            packages: packages.join(', '),
          })
        )
      );
    } catch (error) {
      handleCommandError(dispatch, error);
      throw error; // Re-throw to let caller handle it
    }
  };

  // Initial load and focus re-fetch
  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([
        loadAddonConfig(),
        loadPythonStatus(),
        loadNodeStatus(),
      ]);
      setIsLoading(false);
    };

    loadAll();

    const handleFocus = () => {
      loadPythonStatus();
      loadNodeStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadAddonConfig, loadPythonStatus, loadNodeStatus]);

  return {
    addonConfig,
    pythonRuntimes,
    nodeRuntimes,
    isLoading,
    installingPython,
    installingNode,
    actions: {
      loadAddonConfig,
      loadPythonStatus,
      loadNodeStatus,
      installPython,
      uninstallPython,
      installNode,
      uninstallNode,
      installPythonPackages,
    },
  };
}
