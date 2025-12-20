import { describe, it, expect, beforeEach } from 'vitest';
import { createPhotosynthesisSample } from '../ConceptLinksSample';
import { useConceptStore } from '../../../../stores/useConceptStore';
import { useTableStore } from '../../../../stores/useTableStore';

/**
 * These test cases verify that the "Example" button is robust enough
 * to handle situations where some stores have data (Concepts) but others
 * don't (Tables/Cards), which typically happens after a page refresh.
 */
describe('Concept Link Example Seeding (Idempotency Test)', () => {
    beforeEach(() => {
        // Reset both stores to a clean state
        useConceptStore.setState({ concepts: [], conceptLevels: [] });
        useTableStore.setState({ tables: [] });
    });

    it('TC-01: First Run - Should create all structures from zero', async () => {
        await createPhotosynthesisSample();

        const concept = useConceptStore.getState().concepts.find(c => c.code === 'BIO-PS-G5');
        const levels = useConceptStore.getState().getLevelsByConcept(concept!.id);
        const tables = useTableStore.getState().tables;

        expect(concept).toBeDefined();
        expect(levels.length).toBe(4);
        expect(tables.length).toBe(1);
        expect(tables[0].rows.length).toBe(8);
    });

    it('TC-02: Resilience - Should re-seed cards if table is missing but concepts exist', async () => {
        // 1. Initial Setup
        await createPhotosynthesisSample();

        // 2. SIMULATE REFRESH: useTableStore is wiped (not persistent), useConceptStore remains.
        const persistedConcepts = useConceptStore.getState().concepts;
        const persistedLevels = useConceptStore.getState().conceptLevels;

        useTableStore.setState({ tables: [] }); // Wiped
        useConceptStore.setState({ concepts: persistedConcepts, conceptLevels: persistedLevels }); // Kept

        // 3. Second Run (Click Example again after refresh)
        await createPhotosynthesisSample();

        const tables = useTableStore.getState().tables;

        // Expectation: The system detects the missing table and re-creates it
        expect(tables.length).toBe(1);
        expect(tables[0].rows.length).toBe(8);

        // Verify no duplicate concepts were created
        expect(useConceptStore.getState().concepts.length).toBe(2); // Folder + Concept
    });

    it('TC-03: Data Linkage - Cards must point to the correct persistent levels', async () => {
        await createPhotosynthesisSample();

        const concept = useConceptStore.getState().concepts.find(c => c.code === 'BIO-PS-G5')!;
        const levels = useConceptStore.getState().getLevelsByConcept(concept.id);
        const table = useTableStore.getState().tables[0];

        // Check if rows are correctly linked to Level 1, 2, 3, 4
        const level1Id = levels.find(l => l.order === 1)!.id;
        const level1Cards = table.rows.filter(r => r.conceptLevelId === level1Id);

        expect(level1Cards.length).toBe(3); // Sunlight, CO2, Water
    });
});
