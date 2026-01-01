import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
}

const initialState: NotificationState = {
  notifications: [],
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (
      state,
      action: PayloadAction<Omit<Notification, 'id'>>
    ) => {
      const id = `notification-${Date.now()}-${Math.random()}`;
      state.notifications.push({
        ...action.payload,
        id,
      });
    },
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
  },
});

export const { addNotification, removeNotification, clearNotifications } =
  notificationSlice.actions;

// Helper action creators for different notification types
export const showSuccess = (
  title: string,
  description?: string,
  duration?: number
) => addNotification({ type: 'success', title, description, duration });

export const showError = (
  title: string,
  description?: string,
  duration?: number
) => addNotification({ type: 'error', title, description, duration });

export const showInfo = (
  title: string,
  description?: string,
  duration?: number
) => addNotification({ type: 'info', title, description, duration });

export const showWarning = (
  title: string,
  description?: string,
  duration?: number
) => addNotification({ type: 'warning', title, description, duration });

export default notificationSlice.reducer;
