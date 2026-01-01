import { useDialogOrigin } from '@/ui/atoms/dialog';

/**
 * Hook to handle dialog opening with origin tracking
 * Returns a click handler that tracks mouse position and opens dialog
 */
export function useDialogClick(onOpen: () => void) {
  const { setOrigin } = useDialogOrigin();

  const handleClick = (e: React.MouseEvent) => {
    // Track click position
    setOrigin({
      x: e.clientX,
      y: e.clientY,
    });

    // Open dialog
    onOpen();

    // Clear origin after animation completes
    setTimeout(() => {
      setOrigin(null);
    }, 300);
  };

  return handleClick;
}
