import { AnkiProgress, Table, VmindNotification, Screen, NotificationType, Counter } from '../types';

type AddNotificationFn = (notification: Omit<VmindNotification, 'createdAt' | 'isRead'>) => void;

/**
 * Calculates due/new cards for Anki decks and generates notifications for those needing review.
 * @param ankiProgresses All available Anki progress sets.
 * @param tables All available tables containing the vocab rows.
 * @param addNotification The function to call to add a new notification to the store.
 */
export function generateAnkiReminders(
    ankiProgresses: AnkiProgress[],
    tables: Table[],
    addNotification: AddNotificationFn
): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    const todayString = today.toISOString().split('T')[0];

    ankiProgresses.forEach(progress => {
        let dueCount = 0;
        let newCount = 0;

        const rows = tables.filter(t => progress.tableIds.includes(t.id)).flatMap(t => t.rows);

        rows.forEach(row => {
            const { ankiDueDate } = row.stats;
            if (ankiDueDate === undefined || ankiDueDate === null) {
                newCount++;
            } else if (ankiDueDate <= todayTimestamp) {
                dueCount++;
            }
        });

        const newLimit = progress.ankiConfig?.newCardsPerDay ?? 20;
        const reviewLimit = progress.ankiConfig?.maxReviewsPerDay ?? 200;

        const cardsToStudyToday = Math.min(newLimit, newCount) + Math.min(reviewLimit, dueCount);

        if (cardsToStudyToday > 0) {
            addNotification({
                id: `anki-due-${progress.id}-${todayString}`,
                type: NotificationType.Reminder,
                icon: 'stack-of-cards',
                title: `Anki Deck Due: ${progress.name}`,
                message: `You have ${dueCount} cards for review and ${newCount} new cards waiting.`,
                action: {
                    label: 'Start Review',
                    screen: Screen.AnkiSetup,
                    payload: { progressId: progress.id }
                }
            });
        }
    });
}

/**
 * Checks Activity Pulse counters for items that haven't been touched in a while.
 * @param counters List of activity counters from the store.
 * @param addNotification The function to call to add a new notification.
 */
export function generateInactivityWarnings(
    counters: Counter[],
    addNotification: AddNotificationFn
): void {
    const now = Date.now();
    const todayString = new Date().toISOString().split('T')[0];

    counters.forEach(counter => {
        if (!counter.isActive) return;

        // Calculate threshold in milliseconds (days * 24h * 60m * 60s * 1000ms)
        const thresholdMs = (counter.thresholdDays || 3) * 86400000;
        const timeSince = now - counter.lastInteraction;

        if (timeSince > thresholdMs) {
            const daysAgo = Math.floor(timeSince / 86400000);
            
            let screen: Screen = Screen.Home;
            // Map targetType to the most relevant landing screen
            switch (counter.targetType) {
                case 'table': screen = Screen.Tables; break;
                case 'anki': screen = Screen.AnkiSetup; break;
                case 'confidence': screen = Screen.Confidence; break;
                case 'note': screen = Screen.Reading; break;
                case 'dictation': screen = Screen.Dictation; break;
            }

            // ID includes todayString to ensure we only warn once per day per item
            addNotification({
                id: `inactivity-warning-${counter.id}-${todayString}`,
                type: NotificationType.System,
                icon: 'clock',
                title: `Dust Gathering on "${counter.name}"`,
                message: `You haven't interacted with this ${counter.targetType} in ${daysAgo} days. Keep the streak alive!`,
                action: {
                    label: 'View',
                    screen: screen
                }
            });
        }
    });
}