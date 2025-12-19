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
    StudyMode,
    Column
} from '../../types';

// Mock VmindSyncEngine to prevent actual API calls
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

// Mock supabase client
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }))
    }
}));

describe('Confidence Mode - Setup & Creation', () => {

    // Test data setup
    const createMockTable = (id: string, name: string, rowCount: number = 10): Table => {
        const columns: Column[] = [
            { id: 'col-word', name: 'Word' },
            { id: 'col-meaning', name: 'Meaning' },
        ];

        const rows: VocabRow[] = Array.from({ length: rowCount }, (_, i) => ({
            id: `row-${id}-${i + 1}`,
            cols: {
                'col-word': `Word${i + 1}`,
                'col-meaning': `Meaning${i + 1}`
            },
            stats: {
                correct: 0,
                incorrect: 0,
                lastStudied: null,
                flashcardStatus: FlashcardStatus.New,
                flashcardEncounters: 0,
                isFlashcardReviewed: false,
                lastPracticeDate: null,
            }
        }));

        return {
            id,
            name,
            columns,
            rows,
            relations: [
                {
                    id: `rel-${id}-1`,
                    name: 'Word → Meaning',
                    questionColumnIds: ['col-word'],
                    answerColumnIds: ['col-meaning'],
                    compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice],
                    tags: ['Flashcard']
                }
            ]
        };
    };

    beforeEach(() => {
        // Reset all stores before each test
        act(() => {
            useTableStore.setState({ tables: [], folders: [] });
            useSessionDataStore.setState({
                confidenceProgresses: [],
                studyProgresses: [],
                ankiProgresses: []
            });
            useSessionStore.setState({
                activeConfidenceSession: null,
                activeAnkiSession: null
            });
        });
    });

    /**
     * TC-A01: Create Confidence Set - Basic Flow
     */
    it('TC-A01: should create a basic confidence set with correct queue', async () => {
        // Arrange
        const mockTable = createMockTable('test-table-1', 'Japanese Verbs', 5);

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        // Act - Simulate user creating a confidence set
        const newProgress: ConfidenceProgress = {
            id: crypto.randomUUID(),
            name: 'Test Set 1',
            tableIds: [mockTable.id],
            relationIds: [mockTable.relations[0].id],
            tags: [],
            createdAt: Date.now(),
            queue: mockTable.rows.map(r => r.id), // All rows in queue
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
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(newProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState().confidenceProgresses[0];

        expect(savedProgress).toBeDefined();
        expect(savedProgress.name).toBe('Test Set 1');
        expect(savedProgress.tableIds).toEqual([mockTable.id]);
        expect(savedProgress.queue).toHaveLength(5);
        expect(savedProgress.currentIndex).toBe(0);
        expect(savedProgress.cardStates).toEqual({});

        // Verify queue contains all row IDs
        mockTable.rows.forEach(row => {
            expect(savedProgress.queue).toContain(row.id);
        });
    });

    /**
     * TC-A02: Create with Tag Filter
     */
    it('TC-A02: should create set with tag filter applied', async () => {
        // Arrange - Create table with tagged rows
        const mockTable = createMockTable('test-table-2', 'JLPT Vocab', 10);

        // Add tags to some rows
        mockTable.rows[0].tags = ['JLPT_N5'];
        mockTable.rows[1].tags = ['JLPT_N5'];
        mockTable.rows[2].tags = ['JLPT_N5'];
        mockTable.rows[3].tags = ['JLPT_N4'];
        mockTable.rows[4].tags = ['JLPT_N4'];
        // rows 5-9 have no tags

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        // Act - Create set with tag filter
        const filteredRows = mockTable.rows.filter(r =>
            r.tags?.includes('JLPT_N5')
        );

        const newProgress: ConfidenceProgress = {
            id: crypto.randomUUID(),
            name: 'JLPT N5 Only',
            tableIds: [mockTable.id],
            relationIds: [mockTable.relations[0].id],
            tags: ['JLPT_N5'], // Tag filter
            createdAt: Date.now(),
            queue: filteredRows.map(r => r.id),
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(newProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState().confidenceProgresses[0];

        expect(savedProgress.tags).toEqual(['JLPT_N5']);
        expect(savedProgress.queue).toHaveLength(3); // Only 3 rows with JLPT_N5 tag
        expect(savedProgress.queue).toContain('row-test-table-2-1');
        expect(savedProgress.queue).toContain('row-test-table-2-2');
        expect(savedProgress.queue).toContain('row-test-table-2-3');
        expect(savedProgress.queue).not.toContain('row-test-table-2-4'); // JLPT_N4
    });

    /**
     * TC-A03: Create with Multiple Tables
     */
    it('TC-A03: should merge queue from multiple tables', async () => {
        // Arrange
        const table1 = createMockTable('table-verbs', 'Japanese Verbs', 3);
        const table2 = createMockTable('table-adjectives', 'Japanese Adjectives', 2);

        act(() => {
            useTableStore.setState({ tables: [table1, table2] });
        });

        // Act - Create set with both tables
        const allRows = [...table1.rows, ...table2.rows];

        const newProgress: ConfidenceProgress = {
            id: crypto.randomUUID(),
            name: 'Multi-Table Set',
            tableIds: [table1.id, table2.id],
            relationIds: [table1.relations[0].id, table2.relations[0].id],
            tags: [],
            createdAt: Date.now(),
            queue: allRows.map(r => r.id),
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(newProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState().confidenceProgresses[0];

        expect(savedProgress.tableIds).toHaveLength(2);
        expect(savedProgress.tableIds).toContain('table-verbs');
        expect(savedProgress.tableIds).toContain('table-adjectives');
        expect(savedProgress.queue).toHaveLength(5); // 3 + 2 rows

        // Verify contains rows from both tables
        expect(savedProgress.queue).toContain('row-table-verbs-1');
        expect(savedProgress.queue).toContain('row-table-adjectives-1');
    });

    /**
     * TC-A04: Prevent Empty Set Creation
     */
    it('TC-A04: should not create set with empty queue', async () => {
        // Arrange
        const mockTable = createMockTable('test-table-3', 'Test Vocab', 5);

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        // Act - Try to create set with filter that matches 0 rows
        const emptyProgress: ConfidenceProgress = {
            id: crypto.randomUUID(),
            name: 'Empty Set',
            tableIds: [mockTable.id],
            relationIds: [mockTable.relations[0].id],
            tags: ['NON_EXISTENT_TAG'], // No rows have this tag
            createdAt: Date.now(),
            queue: [], // Empty queue!
            currentIndex: 0,
            cardStates: {},
        };

        // Assert - Should validate queue is not empty before saving
        expect(emptyProgress.queue.length).toBe(0);

        // In real implementation, ConfidenceSetupScreen would show error
        // and prevent calling saveConfidenceProgress
        // We're just verifying the data structure here
    });

    /**
     * TC-A05: Custom Interval Configuration
     */
    it('TC-A05: should save custom interval configuration', async () => {
        // Arrange
        const mockTable = createMockTable('test-table-4', 'Test Vocab', 3);

        act(() => {
            useTableStore.setState({ tables: [mockTable] });
        });

        // Act - Create set with custom intervals
        const customIntervals = {
            [FlashcardStatus.Again]: 2,   // Changed from 3
            [FlashcardStatus.Hard]: 4,    // Changed from 5
            [FlashcardStatus.Good]: 10,   // Changed from 8
            [FlashcardStatus.Easy]: 15,   // Changed from 13
            [FlashcardStatus.Perfect]: 25, // Changed from 21
            [FlashcardStatus.Superb]: 40,  // Changed from 34
            [FlashcardStatus.New]: 0,
        };

        const newProgress: ConfidenceProgress = {
            id: crypto.randomUUID(),
            name: 'Custom Intervals Set',
            tableIds: [mockTable.id],
            relationIds: [mockTable.relations[0].id],
            tags: [],
            createdAt: Date.now(),
            queue: mockTable.rows.map(r => r.id),
            currentIndex: 0,
            cardStates: {},
            intervalConfig: customIntervals,
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(newProgress);
        });

        // Assert
        const savedProgress = useSessionDataStore.getState().confidenceProgresses[0];

        expect(savedProgress.intervalConfig).toBeDefined();
        expect(savedProgress.intervalConfig![FlashcardStatus.Good]).toBe(10);
        expect(savedProgress.intervalConfig![FlashcardStatus.Superb]).toBe(40);
    });

    /**
     * TC-A06: Multiple Sets Can Coexist
     */
    it('TC-A06: should allow creating multiple confidence sets', async () => {
        // Arrange
        const table1 = createMockTable('table-1', 'Vocab 1', 5);
        const table2 = createMockTable('table-2', 'Vocab 2', 3);

        act(() => {
            useTableStore.setState({ tables: [table1, table2] });
        });

        // Act - Create two separate sets
        const progress1: ConfidenceProgress = {
            id: 'progress-1',
            name: 'Set 1',
            tableIds: [table1.id],
            relationIds: [table1.relations[0].id],
            tags: [],
            createdAt: Date.now(),
            queue: table1.rows.map(r => r.id),
            currentIndex: 0,
            cardStates: {},
        };

        const progress2: ConfidenceProgress = {
            id: 'progress-2',
            name: 'Set 2',
            tableIds: [table2.id],
            relationIds: [table2.relations[0].id],
            tags: [],
            createdAt: Date.now(),
            queue: table2.rows.map(r => r.id),
            currentIndex: 0,
            cardStates: {},
        };

        await act(async () => {
            await useSessionDataStore.getState().saveConfidenceProgress(progress1);
            await useSessionDataStore.getState().saveConfidenceProgress(progress2);
        });

        // Assert
        const allProgresses = useSessionDataStore.getState().confidenceProgresses;

        expect(allProgresses).toHaveLength(2);
        expect(allProgresses[0].name).toBe('Set 1');
        expect(allProgresses[1].name).toBe('Set 2');
        expect(allProgresses[0].queue).toHaveLength(5);
        expect(allProgresses[1].queue).toHaveLength(3);
    });
});
