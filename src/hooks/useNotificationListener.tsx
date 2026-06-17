import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { removeNotification } from '@/features/notifications/state/notificationSlice';
import {
  Network,
  Database,
  Terminal,
  Code,
  Archive,
  Plug,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

export function useNotificationListener() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Network':
      case 'Http':
        return <Network className="size-4" />;
      case 'Database':
        return <Database className="size-4" />;
      case 'Python':
      case 'Node':
      case 'Runtime':
        return <Terminal className="size-4" />;
      case 'Code':
      case 'Serialization':
        return <Code className="size-4" />;
      case 'Zip':
      case 'IO':
        return <Archive className="size-4" />;
      case 'MCP':
        return <Plug className="size-4" />;
      case 'Prompt':
      case 'LLM':
        return <MessageSquare className="size-4" />;
      default:
        return <AlertCircle className="size-4" />;
    }
  };

  useEffect(() => {
    notifications.forEach((notification) => {
      const { id, type, title, description, duration, category } = notification;

      // Skip if already shown
      if (shownNotificationsRef.current.has(id)) {
        return;
      }

      // Mark as shown
      shownNotificationsRef.current.add(id);

      // Flag to ensure cleanup only runs once
      let cleanupCalled = false;

      // Cleanup function to remove notification
      const cleanup = () => {
        if (cleanupCalled) return;
        cleanupCalled = true;

        shownNotificationsRef.current.delete(id);
        dispatch(removeNotification(id));
      };

      // Common toast options
      const commonOptions = {
        id, // Use notification ID as toast ID
        description,
        onDismiss: cleanup,
      };

      // Show toast based on type
      switch (type) {
        case 'success':
          toast.success(title, {
            ...commonOptions,
            duration: duration || 4000,
          });
          break;
        case 'error':
          toast.error(title, {
            ...commonOptions,
            duration: duration || 5000,
            icon: category ? getCategoryIcon(category) : undefined,
          });
          break;
        case 'warning':
          toast.warning(title, {
            ...commonOptions,
            duration: duration || 4000,
          });
          break;
        case 'info':
        default:
          toast.info(title, {
            ...commonOptions,
            duration: duration || 4000,
          });
          break;
      }
    });
  }, [notifications, dispatch]);
}
