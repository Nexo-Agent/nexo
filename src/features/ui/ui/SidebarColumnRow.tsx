import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  sidebarColumnRowClass,
  sidebarMacOSTrafficLightSlotClass,
} from '@/features/ui/lib/sidebarStyles';

interface SidebarColumnRowProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** macOS traffic lights or other leading controls in the title bar. */
  leading?: ReactNode;
}

/**
 * Row layout for the sidebar column.
 * Title bar: pass `leading` with macOS traffic lights, then app controls.
 * Sidebar body: omit `leading` — content uses the same px-3 inset as the red close button.
 */
export function SidebarColumnRow({
  children,
  className,
  contentClassName,
  leading,
}: SidebarColumnRowProps) {
  return (
    <div className={sidebarColumnRowClass(className)}>
      {leading ? (
        <div className={sidebarMacOSTrafficLightSlotClass()}>{leading}</div>
      ) : null}
      <div className={cn('min-w-0 flex-1', contentClassName)}>{children}</div>
    </div>
  );
}
