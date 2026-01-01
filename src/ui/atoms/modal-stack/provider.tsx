import React, { useState, useCallback } from 'react';
import { ModalStackContext } from './contex';

export function ModalStackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [modalStack, setModalStack] = useState<string[]>([]);

  const registerModal = useCallback((id: string) => {
    setModalStack((prev) => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter((modalId) => modalId !== id);
      // Add to top of stack
      return [...filtered, id];
    });
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModalStack((prev) => prev.filter((modalId) => modalId !== id));
  }, []);

  const isTopModal = useCallback(
    (id: string) => {
      const stack = modalStack;
      return stack.length > 0 && stack[stack.length - 1] === id;
    },
    [modalStack]
  );

  return (
    <ModalStackContext.Provider
      value={{
        registerModal,
        unregisterModal,
        isTopModal,
      }}
    >
      {children}
    </ModalStackContext.Provider>
  );
}
