import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@/store/hooks';
import { showSuccess } from '@/store/slices/notificationSlice';
import { handleCommandError } from '@/lib/tauri';
import type {
  AddonConfig,
  PythonRuntimeStatus,
  NodeRuntimeStatus,
} from '../types';

export function useAddons() {
  const { t } = useTranslation('settings');
  const dispatch = useAppDispatch();

  const [addonConfig, setAddonConfig] = useState<AddonConfig | null>(null);
  const [pythonRuntimes, setPythonRuntimes] = useState<PythonRuntimeStatus[]>(
    []
  );
  const [nodeRuntimes, setNodeRuntimes] = useState<NodeRuntimeStatus[]>([]);

  // Track installing state by version (string) or null if not installing
  const [installingPython, setInstallingPython] = useState<string | null>(null);
  const [installingNode, setInstallingNode] = useState<string | null>(null);

  const loadAddonConfig = useCallback(async () => {
    try {
      const config = await invoke<AddonConfig>('get_addon_config');
      setAddonConfig(config);
    } catch (error) {
      console.error('Failed to load addon config:', error);
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

  // Initial load
  useEffect(() => {
    loadAddonConfig();
    loadPythonStatus();
    loadNodeStatus();
  }, [loadAddonConfig, loadPythonStatus, loadNodeStatus]);

  return {
    addonConfig,
    pythonRuntimes,
    nodeRuntimes,
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
    },
  };
}
