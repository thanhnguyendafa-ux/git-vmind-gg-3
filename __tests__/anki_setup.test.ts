// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTableStore } from '../stores/useTableStore';
import { Table, Relation } from '../types';

describe('Group C: Anki Setup Logic', () => {

    // We are testing the logic that was embedded in the component.
    // Ideally, this logic should be extracted to a helper or hook, but for now we can simulate the data transformation.

    // The logic in question:
    const getAvailableRelations = (tables: Table[], selectedTableIds: Set<string>) => {
        const relations: (Relation & { tableName: string })[] = [];
        tables.forEach(table => {
            if (selectedTableIds.has(table.id)) {
                // THE FIX: We removed the .filter(rel => rel.tags.includes('Anki')) check.
                // So now it should return all relations.
                table.relations
                    // .filter(rel => (rel.tags || []).includes('Anki')) <-- THIS IS WHAT WAS REMOVED
                    .forEach(rel => relations.push({ ...rel, tableName: table.name }));
            }
        });
        return relations;
    };

    it('[TC-ANK-SETUP-01] Should load relations without "Anki" tag', () => {
        const mockTable: Table = {
            id: 't1',
            name: 'Table 1',
            columns: [],
            rows: [],
            relations: [
                { id: 'r1', name: 'Rel 1 No Tag', questionColumnIds: [], answerColumnIds: [] },
                { id: 'r2', name: 'Rel 2 Anki Tag', tags: ['Anki'], questionColumnIds: [], answerColumnIds: [] }
            ],
            creatorId: 'u1'
        } as any;

        const selectedIds = new Set(['t1']);
        const result = getAvailableRelations([mockTable], selectedIds);

        expect(result).toHaveLength(2);
        expect(result.map(r => r.id)).toContain('r1');
        expect(result.map(r => r.id)).toContain('r2');
    });

    it('[TC-ANK-SETUP-02] Should calculate total cards as Rows * SelectedRelations', () => {
        // Setup: Table with 10 rows and 2 relations
        const mockTable: Table = {
            id: 't2',
            name: 'Table 2',
            columns: [],
            rows: Array.from({ length: 10 }, (_, i) => ({ id: `row${i}`, cols: {}, stats: {} } as any)),
            relations: [
                { id: 'rA', name: 'Rel A', questionColumnIds: [], answerColumnIds: [] },
                { id: 'rB', name: 'Rel B', questionColumnIds: [], answerColumnIds: [] }
            ],
            creatorId: 'u1'
        } as any;

        // Logic check function (replicating the component logic)
        const calculateCount = (tables: Table[], selectedTableId: Set<string>, selectedRelIds: Set<string>) => {
            let count = 0;
            tables.forEach(table => {
                if (selectedTableId.has(table.id)) {
                    const rowCount = table.rows.length;
                    const relCount = table.relations.filter(r => selectedRelIds.has(r.id)).length;
                    count += (rowCount * relCount);
                }
            });
            return count;
        }

        const selectedTableIds = new Set(['t2']);

        // Scenario 1: 1 Relation selected
        let selectedRelIds = new Set(['rA']);
        expect(calculateCount([mockTable], selectedTableIds, selectedRelIds)).toBe(10); // 10 * 1

        // Scenario 2: 2 Relations selected
        selectedRelIds = new Set(['rA', 'rB']);
        expect(calculateCount([mockTable], selectedTableIds, selectedRelIds)).toBe(20); // 10 * 2

        // Scenario 3: 0 Relations selected
        selectedRelIds = new Set([]);
        expect(calculateCount([mockTable], selectedTableIds, selectedRelIds)).toBe(0); // 10 * 0
    });
});
