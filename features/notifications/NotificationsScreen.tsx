import * as React from 'react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { VmindNotification, Screen } from '../../types';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';

const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return "Just now";
};


const NotificationItem: React.FC<{ notification: VmindNotification }> = ({ notification }) => {
    const { markAsRead, dismissNotification } = useNotificationStore();
    const { setCurrentScreen } = useUIStore();
    const { handleStartAnkiSession } = useSessionStore();

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (notification.action) {
            const { screen, payload } = notification.action;
            if (screen === Screen.AnkiSetup && payload?.progressId) {
                handleStartAnkiSession(payload.progressId);
            } else {
                setCurrentScreen(screen);
            }
        }
        markAsRead(notification.id);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        dismissNotification(notification.id);
    };

    return (
        <div 
            onClick={() => markAsRead(notification.id)}
            className={`p-4 flex items-start gap-4 transition-colors duration-200 group ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800/50'}`}
        >
            <Icon name={notification.icon} className="w-6 h-6 text-primary-500 mt-1 flex-shrink-0"/>
            <div className="flex-grow">
                <p className="font-semibold text-text-main dark:text-secondary-100">{notification.title}</p>
                <p className="text-sm text-text-subtle">{notification.message}</p>
                {notification.action && (
                    <Button size="sm" variant="secondary" onClick={handleAction} className="mt-2">
                        {notification.action.label}
                    </Button>
                )}
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-text-subtle">{timeAgo(notification.createdAt)}</span>
                <button onClick={handleDismiss} className="p-1 rounded-full text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name="x" className="w-4 h-4"/>
                </button>
            </div>
        </div>
    );
};

const NotificationsScreen: React.FC = () => {
    const { notifications, markAllAsRead } = useNotificationStore();
    const { setCurrentScreen } = useUIStore();

    const [newNotifications, earlierNotifications] = React.useMemo(() => {
        const newN: VmindNotification[] = [];
        const earlierN: VmindNotification[] = [];
        notifications.forEach(n => {
            if (!n.isRead) {
                newN.push(n);
            } else {
                earlierN.push(n);
            }
        });
        return [newN, earlierN];
    }, [notifications]);

    return (
        <div className="animate-fadeIn">
            <header className="flex justify-between items-center p-4">
                <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Notifications</h1>
                {newNotifications.length > 0 && (
                    <Button variant="ghost" onClick={markAllAsRead}>Mark all as read</Button>
                )}
            </header>

            <main>
                {notifications.length === 0 ? (
                    <div className="text-center py-24 text-text-subtle">
                        <Icon name="bell" className="w-16 h-16 mx-auto mb-4 text-secondary-300 dark:text-secondary-600"/>
                        <p className="font-semibold">All caught up!</p>
                        <p>You have no new notifications.</p>
                    </div>
                ) : (
                    <div className="border-t border-b border-secondary-200 dark:border-secondary-700">
                        {newNotifications.length > 0 && (
                            <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
                                <h2 className="px-4 py-2 text-sm font-bold text-text-subtle bg-secondary-50 dark:bg-secondary-800/50">New</h2>
                                {newNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                            </div>
                        )}
                        {earlierNotifications.length > 0 && (
                             <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
                                <h2 className="px-4 py-2 text-sm font-bold text-text-subtle bg-secondary-50 dark:bg-secondary-800/50">Earlier</h2>
                                {earlierNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default NotificationsScreen;