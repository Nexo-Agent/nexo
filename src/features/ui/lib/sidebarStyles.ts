import { cn } from '@/lib/utils';

/** Vertical stack for sidebar nav / list items. */
export const SIDEBAR_LIST = 'flex flex-col gap-1.5';

/** Horizontal padding for sidebar column rows (matches title bar). */
export const SIDEBAR_X = 'px-3';

/** Gap between macOS traffic-light slot and sidebar content. */
export const SIDEBAR_COLUMN_GAP = 'gap-2';

/** Width reserved for macOS traffic lights (3×12px + 2×6px gaps). */
export const SIDEBAR_MACOS_LEADING = 'w-12';

/** Icon size aligned across sidebar entries. */
export const SIDEBAR_ICON = 'size-3.5 shrink-0';

/** Invisible slot so text aligns with icon-leading labels. */
export const SIDEBAR_TEXT_INSET = cn(
  SIDEBAR_ICON,
  'invisible pointer-events-none'
);

export function isMacOS() {
  return (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('mac')
  );
}

export function sidebarItemClass(isActive = false) {
  return cn(
    'flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-md py-1.5 text-sm leading-tight transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
    isActive
      ? 'bg-sidebar-accent font-medium text-sidebar-foreground'
      : 'text-sidebar-foreground/80'
  );
}

export function sidebarColumnRowClass(className?: string) {
  return cn(
    'flex min-w-0 items-center',
    SIDEBAR_X,
    SIDEBAR_COLUMN_GAP,
    className
  );
}

export function sidebarMacOSTrafficLightSlotClass() {
  return cn('flex shrink-0 items-center gap-1.5', SIDEBAR_MACOS_LEADING);
}
