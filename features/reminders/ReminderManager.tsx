import * as React from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { scheduleDailyNotification, cancelNotifications } from '../../utils/notificationService';

/**
 * A non-rendering component that manages the lifecycle of daily study reminders.
 * It listens to changes in user settings and schedules or cancels notifications accordingly.
 */
const ReminderManager: React.FC = () => {
    // This hook will re-run the effect whenever reminderSettings changes in the store.
    const reminderSettings = useUserStore(state => state.settings.reminderSettings);

    React.useEffect(() => {
        const settings = reminderSettings || { enabled: false, time: '19:00' };

        if (settings.enabled && settings.time) {
            scheduleDailyNotification(
                settings.time,
                "Time to Study!",
                "Your Vmind vocabulary is waiting for you. Let's build your streak!"
            );
        } else {
            cancelNotifications();
        }

        // Cleanup function to cancel notifications when the component unmounts
        return () => {
            cancelNotifications();
        };
    }, [reminderSettings]);

    return null; // This component does not render any UI
};

export default ReminderManager;