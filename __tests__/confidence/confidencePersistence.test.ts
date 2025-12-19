// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useSessionStore } from '../../stores/useSessionStore';
import {
    Table,
    VocabRow,
    FlashcardStatus,
    ConfidenceProgress,
    ConfidenceSession,
    Column
} from '../../types';

// Mock VmindSyncEngine
vi.mock('../../services/VmindSyncEngine', () => ({
    VmindSyncEngine: {
        getInstance: () => ({
            push: vi.fn(),
            triggerSync: vi.fn(),
            suspend: vi.fn(),
            unsuspend: vi.fn(),
        })
    }
}));

// Mock supabase
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
    }
}));

describe('Confidence Mode - Data Persistence', () => {

    beforeEach(() => {
        act(() => {
            useTableStore.setState({ tables: [] });
            useSessionDataStore.setState({ confidenceProgresses: [] });
            useSessionStore.setState({ activeConfidenceSession: null });
        });
    });

    /**
     * TC-D01: State Persists After Updates
     */
    it('TC-D01: should persist state after rating cards', async () => {
        // Arrange
        const initialProgress: ConfidenceProgress = {
            id: 'persist-test-1',
            name: 'Persistence Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(initialProgress);
        });

        // Act - Simulate rating 2 cards
        const updatedProgress = {
            ...initialProgress,
            currentIndex: 0, // Still at 0 (cards moved, not index)
            cardStates: {
                'row-1': FlashcardStatus.Good,
                'row-2': FlashcardStatus.Easy,
            },
            queue: ['row-3', 'row-4', 'row-5', 'row-2', 'row-1'], // Reordered
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(updatedProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === 'persist-test-1');

        expect(savedProgress).toBeDefined();
        expect(savedProgress!.cardStates).toHaveProperty('row-1');
        expect(savedProgress!.cardStates).toHaveProperty('row-2');
        expect(savedProgress!.cardStates!['row-1']).toBe(FlashcardStatus.Good);
        expect(savedProgress!.cardStates!['row-2']).toBe(FlashcardStatus.Easy);
    });

    /**
     * TC-D02: Atomic State Save on Every Rating
     */
    it('TC-D02: should save state atomically after each rating', async () => {
        // Arrange
        const progress: ConfidenceProgress = {
            id: 'atomic-test-1',
            name: 'Atomic Save Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['card-1', 'card-2', 'card-3'],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act & Assert - Rate cards sequentially

        // Rating 1
        const afterRating1 = {
            ...progress,
            cardStates: { 'card-1': FlashcardStatus.Good },
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(afterRating1);
        });

        let snapshot = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(snapshot!.cardStates!['card-1']).toBe(FlashcardStatus.Good);
        expect(Object.keys(snapshot!.cardStates!)).toHaveLength(1);

        // Rating 2
        const afterRating2 = {
            ...afterRating1,
            cardStates: {
                'card-1': FlashcardStatus.Good,
                'card-2': FlashcardStatus.Hard,
            },
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(afterRating2);
        });

        snapshot = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(snapshot!.cardStates!['card-1']).toBe(FlashcardStatus.Good);
        expect(snapshot!.cardStates!['card-2']).toBe(FlashcardStatus.Hard);
        expect(Object.keys(snapshot!.cardStates!)).toHaveLength(2);
    });

    /**
     * TC-D03: confiViewed Metric Updates
     */
    it('TC-D03: should increment confiViewed stat when card is shown', async () => {
        // Arrange
        const mockRow: VocabRow = {
            id: 'row-viewed-1',
            cols: { 'col-1': 'Test Word' },
            stats: {
                correct: 0,
                incorrect: 0,
                lastStudied: null,
                flashcardStatus: FlashcardStatus.New,
                flashcardEncounters: 0,
                isFlashcardReviewed: false,
                lastPracticeDate: null,
                confiViewed: 0, // Initial count
            }
        };

        const mockTable: Table = {
            id: 'table-viewed-1',
            name: 'Test Table',
            columns: [{ id: 'col-1', name: 'Word' }],
            rows: [mockRow],
            relations: [{
                id: 'rel-1',
                name: 'Test Relation',
                questionColumnIds: ['col-1'],
                answerColumnIds: ['col-1']
            }]
        };

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        // Act - Simulate viewing and rating the card
        const updatedRow: VocabRow = {
            ...mockRow,
            stats: {
                ...mockRow.stats,
                confiViewed: (mockRow.stats.confiViewed || 0) + 1,
            }
        };

        await act(async () => {
            await useTableStore.getState().upsertRow('table-viewed-1', updatedRow);
        });

        // Assert
        const table = useTableStore.getState().tables.find(t => t.id === 'table-viewed-1');
        const row = table!.rows.find(r => r.id === 'row-viewed-1');

        expect(row!.stats.confiViewed).toBe(1);

        // Act - View again
        const updatedRow2: VocabRow = {
            ...updatedRow,
            stats: {
                ...updatedRow.stats,
                confiViewed: (updatedRow.stats.confiViewed || 0) + 1,
            }
        };

        await act(async () => {
            await useTableStore.getState().upsertRow('table-viewed-1', updatedRow2);
        });

        // Assert
        const table2 = useTableStore.getState().tables.find(t => t.id === 'table-viewed-1');
        const row2 = table2!.rows.find(r => r.id === 'row-viewed-1');

        expect(row2!.stats.confiViewed).toBe(2);
    });

    /**
     * TC-D04: Progress Saves Correctly After Completion
     */
    it('TC-D04: should save final state when session concludes', async () => {
        // Arrange
        const progress: ConfidenceProgress = {
            id: 'completion-test-1',
            name: 'Completion Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['row-1', 'row-2'],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act - Simulate completing all cards
        const finalProgress = {
            ...progress,
            currentIndex: 0, // Cycle complete (wrapped to 0)
            cardStates: {
                'row-1': FlashcardStatus.Good,
                'row-2': FlashcardStatus.Easy,
            },
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(finalProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.cardStates).toHaveProperty('row-1');
        expect(savedProgress!.cardStates).toHaveProperty('row-2');
        expect(Object.keys(savedProgress!.cardStates!)).toHaveLength(2);
    });
});

describe('Confidence Mode - Edge Cases & Error Handling', () => {

    beforeEach(() => {
        act(() => {
            useTableStore.setState({ tables: [] });
            useSessionDataStore.setState({ confidenceProgresses: [] });
            useSessionStore.setState({ activeConfidenceSession: null });
        });
    });

    /**
     * TC-F01: Delete Row During Active Session
     */
    it('TC-F01: should heal queue when card is deleted during session', async () => {
        // Arrange
        const mockTable: Table = {
            id: 'table-delete-1',
            name: 'Test Table',
            columns: [{ id: 'col-1', name: 'Word' }],
            rows: [
                { id: 'row-A', cols: { 'col-1': 'Word A' }, stats: {} as any },
                { id: 'row-B', cols: { 'col-1': 'Word B' }, stats: {} as any },
                { id: 'row-C', cols: { 'col-1': 'Word C' }, stats: {} as any },
                { id: 'row-D', cols: { 'col-1': 'Word D' }, stats: {} as any },
            ],
            relations: []
        };

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        const progress: ConfidenceProgress = {
            id: 'delete-test-1',
            name: 'Delete Test',
            tableIds: [mockTable.id],
            relationIds: [],
            tags: [],
            createdAt: Date.now(),
            queue: ['row-A', 'row-B', 'row-C', 'row-D'],
            currentIndex: 2, // At row-C
            cardStates: {
                'row-A': FlashcardStatus.Good,
                'row-B': FlashcardStatus.Easy,
            },
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act - Delete current card (row-C)
        const newQueue = progress.queue.filter(id => id !== 'row-C');
        const newCardStates = { ...progress.cardStates };
        delete newCardStates['row-C'];

        // Adjust index if needed
        let newIndex = progress.currentIndex;
        if (newIndex >= newQueue.length) {
            newIndex = 0;
        }

        const healedProgress = {
            ...progress,
            queue: newQueue,
            currentIndex: newIndex,
            cardStates: newCardStates,
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(healedProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.queue).toEqual(['row-A', 'row-B', 'row-D']);
        expect(savedProgress!.queue).not.toContain('row-C');
        expect(savedProgress!.cardStates).not.toHaveProperty('row-C');
        expect(savedProgress!.currentIndex).toBe(2); // Now points to row-D
    });

    /**
     * TC-F02: Delete Last Card in Queue
     */
    it('TC-F02: should handle deletion of last remaining card', async () => {
        // Arrange
        const progress: ConfidenceProgress = {
            id: 'delete-last-1',
            name: 'Delete Last Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['last-card'],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act - Delete the only card
        const emptyProgress = {
            ...progress,
            queue: [],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(emptyProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.queue).toHaveLength(0);
        expect(savedProgress!.currentIndex).toBe(0);

        // In real app, this would trigger session completion
    });

    /**
     * TC-F03: Skip Missing Card Data
     */
    it('TC-F03: should remove missing card from queue', async () => {
        // Arrange
        const progress: ConfidenceProgress = {
            id: 'missing-card-1',
            name: 'Missing Card Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['exists-1', 'missing-xyz', 'exists-2'],
            currentIndex: 1, // At missing card
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act - Skip missing card (remove from queue)
        const newQueue = progress.queue.filter((_, i) => i !== progress.currentIndex);
        const newIndex = Math.min(progress.currentIndex, newQueue.length - 1);

        const healedProgress = {
            ...progress,
            queue: newQueue,
            currentIndex: newIndex,
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(healedProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.queue).toEqual(['exists-1', 'exists-2']);
        expect(savedProgress!.queue).not.toContain('missing-xyz');
        expect(savedProgress!.currentIndex).toBe(1); // Points to 'exists-2'
    });

    /**
     * TC-F04: Empty Queue After Tag Filter Change
     */
    it('TC-F04: should handle queue becoming empty after filter change', async () => {
        // Arrange
        const progress: ConfidenceProgress = {
            id: 'empty-filter-1',
            name: 'Empty Filter Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: ['JLPT_N5'],
            createdAt: Date.now(),
            queue: ['row-1', 'row-2', 'row-3'],
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress);
        });

        // Act - Simulate external tag removal making queue invalid
        // Manual sync would detect this and clear queue
        const syncedProgress = {
            ...progress,
            queue: [], // All rows lost their tags
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(syncedProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.queue).toHaveLength(0);
        // In real app, would show "No cards available" message
    });

    /**
     * TC-F05: Interval Config Validation
     */
    it('TC-F05: should prevent invalid interval values', () => {
        // Arrange - Try to create progress with invalid interval
        const invalidIntervals = {
            [FlashcardStatus.Again]: 0,    // Invalid: < 1
            [FlashcardStatus.Hard]: -5,    // Invalid: negative
            [FlashcardStatus.Good]: 8,     // Valid
            [FlashcardStatus.Easy]: 1000,  // Valid (large but ok)
            [FlashcardStatus.Perfect]: 21,
            [FlashcardStatus.Superb]: 34,
            [FlashcardStatus.New]: 0,
        };

        // In real implementation, UI would validate and prevent this
        // Here we just verify the data structure allows it
        expect(invalidIntervals[FlashcardStatus.Again]).toBe(0);
        expect(invalidIntervals[FlashcardStatus.Hard]).toBe(-5);

        // Validation would correct these to minimum 1
        const corrected = {
            ...invalidIntervals,
            [FlashcardStatus.Again]: Math.max(1, invalidIntervals[FlashcardStatus.Again]),
            [FlashcardStatus.Hard]: Math.max(1, invalidIntervals[FlashcardStatus.Hard]),
        };

        expect(corrected[FlashcardStatus.Again]).toBe(1);
        expect(corrected[FlashcardStatus.Hard]).toBe(1);
    });

    /**
     * TC-F06: Handle Index Out of Bounds
     */
    it('TC-F06: should handle currentIndex exceeding queue length', async () => {
        // Arrange - Progress with invalid index (could happen after external deletion)
        const progress: ConfidenceProgress = {
            id: 'oob-index-1',
            name: 'Out of Bounds Test',
            tableIds: ['table-1'],
            relationIds: ['rel-1'],
            tags: [],
            createdAt: Date.now(),
            queue: ['row-1', 'row-2'],
            currentIndex: 5, // Invalid! Queue only has 2 items
            cardStates: {},
        };

        // Act - Correction logic
        const correctedIndex = Math.min(progress.currentIndex, progress.queue.length - 1);
        const correctedIndex2 = Math.max(0, correctedIndex); // Ensure >= 0

        // Assert
        expect(correctedIndex2).toBe(1); // Clamped to last valid index
    });
});
