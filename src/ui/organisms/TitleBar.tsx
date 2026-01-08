import { useState, useEffect, ReactNode } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TitleBarProps {
  leftContent?: ReactNode;
  rightContent?: ReactNode;
}

function detectPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mac')) {
    return 'macos';
  } else if (userAgent.includes('win')) {
    return 'windows';
  } else {
    return 'linux';
  }
}

/**
 * Custom title bar component for Tauri window without decorations
 * Supports macOS (traffic lights on left) and Windows/Linux (controls on right)
 * Can integrate with app content to save vertical space
 */
export function TitleBar({ leftContent, rightContent }: TitleBarProps = {}) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const platform = detectPlatform();

  useEffect(() => {
    // Get initial window states
    const appWindow = getCurrentWindow();
    appWindow.isMaximized().then(setIsMaximized);
    appWindow
      .isFullscreen()
      .then(setIsFullscreen)
      .catch(() => {
        // isFullscreen might not be available on all platforms
      });

    // Check window states on window resize
    // This handles cases where window is maximized/unmaximized by other means (e.g., double-click)
    const checkWindowState = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
        const fullscreen = await appWindow.isFullscreen();
        setIsFullscreen(fullscreen);
      } catch (_) {
        // Silently handle errors (e.g., window closed)
      }
    };

    // Use a debounced resize handler to avoid excessive checks
    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(checkWindowState, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  const handleMinimize = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.minimize();
    } catch (error) {
      console.error('Error minimizing window:', error);
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    try {
      const appWindow = getCurrentWindow();

      // On macOS, the green button should toggle fullscreen (like native behavior)
      // Option+Click should maximize instead
      if (isMacOS) {
        const isOptionPressed = e.altKey || e.metaKey;

        if (isOptionPressed) {
          // Option+Click: Maximize (not fullscreen)
          await appWindow.toggleMaximize();
          const maximized = await appWindow.isMaximized();
          setIsMaximized(maximized);
        } else {
          // Normal click: Toggle fullscreen (native macOS behavior)
          const currentFullscreen = await appWindow.isFullscreen();
          await appWindow.setFullscreen(!currentFullscreen);
          const fullscreen = await appWindow.isFullscreen();
          setIsFullscreen(fullscreen);
        }
      } else {
        // Windows/Linux: Toggle maximize
        await appWindow.toggleMaximize();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      }
    } catch (error) {
      console.error('Error toggling maximize/fullscreen:', error);
    }
  };

  const handleClose = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.close();
    } catch (error) {
      console.error('Error closing window:', error);
    }
  };

  const isMacOS = platform === 'macos';

  // Handle double-click on title bar to toggle fullscreen (Windows/Linux)
  // This avoids the gap issue when decorations are disabled
  // macOS doesn't use this behavior, so we only apply it to Windows/Linux
  const handleTitleBarDoubleClick = async (e: React.MouseEvent) => {
    // Skip on macOS
    if (isMacOS) return;

    // Only handle if clicking on the draggable area, not on buttons or their containers
    const target = e.target as HTMLElement;
    const isButton = target.closest('button') !== null;

    if (
      !isButton &&
      (e.target === e.currentTarget ||
        target.hasAttribute('data-tauri-drag-region'))
    ) {
      e.preventDefault();
      try {
        const appWindow = getCurrentWindow();
        // Use fullscreen instead of maximize to avoid gap when decorations are disabled
        const currentFullscreen = await appWindow.isFullscreen();
        await appWindow.setFullscreen(!currentFullscreen);
        const fullscreen = await appWindow.isFullscreen();
        setIsFullscreen(fullscreen);
      } catch (error) {
        console.error('Error toggling fullscreen on double-click:', error);
        // Fallback to maximize if fullscreen fails
        const appWindow = getCurrentWindow();
        await appWindow.toggleMaximize();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      }
    }
  };

  return (
    <div
      data-tauri-drag-region
      onDoubleClick={handleTitleBarDoubleClick}
      className={cn(
        'flex h-9 items-center justify-between border-b border-border bg-background',
        'select-none'
      )}
    >
      {/* Left side - macOS traffic lights or app content */}
      <div className="flex items-center gap-2 px-3">
        {isMacOS ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-window-close transition-colors hover:bg-window-close-hover"
              aria-label="Close"
            >
              <span className="opacity-0 group-hover:opacity-100">
                <X className="h-2 w-2 text-window-close-icon" />
              </span>
            </button>
            <button
              onClick={handleMinimize}
              onMouseDown={(e) => e.stopPropagation()}
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-window-minimize transition-colors hover:bg-window-minimize-hover"
              aria-label="Minimize"
            >
              <span className="opacity-0 group-hover:opacity-100">
                <Minus className="h-2 w-2 text-window-minimize-icon" />
              </span>
            </button>
            <button
              onClick={handleMaximize}
              onMouseDown={(e) => e.stopPropagation()}
              className="group flex h-3 w-3 items-center justify-center rounded-full bg-window-maximize transition-colors hover:bg-window-maximize-hover"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              title={
                isFullscreen
                  ? 'Exit Fullscreen (Option+Click to Maximize)'
                  : 'Enter Fullscreen (Option+Click to Maximize)'
              }
            >
              <span className="opacity-0 group-hover:opacity-100">
                {isFullscreen ? (
                  <Maximize2 className="h-2 w-2 text-window-maximize-icon" />
                ) : (
                  <Square className="h-2 w-2 text-window-maximize-icon" />
                )}
              </span>
            </button>
          </div>
        ) : null}
        {/* App content on left (Windows/Linux) or after traffic lights (macOS) */}
        {leftContent && (
          <div onMouseDown={(e) => e.stopPropagation()} className="flex">
            {leftContent}
          </div>
        )}
      </div>

      {/* Center - draggable area */}
      <div
        data-tauri-drag-region
        className={cn('flex-1', isMacOS && !leftContent && 'text-center')}
      >
        {isMacOS && !leftContent && (
          <span className="text-xs font-medium text-muted-foreground">
            Nexo
          </span>
        )}
      </div>

      {/* Right side - App content + window controls */}
      <div className="flex items-center">
        {/* App content on right */}
        {rightContent && (
          <div
            className="flex items-center gap-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {rightContent}
          </div>
        )}

        {/* Window controls */}
        {!isMacOS ? (
          <div className="flex items-center">
            <button
              onClick={handleMinimize}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-9 w-12 items-center justify-center transition-colors hover:bg-accent"
              aria-label="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => handleMaximize(e)}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-9 w-12 items-center justify-center transition-colors hover:bg-accent"
              aria-label={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Maximize2 className="h-3.5 w-3.5" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleClose}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-9 w-12 items-center justify-center transition-colors hover:bg-destructive hover:text-destructive-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : rightContent ? null : (
          <div className="w-12" />
        )}
      </div>
    </div>
  );
}
