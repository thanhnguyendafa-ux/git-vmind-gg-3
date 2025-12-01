import * as React from 'react';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useTableStore } from '../../stores/useTableStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { generateAnkiReminders } from '../../utils/notificationUtils';

/**
 * A non-rendering component that runs in the background to generate notifications.
 */
const NotificationGenerator: React.FC = () => {
    const { ankiProgresses } = useSessionDataStore();
    const { tables } = useTableStore();
    const { addNotification } = useNotificationStore();

    React.useEffect(() => {
        // Run on mount and whenever the underlying data changes.
        // The addNotification function is idempotent, so this is safe.
        if (ankiProgresses && tables) {
            generateAnkiReminders(ankiProgresses, tables, addNotification);
        }
    }, [ankiProgresses, tables, addNotification]);

    return null; // This component does not render any UI
};

export default NotificationGenerator;