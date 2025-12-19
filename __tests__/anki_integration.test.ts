// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSessionStore } from '../stores/useSessionStore';
import { useTableStore } from '../stores/useTableStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';
import { useUserStore } from '../stores/useUserStore';
import { AnkiProgress, Table, VocabRow, AnkiConfig, FlashcardStatus } from '../types';

// Mock dependencies
const mockTable: Table = {
    id: 't1',
    name: 'Test Table',
    rows: [],
    relations: [{
        id: 'r1',
        name: 'Rel',
        questionColumnIds: ['c1'],
        answerColumnIds: ['c2']
    }],
    columns: [],
    creatorId: 'u1'
} as any;

const makeRow = (id: string, state: any, dueTimestamp: number): VocabRow => ({
    id,
    cols: {},
    stats: {
        ankiState: state,
        ankiDueDate: dueTimestamp,
        ankiStep: 0,
        ankiInterval: 0,
        ankiEaseFactor: 2.5,
        ankiRepetitions: 0,
        ankiLapses: 0,
        // Default Stats
        correct: 0,
        incorrect: 0,
        lastStudied: 0,
        flashcardStatus: FlashcardStatus.New,
        flashcardEncounters: 0,
        isFlashcardReviewed: false,
        lastPracticeDate: 0,
        scrambleEncounters: 0,
        scrambleRatings: {},
        theaterEncounters: 0
    },
});

describe('Group B: Anki Integration Tests (Store Logic)', () => {

    beforeEach(() => {
        vi.restoreAllMocks();

        useSessionStore.setState({ activeAnkiSession: null });
        useTableStore.setState({ tables: [mockTable] });

        vi.clearAllMocks();
    });

    const setupSession = (rows: VocabRow[], configOverride?: Partial<AnkiConfig>) => {
        const updatedTable = { ...mockTable, rows };
        useTableStore.setState({ tables: [updatedTable] });

        const progress: AnkiProgress = {
            id: 'p1',
            name: 'Anki Deck',
            tableIds: ['t1'],
            relationIds: ['r1'],
            ankiConfig: {
                newCardsPerDay: 20,
                learningSteps: [1, 10],
                graduatingInterval: 1,
                easyInterval: 4,
                maxReviewsPerDay: 200,
                easyBonus: 1.3,
                intervalModifier: 1.0,
                lapseSteps: [10],
                newIntervalPercent: 0,
                ...configOverride
            },
            createdAt: 0
        };
        useSessionDataStore.setState({ ankiProgresses: [progress] });
        return progress;
    };

    it('[TC-ANK-001] Session Initialization - New Card Only', async () => {
        const rows = [
            makeRow('new1', 'New', 0)
        ];

        setupSession(rows);
        await useSessionStore.getState().handleStartAnkiSession('p1');

        const session = useSessionStore.getState().activeAnkiSession;

        expect(session).toBeTruthy();
        if (!session) return;

        // 1 New Card total. 
        // Logic: selectedNew = newQueue.slice(0, Limit).
        // Priority: selectedNew.shift() -> currentCard.
        // Remaining newQueue (in session state) SHOULD BE 0.
        // currentCard should be 'new1'.

        expect(session.newQueue).toHaveLength(0);
        expect(session.currentCard?.rowId).toBe('new1');
    });

    it('[TC-ANK-003] Review Limitation', async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Ensure due date is decidedly in the past relative to system Date
        const past = today.getTime() - (10 * 86400000);

        const rows = Array.from({ length: 15 }, (_, i) => makeRow(`rev${i}`, 'Review', past));

        setupSession(rows, { maxReviewsPerDay: 10 });
        await useSessionStore.getState().handleStartAnkiSession('p1');

        const session = useSessionStore.getState().activeAnkiSession;
        expect(session).toBeTruthy();
        if (!session) return;

        // 15 Review Cards. Limit 10.
        // selectedReview has 10.
        // Cycle: selectedReview.shift() -> currentCard.
        // Remaining reviewQueue should be 9.
        expect(session.reviewQueue.length).toBe(9);
    });

});
