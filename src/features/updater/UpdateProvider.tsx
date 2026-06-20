import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useUpdate, type UpdateStatus } from './lib/useUpdate';
import type { Update } from '@tauri-apps/plugin-updater';

interface UpdateContextValue {
  status: UpdateStatus;
  update: Update | null;
  error: string | null;
  downloadProgress: number;
  checkUpdate: (silent?: boolean) => Promise<void>;
  installUpdate: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextValue | null>(null);

export function UpdateProvider({ children }: { children: ReactNode }) {
  const {
    status,
    update,
    error,
    downloadProgress,
    checkUpdate,
    installUpdate,
  } = useUpdate();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!hasChecked) {
      checkUpdate(true).then(() => {
        setHasChecked(true);
      });
    }
  }, [checkUpdate, hasChecked]);

  const value = useMemo(
    () => ({
      status,
      update,
      error,
      downloadProgress,
      checkUpdate,
      installUpdate,
    }),
    [status, update, error, downloadProgress, checkUpdate, installUpdate]
  );

  return (
    <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>
  );
}

export function useAppUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useAppUpdate must be used within UpdateProvider');
  }
  return context;
}
