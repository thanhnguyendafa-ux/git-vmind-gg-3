import { AnkiCard, AnkiSessionData, VocabRow, AnkiConfig, AnkiState } from '../types';
import { calculateNextAnkiState, AnkiCalculationResult } from '../utils/srs';

export class AnkiService {
    /**
     * Calculates the next state of a card and returns the updated session data.
     * This moves logic out of the UI components for better testability.
     */
    public rateCard(
        session: AnkiSessionData,
        currentRow: VocabRow,
        quality: number
    ): { updatedSession: AnkiSessionData, nextCard: AnkiCard | null, isFinished: boolean } {
        const calculationResult = calculateNextAnkiState(currentRow.stats, quality, session.config);
        const { nextStats: newStats, nextState, dueInMinutes } = calculationResult;
        const now = Date.now();

        // Deep clone session to avoid direct mutations (Zustand friendly)
        const updatedSession: AnkiSessionData = JSON.parse(JSON.stringify(session));

        if (!updatedSession.currentCard) {
            return { updatedSession, nextCard: null, isFinished: true };
        }

        // 1. Add to history
        updatedSession.history.push({
            rowId: currentRow.id,
            quality,
            timestamp: now,
            newStats
        });

        // 2. Handle Learning/Relearning Re-queuing
        const updatedCard: AnkiCard = {
            ...updatedSession.currentCard,
            state: nextState,
            step: newStats.ankiStep || 0,
            interval: newStats.ankiInterval || 0,
            easeFactor: newStats.ankiEaseFactor || 2.5,
            due: newStats.ankiDueDate || (now + dueInMinutes * 60 * 1000),
            lapses: newStats.ankiLapses || 0
        };

        if (nextState === 'Learning' || nextState === 'Relearning') {
            updatedSession.learningQueue.push(updatedCard);
            updatedSession.learningQueue.sort((a, b) => a.due - b.due);
        }

        // 3. Determine next card and update queues
        let nextCard: AnkiCard | null = null;
        const currentTimestamp = Date.now();

        if (updatedSession.learningQueue.length > 0 && updatedSession.learningQueue[0].due <= currentTimestamp) {
            nextCard = updatedSession.learningQueue.shift()!;
        }
        else if (updatedSession.reviewQueue.length > 0) {
            nextCard = updatedSession.reviewQueue.shift()!;
        }
        else if (updatedSession.newQueue.length > 0) {
            nextCard = updatedSession.newQueue.shift()!;
        }
        else if (updatedSession.learningQueue.length > 0) {
            nextCard = updatedSession.learningQueue.shift()!;
        }

        updatedSession.currentCard = nextCard;

        return {
            updatedSession,
            nextCard,
            isFinished: !nextCard
        };
    }

    /**
     * Pure calculation wrapper for the SRS algorithm.
     */
    public calculateNextAnkiState(
        stats: VocabRow['stats'],
        quality: number,
        config: AnkiConfig
    ): AnkiCalculationResult {
        return calculateNextAnkiState(stats, quality, config);
    }
}

// Singleton instance
export const ankiService = new AnkiService();
