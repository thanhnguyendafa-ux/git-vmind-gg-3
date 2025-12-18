// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useTableStore } from '../stores/useTableStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';
import { useSessionStore } from '../stores/useSessionStore';
// FIX: Renamed FlashcardProgress to ConfidenceProgress.
import { Table, VocabRow, FlashcardStatus, ConfidenceProgress, AnkiProgress, AnkiConfig } from '../types';

// Mock test globals
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;


describe('Data Flow on New Word Addition', () => {

    const mockColumn = { id: 'col1', name: 'Word' };
    const row1: VocabRow = { id: 'row1_id', cols: { 'col1': 'word one' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }};
    const row2: VocabRow = { id: 'row2_id', cols: { 'col1': 'word two' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }};

    const mockTable: Table = {
        id: 'table1',
        name: 'Test Table',
        columns: [mockColumn],
        rows: [row1],
        relations: [{ id: 'rel1', name: 'Rel 1', questionColumnIds: ['col1'], answerColumnIds: ['col1'], tags: ['Anki'] }]
    };

    beforeEach(() => {
        act(() => {
            useTableStore.setState({ tables: [], folders: [] });
            useSessionDataStore.setState({ flashcardProgresses: [], studyProgresses: [], ankiProgresses: [] });
            useSessionStore.setState({ activeAnkiSession: null });
        });
    });

    it('should NOT automatically add a new word to an existing Flashcard Progress queue', async () => {
        // Arrange: Create a table with one word and a Flashcard Progress based on it
        act(() => {
            useTableStore.setState({ tables: [mockTable] });

            // FIX: Renamed FlashcardProgress to ConfidenceProgress.
            const initialProgress: ConfidenceProgress = {
                id: 'fp1',
                name: 'Test Flashcards',
                tableIds: ['table1'],
                relationIds: [],
                tags: [],
                createdAt: Date.now(),
                queue: [row1.id], // The static queue is created with only row1
                currentIndex: 0,
            };
            useSessionDataStore.getState().setConfidenceProgresses(() => [initialProgress]);
        });

        let progress = useSessionDataStore.getState().confidenceProgresses[0];
        expect(progress.queue).toEqual(['row1_id']);
        expect(progress.queue).toHaveLength(1);

        // Act: Add a new word to the table
        await act(async () => {
            await useTableStore.getState().upsertRow('table1', row2);
        });

        // Assert: The Flashcard Progress queue remains unchanged
        const updatedProgress = useSessionDataStore.getState().confidenceProgresses[0];
        const updatedTable = useTableStore.getState().tables[0];
        
        expect(updatedTable.rows).toHaveLength(2); // The table itself is updated
        expect(updatedProgress.queue).toHaveLength(1); // But the progress queue is not
        expect(updatedProgress.queue).toEqual(['row1_id']);
        expect(updatedProgress.queue).not.toContain('row2_id');
    });

    it('SHOULD make the new word available for a new Anki SRS session', async () => {
        // Arrange: Create a table, an Anki Progress pointing to it.
        // The table initially has one word.
        const ankiConfig: AnkiConfig = { newCardsPerDay: 5, maxReviewsPerDay: 10, learningSteps: "1", graduatingInterval: 1, easyInterval: 4, easyBonus: 1.3, intervalModifier: 1.0, lapseSteps: "10", newIntervalPercent: 0 };
        act(() => {
            useTableStore.setState({ tables: [mockTable] });

            const initialProgress: AnkiProgress = {
                id: 'ap1',
                name: 'Test Anki',
                tableIds: ['table1'],
                relationIds: ['rel1'],
                tags: [],
                ankiConfig: ankiConfig,
                createdAt: Date.now(),
            };
            useSessionDataStore.getState().setAnkiProgresses(() => [initialProgress]);
        });
        
        // Start a session, it should only find the one new card (row1)
        act(() => {
            useSessionStore.getState().handleStartAnkiSession('ap1');
        });

        let activeSession = useSessionStore.getState().activeAnkiSession;
        expect(activeSession?.newQueue).toHaveLength(0); // queue has 1 item, which is now currentCard
        expect(activeSession?.currentCard?.rowId).toBe('row1_id');

        // Act: Add a new word to the table while no session is active
        act(() => { useSessionStore.setState({ activeAnkiSession: null }) });
        await act(async () => {
            await useTableStore.getState().upsertRow('table1', row2);
        });

        // Assert: The new word is present in the table data. 
        const updatedTable = useTableStore.getState().tables[0];
        expect(updatedTable.rows).toHaveLength(2);
        expect(updatedTable.rows.map(r => r.id)).toContain('row2_id');
        
        // Now, when starting a new session, the logic should pick up the new word.
        act(() => {
            useSessionStore.getState().handleStartAnkiSession('ap1');
        });

        // The logic in useSessionStore reads directly from the updated table data.
        // It will find TWO new cards now (row1 and row2).
        activeSession = useSessionStore.getState().activeAnkiSession;
        // One card becomes the `currentCard`, the other remains in the `newQueue`.
        expect(activeSession?.newQueue).toHaveLength(1);
        const allCardsInSession = [activeSession?.currentCard?.rowId, ...activeSession!.newQueue.map(c => c.rowId)];
        expect(allCardsInSession).toContain('row1_id');
        expect(allCardsInSession).toContain('row2_id');
    });
});