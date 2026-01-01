import { createContext } from 'react';

export interface DialogOrigin {
  x: number;
  y: number;
}

export const DialogOriginContext = createContext<{
  origin: DialogOrigin | null;
  setOrigin: (origin: DialogOrigin | null) => void;
}>({
  origin: null,
  setOrigin: () => {},
});
