import { useState } from 'react';
import { DialogOriginContext, DialogOrigin } from './context';

export function DialogOriginProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [origin, setOrigin] = useState<DialogOrigin | null>(null);

  return (
    <DialogOriginContext.Provider value={{ origin, setOrigin }}>
      {children}
    </DialogOriginContext.Provider>
  );
}
