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
    StudyMode,
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

describe('Confidence Mode - Queue Reordering Logic', () => {

    const DEFAULT_INTERVALS = {
        [FlashcardStatus.Again]: 3,
        [FlashcardStatus.Hard]: 5,
        [FlashcardStatus.Good]: 8,
        [FlashcardStatus.Easy]: 13,
        [FlashcardStatus.Perfect]: 21,
        [FlashcardStatus.Superb]: 34,
    };

    /**
     * Helper function to simulate queue reordering (from ConfidenceSessionScreen)
     */
    const executeMove = (
        queue: string[],
        currentIndex: number,
        status: FlashcardStatus,
        intervalConfig = DEFAULT_INTERVALS
    ) => {
        const cardId = queue[currentIndex];
        const interval = intervalConfig[status];

        // Remove current card
        const restOfQueue = queue.filter((_, idx) => idx !== currentIndex);

        // Calculate insert position
        const insertIndex = Math.min(currentIndex + interval, restOfQueue.length);

        // Build new queue
        const newQueue = [
            ...restOfQueue.slice(0, insertIndex),
            cardId,
            ...restOfQueue.slice(insertIndex)
        ];

        // Next index stays at same position (next card slides in)
        const nextIndex = currentIndex;

        return { newQueue, nextIndex, insertIndex };
    };

    /**
     * TC-C01: Rate "Again" (Fail) - Interval 3
     */
    it('TC-C01: should move card 3 positions back when rated as "Again"', () => {
        // Arrange
        const queue = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const currentIndex = 0; // Card A

        // Act
        const { newQueue, nextIndex, insertIndex } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Again
        );

        // Assert
        expect(insertIndex).toBe(3); // 0 + 3
        expect(newQueue).toEqual(['B', 'C', 'D', 'A', 'E', 'F', 'G', 'H']);
        //                                    ↑ Card A inserted at position 3
        expect(nextIndex).toBe(0); // Next card is B
        expect(newQueue[3]).toBe('A');
        expect(newQueue[0]).toBe('B');
    });

    /**
     * TC-C02: Rate "Superb" - Interval 34 (exceeds queue length)
     */
    it('TC-C02: should move card to end when interval exceeds queue length', () => {
        // Arrange
        const queue = ['A', 'B', 'C', 'D', 'E'];
        const currentIndex = 0; // Card A

        // Act
        const { newQueue, insertIndex } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Superb // interval = 34
        );

        // Assert
        // After removing A, restOfQueue.length = 4
        // insertIndex = min(0 + 34, 4) = 4
        expect(insertIndex).toBe(4);
        expect(newQueue).toEqual(['B', 'C', 'D', 'E', 'A']);
        //                                          ↑ Card A at end
        expect(newQueue[4]).toBe('A');
    });

    /**
     * TC-C03: Rate from Middle of Queue
     */
    it('TC-C03: should correctly reposition card from middle position', () => {
        // Arrange
        const queue = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const currentIndex = 5; // Card F

        // Act
        const { newQueue, nextIndex, insertIndex } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Good // interval = 8
        );

        // Assert
        // Remove F from index 5 → restOfQueue.length = 9
        // insertIndex = min(5 + 8, 9) = 9
        expect(insertIndex).toBe(9);
        expect(newQueue).toEqual(['A', 'B', 'C', 'D', 'E', 'G', 'H', 'I', 'J', 'F']);
        //                                                                      ↑ F moved to end
        expect(nextIndex).toBe(5); // Next card is G (which slid into position 5)
        expect(newQueue[5]).toBe('G');
    });

    /**
     * TC-C04: Rate with Different Statuses - Verify All Intervals
     */
    it('TC-C04: should apply correct interval for each status', () => {
        const queue = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        const currentIndex = 2; // Card C

        // Test all statuses
        const testCases = [
            { status: FlashcardStatus.Again, expectedInsert: 5 },   // 2 + 3
            { status: FlashcardStatus.Hard, expectedInsert: 7 },    // 2 + 5
            { status: FlashcardStatus.Good, expectedInsert: 9 },    // 2 + 8 = 10, clamped to 9
            { status: FlashcardStatus.Easy, expectedInsert: 9 },    // 2 + 13 = 15, clamped to 9
            { status: FlashcardStatus.Perfect, expectedInsert: 9 }, // 2 + 21 = 23, clamped to 9
            { status: FlashcardStatus.Superb, expectedInsert: 9 },  // 2 + 34 = 36, clamped to 9
        ];

        testCases.forEach(({ status, expectedInsert }) => {
            const { insertIndex } = executeMove(queue, currentIndex, status);
            expect(insertIndex).toBe(expectedInsert);
        });
    });

    /**
     * TC-C05: Custom Interval Configuration
     */
    it('TC-C05: should use custom intervals when provided', () => {
        // Arrange
        const queue = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
        const currentIndex = 0;

        const customIntervals = {
            ...DEFAULT_INTERVALS,
            [FlashcardStatus.Good]: 10, // Custom: 10 instead of 8
        };

        // Act
        const { insertIndex } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Good,
            customIntervals
        );

        // Assert
        expect(insertIndex).toBe(6); // min(0 + 10, 6) = 6 (clamped to queue end)
    });

    /**
     * TC-C06: Sequential Ratings - Simulate Real Session
     */
    it('TC-C06: should handle sequential ratings correctly', () => {
        // Arrange - Start with 5 cards
        let queue = ['A', 'B', 'C', 'D', 'E'];
        let currentIndex = 0;
        const cardStates: Record<string, FlashcardStatus> = {};

        // Act - Rate first 3 cards

        // 1. Rate A as "Good"
        let result = executeMove(queue, currentIndex, FlashcardStatus.Good);
        queue = result.newQueue;
        currentIndex = result.nextIndex;
        cardStates['A'] = FlashcardStatus.Good;

        expect(queue).toEqual(['B', 'C', 'D', 'E', 'A']); // A moved to end
        expect(currentIndex).toBe(0);

        // 2. Rate B as "Again"
        result = executeMove(queue, currentIndex, FlashcardStatus.Again);
        queue = result.newQueue;
        currentIndex = result.nextIndex;
        cardStates['B'] = FlashcardStatus.Again;

        expect(queue).toEqual(['C', 'D', 'E', 'B', 'A']); // B moved 3 positions
        expect(currentIndex).toBe(0);

        // 3. Rate C as "Easy"
        result = executeMove(queue, currentIndex, FlashcardStatus.Easy);
        queue = result.newQueue;
        currentIndex = result.nextIndex;
        cardStates['C'] = FlashcardStatus.Easy;

        expect(queue).toEqual(['D', 'E', 'B', 'A', 'C']); // C moved to end
        expect(currentIndex).toBe(0);

        // Assert - Verify final state
        expect(cardStates).toEqual({
            'A': FlashcardStatus.Good,
            'B': FlashcardStatus.Again,
            'C': FlashcardStatus.Easy,
        });
    });

    /**
     * TC-C07: Edge Case - Last Card in Queue
     */
    it('TC-C07: should handle rating the last card in queue', () => {
        // Arrange
        const queue = ['A', 'B', 'C'];
        const currentIndex = 2; // Card C (last position)

        // Act
        const { newQueue, insertIndex } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Good // interval = 8
        );

        // Assert
        // Remove C → restOfQueue = ['A', 'B'] (length = 2)
        // insertIndex = min(2 + 8, 2) = 2
        expect(insertIndex).toBe(2);
        expect(newQueue).toEqual(['A', 'B', 'C']); // C stays at end
    });

    /**
     * TC-C08: Single Card Queue
     */
    it('TC-C08: should handle queue with single card', () => {
        // Arrange
        const queue = ['A'];
        const currentIndex = 0;

        // Act
        const { newQueue } = executeMove(
            queue,
            currentIndex,
            FlashcardStatus.Good
        );

        // Assert
        expect(newQueue).toEqual(['A']); // Card stays in place
    });

    /**
     * TC-C09: Verify Learned Count Calculation
     */
    it('TC-C09: should calculate learned count correctly', () => {
        // Arrange
        const queue = ['A', 'B', 'C', 'D', 'E'];
        const cardStates: Record<string, FlashcardStatus> = {
            'A': FlashcardStatus.Good,
            'B': FlashcardStatus.Easy,
            'C': FlashcardStatus.New,
            'D': FlashcardStatus.Again,
            'E': FlashcardStatus.New,
        };

        // Act - Calculate learned count (non-New cards)
        const learnedCount = queue.reduce((count, rowId) => {
            const status = cardStates[rowId] || FlashcardStatus.New;
            return status !== FlashcardStatus.New ? count + 1 : count;
        }, 0);

        // Assert
        expect(learnedCount).toBe(3); // A, B, D are learned
    });
});

describe('Confidence Mode - Session Management', () => {

    const createMockProgress = (): ConfidenceProgress => ({
        id: 'test-progress-1',
        name: 'Test Session',
        tableIds: ['table-1'],
        relationIds: ['rel-1'],
        tags: [],
        createdAt: Date.now(),
        queue: ['row-1', 'row-2', 'row-3', 'row-4', 'row-5'],
        currentIndex: 0,
        cardStates: {},
        intervalConfig: {
            [FlashcardStatus.Again]: 3,
            [FlashcardStatus.Hard]: 5,
            [FlashcardStatus.Good]: 8,
            [FlashcardStatus.Easy]: 13,
            [FlashcardStatus.Perfect]: 21,
            [FlashcardStatus.Superb]: 34,
        }
    });

    beforeEach(() => {
        act(() => {
            useTableStore.setState({ tables: [] });
            useSessionDataStore.setState({ confidenceProgresses: [] });
            useSessionStore.setState({ activeConfidenceSession: null });
        });
    });

    /**
     * TC-B01: Start Fresh Session
     */
    it('TC-B01: should start session from beginning when currentIndex is 0', () => {
        // Arrange
        const progress = createMockProgress();

        act(() => {
            useSessionDataStore.setState({
                confidenceProgresses: [progress]
            });
        });

        // Act - Create active session
        const session: ConfidenceSession = {
            progressId: progress.id,
            tableIds: progress.tableIds,
            relationIds: progress.relationIds,
            queue: progress.queue,
            currentIndex: progress.currentIndex,
            cardStates: progress.cardStates || {},
            sessionEncounters: 0,
            startTime: Date.now(),
            history: [],
            intervalConfig: progress.intervalConfig,
        };

        act(() => {
            useSessionStore.setState({ activeConfidenceSession: session });
        });

        // Assert
        const activeSession = useSessionStore.getState().activeConfidenceSession;

        expect(activeSession).toBeDefined();
        expect(activeSession!.currentIndex).toBe(0);
        expect(activeSession!.queue[0]).toBe('row-1');
        expect(activeSession!.history).toHaveLength(0);
    });

    /**
     * TC-B02: Resume Paused Session
     */
    it('TC-B02: should resume session from saved currentIndex', () => {
        // Arrange - Progress with currentIndex = 3
        const progress = createMockProgress();
        progress.currentIndex = 3;
        progress.cardStates = {
            'row-1': FlashcardStatus.Good,
            'row-2': FlashcardStatus.Easy,
            'row-3': FlashcardStatus.Again,
        };

        act(() => {
            useSessionDataStore.setState({
                confidenceProgresses: [progress]
            });
        });

        // Act - Resume session
        const session: ConfidenceSession = {
            progressId: progress.id,
            tableIds: progress.tableIds,
            relationIds: progress.relationIds,
            queue: progress.queue,
            currentIndex: progress.currentIndex, // Resume from 3
            cardStates: progress.cardStates,
            sessionEncounters: 0,
            startTime: Date.now(),
            history: [],
            intervalConfig: progress.intervalConfig,
        };

        act(() => {
            useSessionStore.setState({ activeConfidenceSession: session });
        });

        // Assert
        const activeSession = useSessionStore.getState().activeConfidenceSession;

        expect(activeSession!.currentIndex).toBe(3);
        expect(activeSession!.queue[3]).toBe('row-4');
        expect(activeSession!.cardStates).toHaveProperty('row-1');
        expect(activeSession!.cardStates).toHaveProperty('row-2');
        expect(activeSession!.cardStates).toHaveProperty('row-3');
    });

    /**
     * TC-B03: Reset Session
     */
    it('TC-B03: should clear all progress when reset', async () => {
        // Arrange
        const progress = createMockProgress();
        progress.currentIndex = 2;
        progress.cardStates = {
            'row-1': FlashcardStatus.Good,
            'row-2': FlashcardStatus.Easy,
        };

        act(() => {
            useSessionDataStore.setState({
                confidenceProgresses: [progress]
            });
        });

        // Act - Reset progress
        const resetProgress = {
            ...progress,
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(resetProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState()
            .confidenceProgresses.find(p => p.id === progress.id);

        expect(savedProgress!.currentIndex).toBe(0);
        expect(savedProgress!.cardStates).toEqual({});
    });
});
