// This service handles browser notifications for reminders.

let timeoutId: number | null = null;

/**
 * Requests permission from the user to show notifications.
 * @returns A promise that resolves to the permission status ('granted', 'denied', or 'default').
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
        console.error("This browser does not support desktop notification");
        return 'denied';
    }
    return await Notification.requestPermission();
};

/**
 * Schedules a daily notification at a specific time.
 * @param time The time in "HH:MM" format.
 * @param title The title of the notification.
 * @param body The body text of the notification.
 */
export const scheduleDailyNotification = (time: string, title: string, body: string) => {
    // First, cancel any existing notification to avoid duplicates
    cancelNotifications();

    const [hours, minutes] = time.split(':').map(Number);
    
    const schedule = () => {
        const now = new Date();
        let notificationTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

        // If the time has already passed for today, schedule it for tomorrow
        if (notificationTime.getTime() < now.getTime()) {
            notificationTime.setDate(notificationTime.getDate() + 1);
        }

        const delay = notificationTime.getTime() - now.getTime();

        timeoutId = window.setTimeout(() => {
            if (Notification.permission === 'granted') {
                new Notification(title, { 
                    body,
                    icon: '/vite.svg', // Optional: Add an icon
                });
            }
            // Reschedule for the next day
            schedule();
        }, delay);
    };
    
    schedule();
};

/**
 * Cancels any pending scheduled notifications.
 */
export const cancelNotifications = () => {
    if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
    }
};