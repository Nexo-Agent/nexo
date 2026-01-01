import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeNotification } from '@/store/slices/notificationSlice';

export function useNotificationListener() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector(
    (state) => state.notifications.notifications
  );
  const shownNotificationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    notifications.forEach((notification) => {
      const { id, type, title, description, duration } = notification;

      // Skip if already shown
      if (shownNotificationsRef.current.has(id)) {
        return;
      }

      // Mark as shown
      shownNotificationsRef.current.add(id);

      // Show toast based on type
      switch (type) {
        case 'success':
          toast.success(title, {
            description,
            duration: duration || 4000,
            onDismiss: () => {
              shownNotificationsRef.current.delete(id);
              dispatch(removeNotification(id));
            },
          });
          break;
        case 'error':
          toast.error(title, {
            description,
            duration: duration || 5000,
            onDismiss: () => {
              shownNotificationsRef.current.delete(id);
              dispatch(removeNotification(id));
            },
          });
          break;
        case 'warning':
          toast.warning(title, {
            description,
            duration: duration || 4000,
            onDismiss: () => {
              shownNotificationsRef.current.delete(id);
              dispatch(removeNotification(id));
            },
          });
          break;
        case 'info':
        default:
          toast.info(title, {
            description,
            duration: duration || 4000,
            onDismiss: () => {
              shownNotificationsRef.current.delete(id);
              dispatch(removeNotification(id));
            },
          });
          break;
      }

      // Remove notification from store immediately after showing
      dispatch(removeNotification(id));
    });
  }, [notifications, dispatch]);
}
