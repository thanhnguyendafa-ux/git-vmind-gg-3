import { create } from 'zustand';
import { VmindNotification, Screen, NotificationType } from '../types';

interface NotificationState {
  notifications: VmindNotification[];
  addNotification: (notification: Omit<VmindNotification, 'createdAt' | 'isRead'>) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (notificationId: string) => void;
  unreadCount: number;
}

export const useNotificationStore = create<NotificationState>()(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      
      addNotification: (notification) => {
        const { notifications } = get();
        // Prevent duplicate reminders for the same thing on the same day
        if (notifications.some(n => n.id === notification.id)) {
            return;
        }
        
        const newNotification: VmindNotification = {
          ...notification,
          createdAt: Date.now(),
          isRead: false,
        };

        set(state => {
            const updatedNotifications = [newNotification, ...state.notifications];
            const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
            return { notifications: updatedNotifications, unreadCount: newUnreadCount };
        });
      },

      markAsRead: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
          );
          const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
          return { notifications: updatedNotifications, unreadCount: newUnreadCount };
        });
      },

      markAllAsRead: () => {
        set(state => ({
          notifications: state.notifications.map(n => ({ ...n, isRead: true })),
          unreadCount: 0,
        }));
      },

      dismissNotification: (notificationId) => {
        set(state => {
          const updatedNotifications = state.notifications.filter(n => n.id !== notificationId);
          const newUnreadCount = updatedNotifications.filter(n => !n.isRead).length;
          return { notifications: updatedNotifications, unreadCount: newUnreadCount };
        });
      },
    })
);