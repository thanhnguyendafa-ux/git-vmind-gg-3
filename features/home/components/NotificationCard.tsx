
import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { useNotificationStore } from '../../../stores/useNotificationStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { VmindNotification, Screen } from '../../../types';

const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return "now";
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
            className={`p-3 rounded-lg flex items-start gap-3 transition-colors duration-200 group cursor-pointer ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800/50'}`}
        >
            <div className={`mt-0.5 ${!notification.isRead ? 'text-primary-500' : 'text-text-subtle'}`}>
                 <Icon name={notification.icon} className="w-5 h-5"/>
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                    <p className={`text-sm truncate ${!notification.isRead ? 'font-semibold text-text-main dark:text-secondary-100' : 'text-text-subtle'}`}>{notification.title}</p>
                    <span className="text-[10px] text-text-subtle whitespace-nowrap ml-2">{timeAgo(notification.createdAt)}</span>
                </div>
                <p className="text-xs text-text-subtle line-clamp-2 mt-0.5">{notification.message}</p>
                {notification.action && (
                    <Button size="sm" variant="ghost" onClick={handleAction} className="mt-1 h-6 px-2 text-xs -ml-2">
                        {notification.action.label}
                    </Button>
                )}
            </div>
            <button onClick={handleDismiss} className="text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity hover:text-error-500">
                <Icon name="x" className="w-3 h-3"/>
            </button>
        </div>
    );
};

export const NotificationCard: React.FC = () => {
    const { notifications, unreadCount, markAllAsRead } = useNotificationStore();
    const [isExpanded, setIsExpanded] = React.useState(false);

    const displayedNotifications = isExpanded ? notifications : notifications.slice(0, 3);

    if (notifications.length === 0) return null;

    return (
        <Card className="animate-fadeIn bg-surface dark:bg-secondary-800">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                    Updates
                    {unreadCount > 0 && (
                         <span className="flex h-5 w-5 items-center justify-center rounded-full bg-error-100 text-error-600 text-xs font-bold animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </CardTitle>
                {unreadCount > 0 && (
                    <button onClick={markAllAsRead} className="text-xs text-primary-600 hover:underline font-medium">
                        Mark all read
                    </button>
                )}
            </CardHeader>
            <CardContent className="p-2">
                <div className={`space-y-1 transition-all duration-300 ${isExpanded ? 'max-h-96 overflow-y-auto pr-1 custom-scrollbar' : ''}`}>
                    {displayedNotifications.map(n => (
                        <NotificationItem key={n.id} notification={n} />
                    ))}
                </div>
                 {notifications.length > 3 && (
                    <div className="mt-2 text-center border-t border-secondary-100 dark:border-secondary-700/50 pt-1">
                        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="w-full text-xs text-text-subtle h-8">
                            {isExpanded ? 'Show Less' : `Show ${notifications.length - 3} More`}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
