import { AnkiProgress, Table, VmindNotification, Screen, NotificationType } from '../types';

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