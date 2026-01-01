import { ModalStackContext } from './contex';

import { useContext } from 'react';

export function useModalStack() {
  const context = useContext(ModalStackContext);
  if (!context) {
    return {
      registerModal: () => {},
      unregisterModal: () => {},
      isTopModal: () => true,
    };
  }
  return context;
}
