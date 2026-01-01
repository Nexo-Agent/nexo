import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useDialogOrigin } from './hook';
import { useModalStack } from '../modal-stack';

// Context to pass modal ID from Dialog to DialogContent
const DialogModalIdContext = React.createContext<string | null>(null);

function Dialog({
  open,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const { registerModal, unregisterModal } = useModalStack();
  // Use lazy initialization to ensure the ID is stable and Math.random is only called once
  const [modalId] = React.useState(
    () => `modal-${Math.random().toString(36).substring(2, 9)}`
  );

  // Track modal state
  React.useEffect(() => {
    if (open) {
      registerModal(modalId);
    } else {
      unregisterModal(modalId);
    }
    return () => {
      unregisterModal(modalId);
    };
  }, [open, registerModal, unregisterModal, modalId]);

  return (
    <DialogModalIdContext.Provider value={modalId}>
      <DialogPrimitive.Root
        data-slot="dialog"
        open={open}
        onOpenChange={onOpenChange}
        {...props}
      />
    </DialogModalIdContext.Provider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay> & {
  className?: string;
}) {
  const { isTopModal } = useModalStack();
  const modalId = React.useContext(DialogModalIdContext);
  const isTop = modalId ? isTopModal(modalId) : true;

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
        !isTop && 'pointer-events-none',
        className
      )}
      {...(props as any)}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const { t } = useTranslation('common');
  const { origin } = useDialogOrigin();
  const { isTopModal } = useModalStack();
  const modalId = React.useContext(DialogModalIdContext);
  const [transformOrigin, setTransformOrigin] =
    React.useState<string>('center center');
  const contentRef = React.useRef<HTMLDivElement>(null);
  const isTop = modalId ? isTopModal(modalId) : true;

  React.useEffect(() => {
    if (origin) {
      // Calculate transform origin relative to viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const originX = (origin.x / viewportWidth) * 100;
      const originY = (origin.y / viewportHeight) * 100;
      setTransformOrigin(`${originX}% ${originY}%`);
    } else {
      setTransformOrigin('center center');
    }
  }, [origin]);

  // Auto focus to top modal when it becomes top
  React.useEffect(() => {
    if (isTop && contentRef.current) {
      // Find first focusable element in the modal
      const focusableElements = contentRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      if (firstFocusable) {
        setTimeout(() => {
          firstFocusable.focus();
        }, 100);
      }
    }
  }, [isTop]);

  const handleEscapeKeyDown = React.useCallback(
    (e: KeyboardEvent) => {
      // Only close if this is the top modal
      // If modalId is not available, allow closing (fallback for modals without context)
      if (modalId && !isTopModal(modalId)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [modalId, isTopModal]
  );

  const handlePointerDownOutside = React.useCallback(
    (e: Event) => {
      // Prevent interaction with non-top modals
      if (modalId && !isTopModal(modalId)) {
        e.preventDefault();
      }
    },
    [modalId, isTopModal]
  );

  const handleInteractOutside = React.useCallback(
    (e: Event) => {
      // Prevent interaction with non-top modals
      if (modalId && !isTopModal(modalId)) {
        e.preventDefault();
      }
    },
    [modalId, isTopModal]
  );

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        className={cn(
          'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] max-h-[calc(100vh-4rem)] translate-x-[-50%] translate-y-[-50%] gap-0 rounded-lg border shadow-xl duration-300 outline-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 sm:max-w-lg overflow-hidden flex flex-col align-center',
          !isTop && 'pointer-events-none',
          className
        )}
        style={{
          transformOrigin: transformOrigin,
        }}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handleInteractOutside}
        {...(props as any)}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">{t('close')}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  showBorder = false,
  ...props
}: React.ComponentProps<'div'> & {
  showBorder?: boolean;
}) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex flex-col gap-2 text-center sm:text-left shrink-0 px-6 pt-6 pb-4',
        showBorder && 'border-b border-border',
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  showBorder = false,
  ...props
}: React.ComponentProps<'div'> & {
  showBorder?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end shrink-0 px-6 pt-4 pb-6',
        showBorder && 'border-t border-border',
        className
      )}
      {...props}
    />
  );
}

function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('flex-1 overflow-y-auto px-6 py-4 min-h-0', className)}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-lg leading-none font-semibold', className)}
      {...(props as any)}
    >
      {children}
    </DialogPrimitive.Title>
  );
}

function DialogDescription({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description> & {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...(props as any)}
    >
      {children}
    </DialogPrimitive.Description>
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
