import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPhotosynthesisSample } from '../ConceptLinksSample';
import { useConceptStore } from '../../../../stores/useConceptStore';
import { useTableStore } from '../../../../stores/useTableStore';

// Mock crypto.randomUUID if not available in environment
if (!global.crypto) {
    (global as any).crypto = { randomUUID: () => Math.random().toString(36).substring(2) };
}

describe('createPhotosynthesisSample', () => {
    beforeEach(() => {
        // Clear stores before each test
        useConceptStore.setState({ concepts: [], conceptLevels: [] });
        useTableStore.setState({ tables: [] });
    });

    it('should create a complete hierarchy on first run', async () => {
        const conceptId = await createPhotosynthesisSample();

        const concepts = useConceptStore.getState().concepts;
        const levels = useConceptStore.getState().conceptLevels;
        const tables = useTableStore.getState().tables;

        expect(conceptId).toBeDefined();
        expect(concepts.length).toBe(2); // Folder + Concept
        expect(levels.length).toBe(4);
        expect(tables.length).toBe(1);
        expect(tables[0].rows.length).toBe(8);
    });

    it('should re-seed tables/rows if concept exists but table is missing (Idempotency)', async () => {
        // 1. Initial run to populate both
        await createPhotosynthesisSample();

        // 2. Simulate page refresh: useConceptStore persists, useTableStore resets
        useTableStore.setState({ tables: [] });

        // 3. Run again
        await createPhotosynthesisSample();

        const tables = useTableStore.getState().tables;
        const conceptCount = useConceptStore.getState().concepts.length;

        // Current bug: tables will be empty because of early return
        expect(conceptCount).toBe(2); // No duplicate concepts
        expect(tables.length).toBe(1); // Table should be re-created
        expect(tables[0].rows.length).toBe(8); // Rows should be re-created
    });
});
