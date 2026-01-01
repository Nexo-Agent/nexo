import { useContext } from 'react';
import { DialogOriginContext } from './context';

export function useDialogOrigin() {
  const context = useContext(DialogOriginContext);
  if (!context) {
    return {
      origin: null,
      setOrigin: () => {},
    };
  }
  return context;
}
