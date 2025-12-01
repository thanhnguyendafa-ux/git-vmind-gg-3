// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useNotificationStore } from '../stores/useNotificationStore';
import { VmindNotification, Screen, NotificationType } from '../types';

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;

describe('useNotificationStore', () => {

  beforeEach(() => {
    act(() => {
      useNotificationStore.setState({ notifications: [], unreadCount: 0 });
    });
  });

  it('should add a notification and update unread count', () => {
    const newNotif = {
      id: 'notif-1',
      type: NotificationType.Reminder,
      icon: 'bell',
      title: 'Test',
      message: 'This is a test'
    };
    
    act(() => {
      useNotificationStore.getState().addNotification(newNotif);
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].title).toBe('Test');
    expect(state.notifications[0].isRead).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('should not add a notification with a duplicate ID', () => {
    const notif = {
      id: 'notif-1',
      type: NotificationType.Reminder,
      icon: 'bell',
      title: 'Test',
      message: 'This is a test'
    };
    
    act(() => {
      useNotificationStore.getState().addNotification(notif);
      useNotificationStore.getState().addNotification(notif); // Try adding again
    });

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    expect(useNotificationStore.getState().unreadCount).toBe(1);
  });
  
  it('should mark a notification as read and decrease unread count', () => {
     act(() => {
      useNotificationStore.getState().addNotification({ id: 'notif-1', type: NotificationType.Reminder, icon: 'bell', title: 'Test 1', message: '' });
      useNotificationStore.getState().addNotification({ id: 'notif-2', type: NotificationType.Reminder, icon: 'bell', title: 'Test 2', message: '' });
    });
    
    expect(useNotificationStore.getState().unreadCount).toBe(2);
    
    act(() => {
      useNotificationStore.getState().markAsRead('notif-1');
    });
    
    const state = useNotificationStore.getState();
    expect(state.notifications.find(n => n.id === 'notif-1')?.isRead).toBe(true);
    expect(state.unreadCount).toBe(1);
  });
  
  it('should mark all notifications as read', () => {
    act(() => {
      useNotificationStore.getState().addNotification({ id: 'notif-1', type: NotificationType.Reminder, icon: 'bell', title: 'Test 1', message: '' });
      useNotificationStore.getState().addNotification({ id: 'notif-2', type: NotificationType.Reminder, icon: 'bell', title: 'Test 2', message: '' });
    });
    
    act(() => {
      useNotificationStore.getState().markAllAsRead();
    });

    const state = useNotificationStore.getState();
    expect(state.unreadCount).toBe(0);
    expect(state.notifications.every(n => n.isRead)).toBe(true);
  });
  
  it('should dismiss a notification', () => {
    act(() => {
      useNotificationStore.getState().addNotification({ id: 'notif-1', type: NotificationType.Reminder, icon: 'bell', title: 'Test 1', message: '' });
      useNotificationStore.getState().addNotification({ id: 'notif-2', type: NotificationType.Reminder, icon: 'bell', title: 'Test 2', message: '' });
    });
    
    act(() => {
      useNotificationStore.getState().dismissNotification('notif-1');
    });

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].id).toBe('notif-2');
    expect(state.unreadCount).toBe(1);
  });
});