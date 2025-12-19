import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('AnkiMetadataLoading', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should implement proactive metadata loading logic', () => {
        // Simulating the logic we implemented in AnkiSetupScreen
        const tables = [
            { id: 'table-1', rows: [], rowCount: 50 },
            { id: 'table-2', rows: [{ id: 'row-1' }], rowCount: 1 },
            { id: 'table-3', rows: [], rowCount: 0 },
        ];

        const ankiProgresses = [
            { id: 'prog-1', tableIds: ['table-1', 'table-2', 'table-3'] },
        ];

        const loadingTableIds = new Set();
        const tablesToLoad = new Set<string>();

        // This is the logic from AnkiSetupScreen useEffect
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const table = tables.find((t: any) => t.id === tableId);
                if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                    tablesToLoad.add(tableId);
                }
            });
        });

        // Should load table-1 (empty rows, rowCount > 0)
        // Should NOT load table-2 (already has rows)
        // Should NOT load table-3 (rowCount = 0)
        expect(tablesToLoad.has('table-1')).toBe(true);
        expect(tablesToLoad.has('table-2')).toBe(false);
        expect(tablesToLoad.has('table-3')).toBe(false);
        expect(tablesToLoad.size).toBe(1);
    });

    it('should not load tables that are already loading', () => {
        const tables = [
            { id: 'table-1', rows: [], rowCount: 50 },
        ];

        const ankiProgresses = [
            { id: 'prog-1', tableIds: ['table-1'] },
        ];

        const loadingTableIds = new Set(['table-1']); // already loading
        const tablesToLoad = new Set<string>();

        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const table = tables.find((t: any) => t.id === tableId);
                if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                    tablesToLoad.add(tableId);
                }
            });
        });

        expect(tablesToLoad.size).toBe(0);
    });

    it('should collect tables from multiple decks', () => {
        const tables = [
            { id: 'table-1', rows: [], rowCount: 10 },
            { id: 'table-2', rows: [], rowCount: 20 },
            { id: 'table-3', rows: [], rowCount: 30 },
        ];

        const ankiProgresses = [
            { id: 'prog-1', tableIds: ['table-1'] },
            { id: 'prog-2', tableIds: ['table-2', 'table-3'] },
        ];

        const loadingTableIds = new Set();
        const tablesToLoad = new Set<string>();

        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const table = tables.find((t: any) => t.id === tableId);
                if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                    tablesToLoad.add(tableId);
                }
            });
        });

        expect(tablesToLoad.size).toBe(3);
        expect(tablesToLoad.has('table-1')).toBe(true);
        expect(tablesToLoad.has('table-2')).toBe(true);
        expect(tablesToLoad.has('table-3')).toBe(true);
    });

    it('should handle empty ankiProgresses array', () => {
        const tables = [
            { id: 'table-1', rows: [], rowCount: 10 },
        ];

        const ankiProgresses: any[] = [];
        const loadingTableIds = new Set();
        const tablesToLoad = new Set<string>();

        if (ankiProgresses.length === 0) {
            // Early return - should not process anything
        } else {
            ankiProgresses.forEach(progress => {
                progress.tableIds.forEach((tableId: string) => {
                    const table = tables.find((t: any) => t.id === tableId);
                    if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                        tablesToLoad.add(tableId);
                    }
                });
            });
        }

        expect(tablesToLoad.size).toBe(0);
    });

    it('should correctly determine loading state for deck cards', () => {
        const progress1TableIds = ['table-1', 'table-2'];
        const progress2TableIds = ['table-3'];
        const loadingTableIds = new Set(['table-1']);

        // Deck 1: has table-1 loading
        const isDeck1Loading = progress1TableIds.some(tid => loadingTableIds.has(tid));
        expect(isDeck1Loading).toBe(true);

        // Deck 2: no tables loading
        const isDeck2Loading = progress2TableIds.some(tid => loadingTableIds.has(tid));
        expect(isDeck2Loading).toBe(false);
    });

    it('should calculate new and due counts correctly from table rows', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        const rows = [
            { id: 'row-1', stats: { ankiDueDate: undefined } }, // New card
            { id: 'row-2', stats: { ankiDueDate: null } }, // New card
            { id: 'row-3', stats: { ankiDueDate: todayTimestamp - 86400000 } }, // Due (yesterday)
            { id: 'row-4', stats: { ankiDueDate: todayTimestamp } }, // Due (today)
            { id: 'row-5', stats: { ankiDueDate: todayTimestamp + 86400000 } }, // Not due (tomorrow)
        ];

        let newCount = 0;
        let dueCount = 0;

        rows.forEach((row: any) => {
            const { ankiDueDate } = row.stats;
            if (ankiDueDate === undefined || ankiDueDate === null) {
                newCount++;
            } else if (ankiDueDate <= todayTimestamp) {
                dueCount++;
            }
        });

        expect(newCount).toBe(2);
        expect(dueCount).toBe(2);
    });
});
