import * as React from 'react';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useTableStore } from '../../stores/useTableStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useCounterStore } from '../../stores/useCounterStore';
import { generateAnkiReminders, generateInactivityWarnings } from '../../utils/notificationUtils';

/**
 * A non-rendering component that runs in the background to generate notifications.
 */
const NotificationGenerator: React.FC = () => {
    const { ankiProgresses } = useSessionDataStore();
    const { tables } = useTableStore();
    const { counters } = useCounterStore();
    const { addNotification } = useNotificationStore();

    React.useEffect(() => {
        // Run on mount and whenever the underlying data changes.
        // The addNotification function is idempotent based on ID, so this is safe.
        
        // 1. Check Anki Due Dates
        if (ankiProgresses && tables) {
            generateAnkiReminders(ankiProgresses, tables, addNotification);
        }

        // 2. Check Activity Pulse (Inactivity Warnings)
        if (counters) {
            generateInactivityWarnings(counters, addNotification);
        }
    }, [ankiProgresses, tables, counters, addNotification]);

    return null; // This component does not render any UI
};

export default NotificationGenerator;