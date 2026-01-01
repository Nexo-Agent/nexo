import { createContext } from 'react';

export interface ModalStackContextValue {
  registerModal: (id: string) => void;
  unregisterModal: (id: string) => void;
  isTopModal: (id: string) => boolean;
}

export const ModalStackContext = createContext<ModalStackContextValue | null>(
  null
);
