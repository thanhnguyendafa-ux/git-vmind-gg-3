import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { generateUUID } from '../../../utils/uuidUtils';

describe('Concept-Table Live Mapping (Test Cases 5-7)', () => {
    let conceptId: string;
    let levelId: string;
    let tableId: string;

    beforeEach(async () => {
        // Reset stores
        useConceptStore.setState({ concepts: [], conceptLevels: [] });
        useTableStore.setState({ tables: [] });

        // Setup base data
        const concept = await useConceptStore.getState().createConcept('TEST-01', 'Test Concept');
        conceptId = concept.id;
        const level = await useConceptStore.getState().createLevel(conceptId, 'Level 1', 1);
        levelId = level.id;
        const table = await useTableStore.getState().createTable('Test Table', 'Col1, Col2');
        tableId = table.id;
    });

    it('Test Case 5: Live content reactivity - updating a row reflects in concept cards', async () => {
        const tableStore = useTableStore.getState();
        const conceptStore = useConceptStore.getState();

        // 1. Add a row linked to the level
        const rowId = generateUUID();
        const row = {
            id: rowId,
            cols: { [tableStore.tables[0].columns[0].id]: 'Original Value' },
            conceptLevelId: levelId,
            stats: { correct: 0, incorrect: 0, flashcardStatus: 0 } as any,
            createdAt: Date.now(),
            modifiedAt: Date.now()
        };
        await tableStore.addRows(tableId, [row]);

        // 2. Verify it appears in Concept search
        let cards = conceptStore.getRowsByLevel(levelId);
        expect(cards[0].cols[tableStore.tables[0].columns[0].id]).toBe('Original Value');

        // 3. Update row in TableStore
        await tableStore.upsertRow(tableId, { ...row, cols: { [tableStore.tables[0].columns[0].id]: 'Updated Value' } });

        // 4. Verify ConceptStore returns the UPDATED value (Proving Live Mapping)
        cards = conceptStore.getRowsByLevel(levelId);
        expect(cards[0].cols[tableStore.tables[0].columns[0].id]).toBe('Updated Value');
    });

    it('Test Case 6: Row deletion reactivity', async () => {
        const tableStore = useTableStore.getState();
        const conceptStore = useConceptStore.getState();

        const rowId = generateUUID();
        await tableStore.addRows(tableId, [{
            id: rowId,
            cols: {},
            conceptLevelId: levelId,
            stats: {} as any,
            createdAt: Date.now(),
            modifiedAt: Date.now()
        }]);

        expect(conceptStore.getRowsByLevel(levelId).length).toBe(1);

        // Delete from table
        await tableStore.deleteRows(tableId, [rowId]);

        // Should be gone from Concept view
        expect(conceptStore.getRowsByLevel(levelId).length).toBe(0);
    });

    it('Test Case 7: Level switching reactivity', async () => {
        const tableStore = useTableStore.getState();
        const conceptStore = useConceptStore.getState();

        const level2 = await conceptStore.createLevel(conceptId, 'Level 2', 2);
        const rowId = generateUUID();
        const row = {
            id: rowId,
            cols: {},
            conceptLevelId: levelId, // Level 1
            stats: {} as any,
            createdAt: Date.now(),
            modifiedAt: Date.now()
        };
        await tableStore.addRows(tableId, [row]);

        expect(conceptStore.getRowsByLevel(levelId).length).toBe(1);
        expect(conceptStore.getRowsByLevel(level2.id).length).toBe(0);

        // Switch level in Table record
        await tableStore.upsertRow(tableId, { ...row, conceptLevelId: level2.id });

        // Should have "moved"
        expect(conceptStore.getRowsByLevel(levelId).length).toBe(0);
        expect(conceptStore.getRowsByLevel(level2.id).length).toBe(1);
    });
});
