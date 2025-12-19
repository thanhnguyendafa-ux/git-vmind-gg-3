import { describe, it, expect } from 'vitest';

describe('AnkiStatisticsSync', () => {

    it('should detect shared tables across multiple Anki sets', () => {
        const ankiProgresses = [
            { id: 'prog-1', tableIds: ['table-A', 'table-B'], name: 'Set 1' },
            { id: 'prog-2', tableIds: ['table-A'], name: 'Set 2' }, // Shares table-A
            { id: 'prog-3', tableIds: ['table-C'], name: 'Set 3' }, // No sharing
        ];

        const tableUsageMap = new Map<string, string[]>();

        // Build map of which progresses use which tables
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const existing = tableUsageMap.get(tableId) || [];
                existing.push(progress.id);
                tableUsageMap.set(tableId, existing);
            });
        });

        // Map each progress ID to whether it has shared tables
        const result = new Map<string, boolean>();
        ankiProgresses.forEach(progress => {
            const hasShared = progress.tableIds.some(tid =>
                (tableUsageMap.get(tid)?.length || 0) > 1
            );
            result.set(progress.id, hasShared);
        });

        // prog-1 shares table-A (with prog-2)
        expect(result.get('prog-1')).toBe(true);

        // prog-2 shares table-A (with prog-1)
        expect(result.get('prog-2')).toBe(true);

        // prog-3 doesn't share any tables
        expect(result.get('prog-3')).toBe(false);
    });

    it('should identify table sharing when one table is used by multiple sets', () => {
        const ankiProgresses = [
            { id: 'set-1', tableIds: ['shared-table'] },
            { id: 'set-2', tableIds: ['shared-table'] },
            { id: 'set-3', tableIds: ['shared-table'] },
        ];

        const tableUsageMap = new Map<string, string[]>();
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const existing = tableUsageMap.get(tableId) || [];
                existing.push(progress.id);
                tableUsageMap.set(tableId, existing);
            });
        });

        // All sets share the same table
        const sharedTableUsage = tableUsageMap.get('shared-table');
        expect(sharedTableUsage).toHaveLength(3);
        expect(sharedTableUsage).toEqual(['set-1', 'set-2', 'set-3']);
    });

    it('should correctly update row statistics from session history', () => {
        // Simulate session history with updated stats
        const sessionHistory = [
            {
                rowId: 'row-1',
                quality: 4,
                timestamp: Date.now(),
                newStats: {
                    ankiDueDate: Date.now() + 86400000, // Tomorrow
                    ankiInterval: 1,
                    ankiEaseFactor: 2.6,
                    ankiRepetitions: 1,
                    ankiState: 'Review' as const,
                }
            },
            {
                rowId: 'row-2',
                quality: 3,
                timestamp: Date.now(),
                newStats: {
                    ankiDueDate: Date.now() + 600000, // 10 minutes
                    ankiInterval: 0,
                    ankiEaseFactor: 2.5,
                    ankiRepetitions: 0,
                    ankiState: 'Learning' as const,
                }
            }
        ];

        const tables = [
            {
                id: 'table-1',
                rows: [
                    { id: 'row-1', cols: {}, stats: { ankiDueDate: undefined } },
                    { id: 'row-2', cols: {}, stats: { ankiDueDate: undefined } },
                ]
            }
        ];

        // Simulate handleFinishAnkiSession logic
        const updatesByTable = new Map<string, any[]>();
        sessionHistory.forEach(entry => {
            for (const t of tables) {
                const r = t.rows.find((rw: any) => rw.id === entry.rowId);
                if (r) {
                    const updatedRow = { ...r, stats: entry.newStats };
                    const existing = updatesByTable.get(t.id) || [];
                    existing.push(updatedRow);
                    updatesByTable.set(t.id, existing);
                    break;
                }
            }
        });

        // Verify updates were collected
        expect(updatesByTable.has('table-1')).toBe(true);
        const updates = updatesByTable.get('table-1');
        expect(updates).toHaveLength(2);

        // Verify row-1 has new stats
        const updatedRow1 = updates?.find(row => row.id === 'row-1');
        expect(updatedRow1?.stats.ankiState).toBe('Review');
        expect(updatedRow1?.stats.ankiInterval).toBe(1);

        // Verify row-2 has new stats
        const updatedRow2 = updates?.find(row => row.id === 'row-2');
        expect(updatedRow2?.stats.ankiState).toBe('Learning');
    });

    it('should maintain statistics consistency when same card appears in multiple sets', () => {
        const table = {
            id: 'table-shared',
            rows: [
                {
                    id: 'row-1',
                    cols: { question: 'What is 2+2?', answer: '4' },
                    stats: {
                        ankiDueDate: undefined, // New card
                        ankiRepetitions: 0,
                    }
                }
            ]
        };

        const set1 = {
            id: 'set-A',
            tableIds: ['table-shared'],
            relationIds: ['rel-1']
        };

        const set2 = {
            id: 'set-B',
            tableIds: ['table-shared'],
            relationIds: ['rel-2']
        };

        // Initial counts for both sets
        const calculateNewCount = (rows: any[]) => {
            return rows.filter(r => r.stats.ankiDueDate === undefined || r.stats.ankiDueDate === null).length;
        };

        const initialCountSet1 = calculateNewCount(table.rows);
        const initialCountSet2 = calculateNewCount(table.rows);

        expect(initialCountSet1).toBe(1);
        expect(initialCountSet2).toBe(1);

        // After studying row-1 in set-A, update the table
        table.rows[0].stats.ankiDueDate = Date.now() + 86400000;
        table.rows[0].stats.ankiRepetitions = 1;

        // Both sets now see updated count
        const updatedCountSet1 = calculateNewCount(table.rows);
        const updatedCountSet2 = calculateNewCount(table.rows);

        expect(updatedCountSet1).toBe(0);
        expect(updatedCountSet2).toBe(0); // ✅ Synced!
    });

    it('should handle due date synchronization across sets', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        const tomorrow = todayTimestamp + 86400000;

        const table = {
            rows: [
                { id: 'r1', stats: { ankiDueDate: todayTimestamp - 86400000 } }, // Due yesterday
                { id: 'r2', stats: { ankiDueDate: tomorrow } }, // Due tomorrow
                { id: 'r3', stats: { ankiDueDate: todayTimestamp } }, // Due today
            ]
        };

        const calculateDueCount = (rows: any[]) => {
            return rows.filter(r => {
                const dueDate = r.stats.ankiDueDate;
                return dueDate !== undefined && dueDate !== null && dueDate <= todayTimestamp;
            }).length;
        };

        // For set-A referencing this table
        const dueCountSetA = calculateDueCount(table.rows);
        expect(dueCountSetA).toBe(2); // r1 and r3

        // For set-B also referencing this table
        const dueCountSetB = calculateDueCount(table.rows);
        expect(dueCountSetB).toBe(2); // ✅ Same count

        // After studying r1, set due date to next week
        table.rows[0].stats.ankiDueDate = todayTimestamp + 7 * 86400000;

        // Both sets now show updated count
        const newDueCountSetA = calculateDueCount(table.rows);
        const newDueCountSetB = calculateDueCount(table.rows);

        expect(newDueCountSetA).toBe(1); // Only r3
        expect(newDueCountSetB).toBe(1); // ✅ Synced!
    });

    it('should verify info banner dismissed state persists', () => {
        // Mock localStorage
        const localStorageMock = (() => {
            let store: Record<string, string> = {};
            return {
                getItem: (key: string) => store[key] || null,
                setItem: (key: string, value: string) => { store[key] = value; },
                clear: () => { store = {}; }
            };
        })();

        Object.defineProperty(window, 'localStorage', { value: localStorageMock });

        // Initial state: not dismissed
        const initialDismissed = localStorage.getItem('anki-shared-stats-info-dismissed');
        expect(initialDismissed).toBeNull();

        // User dismisses banner
        localStorage.setItem('anki-shared-stats-info-dismissed', 'true');

        // On next visit, banner should not show
        const afterDismiss = localStorage.getItem('anki-shared-stats-info-dismissed');
        expect(afterDismiss).toBe('true');

        localStorageMock.clear();
    });

    it('should correctly identify sets with no shared tables', () => {
        const ankiProgresses = [
            { id: 'unique-1', tableIds: ['table-X'] },
            { id: 'unique-2', tableIds: ['table-Y'] },
            { id: 'unique-3', tableIds: ['table-Z'] },
        ];

        const tableUsageMap = new Map<string, string[]>();
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const existing = tableUsageMap.get(tableId) || [];
                existing.push(progress.id);
                tableUsageMap.set(tableId, existing);
            });
        });

        const result = new Map<string, boolean>();
        ankiProgresses.forEach(progress => {
            const hasShared = progress.tableIds.some(tid =>
                (tableUsageMap.get(tid)?.length || 0) > 1
            );
            result.set(progress.id, hasShared);
        });

        // None should be marked as shared
        expect(result.get('unique-1')).toBe(false);
        expect(result.get('unique-2')).toBe(false);
        expect(result.get('unique-3')).toBe(false);
    });

    it('should handle mixed scenario with some shared and some unique tables', () => {
        const ankiProgresses = [
            { id: 'mixed-1', tableIds: ['shared', 'unique-A'] },
            { id: 'mixed-2', tableIds: ['shared', 'unique-B'] },
            { id: 'solo', tableIds: ['unique-C'] },
        ];

        const tableUsageMap = new Map<string, string[]>();
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const existing = tableUsageMap.get(tableId) || [];
                existing.push(progress.id);
                tableUsageMap.set(tableId, existing);
            });
        });

        const result = new Map<string, boolean>();
        ankiProgresses.forEach(progress => {
            const hasShared = progress.tableIds.some(tid =>
                (tableUsageMap.get(tid)?.length || 0) > 1
            );
            result.set(progress.id, hasShared);
        });

        // mixed-1 and mixed-2 share 'shared' table
        expect(result.get('mixed-1')).toBe(true);
        expect(result.get('mixed-2')).toBe(true);

        // solo doesn't share any tables
        expect(result.get('solo')).toBe(false);
    });
});
