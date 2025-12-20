import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useUserStore } from '../../../stores/useUserStore';
import { generateUUID } from '../../../utils/uuidUtils';
import { VocabRow, FlashcardStatus } from '../../../types';

export const createPhotosynthesisSample = async () => {
    const conceptStore = useConceptStore.getState();
    const tableStore = useTableStore.getState();

    // --- Step 1: Create or Get Table FIRST ---
    const tableName = 'Science Grade 5 - Photosynthesis';
    let table = tableStore.tables.find(t => t.name === tableName);

    if (!table) {
        const columnsStr = 'Vocab, Definition, Note';
        table = await tableStore.createTable(tableName, columnsStr);
    }

    if (!table) throw new Error("Failed to create or retrieve sample table");

    // --- Step 2: Validate Columns ---
    // Ensure we have the right columns for our data
    const vocabCol = table.columns.find(c => c.name.toLowerCase().includes('vocab')) || table.columns[0];
    const defCol = table.columns.find(c => c.name.toLowerCase().includes('def')) || table.columns[1];
    const noteCol = table.columns.find(c => c.name.toLowerCase().includes('note')) || table.columns[2];

    if (!vocabCol || !defCol) throw new Error("Table columns missing required fields");

    // --- Step 3: Get or Create Folder ---
    let scienceFolder = conceptStore.concepts.find(c => c.code === 'SCI-G5');
    if (!scienceFolder) {
        scienceFolder = await conceptStore.createConcept('SCI-G5', 'Science Grade 5', 'Primary Science Curriculum', undefined, true);
    } else {
        // FORCE SYNC: Ensure existing folder is on server
        await conceptStore.updateConcept(scienceFolder.id, {});
    }

    // --- Step 4: Get or Create Concept ---
    let psConcept = conceptStore.concepts.find(c => c.code === 'BIO-PS-G5');
    if (!psConcept) {
        psConcept = await conceptStore.createConcept(
            'BIO-PS-G5',
            'Photosynthesis',
            'The process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll.',
            scienceFolder.id
        );
    } else {
        // FORCE SYNC: Ensure existing concept is on server
        await conceptStore.updateConcept(psConcept.id, {});
    }

    // --- Step 5: Get or Create Levels ---
    let levels = conceptStore.getLevelsByConcept(psConcept.id);
    if (levels.length === 0) {
        const l1 = await conceptStore.createLevel(psConcept.id, 'Level 1', 1, 'Reactants: What plants need (Sunlight, Water, CO2)');
        const l2 = await conceptStore.createLevel(psConcept.id, 'Level 2', 2, 'Structures: Where it happens (Chlorophyll, Chloroplasts)');
        const l3 = await conceptStore.createLevel(psConcept.id, 'Level 3', 3, 'Process: How it works (Gas Exchange, Stomata)');
        const l4 = await conceptStore.createLevel(psConcept.id, 'Level 4', 4, 'Products: What is produced (Glucose, Oxygen)');
        levels = [l1, l2, l3, l4];
    } else {
        // Ensure sorted for mapping
        levels.sort((a, b) => a.order - b.order);

        // FORCE SYNC: Ensure all levels are on server
        for (const level of levels) {
            await conceptStore.updateLevel(level.id, {});
        }
    }

    // CRITICAL: Wait for sync queue to clear before creating rows
    // This ensures Concepts and Levels are on the server before rows reference them
    const { session, isGuest } = useUserStore.getState();
    if (!isGuest && session) {
        const { VmindSyncEngine } = await import('../../../services/VmindSyncEngine');
        const engine = VmindSyncEngine.getInstance();

        // Wait up to 30 seconds for queue to clear
        let attempts = 0;
        while (attempts < 60) {
            const status = await engine.getQueueStatus();
            if (status.isEmpty) break;

            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (attempts >= 60) {
            console.warn('[Sample] Sync queue did not clear in time. Rows may fail to sync.');
        }
    }

    // --- Step 6: Create Rows (Idempotency Check) ---
    // Defined data source
    const rawRows = [
        { vocab: 'Sunlight', def: 'Energy from the sun that powers photosynthesis.', note: 'Reactant', levelIndex: 0 },
        { vocab: 'Carbon Dioxide', def: 'Gas taken from the air by plants.', note: 'Reactant', levelIndex: 0 },
        { vocab: 'Water', def: 'Absorbed by roots for the chemical reaction.', note: 'Reactant', levelIndex: 0 },
        { vocab: 'Chlorophyll', def: 'Green pigment that captures light.', note: 'Structure', levelIndex: 1 },
        { vocab: 'Chloroplast', def: 'The "factory" inside leaves where it happens.', note: 'Structure', levelIndex: 1 },
        { vocab: 'Stomata', def: 'Tiny pores on leaves for gas exchange.', note: 'Process', levelIndex: 2 },
        { vocab: 'Glucose', def: 'The sugar produced for plant energy.', note: 'Product', levelIndex: 3 },
        { vocab: 'Oxygen', def: 'The byproduct released into the atmosphere.', note: 'Product', levelIndex: 3 },
    ];

    // Filter out rows that might already exist to avoid duplicates
    // We check existence by 'Vocab' column value
    const rowsToAdd: VocabRow[] = [];

    for (const r of rawRows) {
        const exists = table.rows.some(existing =>
            (existing.cols[vocabCol.id] as string)?.toLowerCase() === r.vocab.toLowerCase()
        );

        if (!exists) {
            const targetLevel = levels[r.levelIndex]; // Safe because we created/retrieved 4 levels

            rowsToAdd.push({
                id: generateUUID(),
                cols: {
                    [vocabCol.id]: r.vocab,
                    [defCol.id]: r.def,
                    ...(noteCol ? { [noteCol.id]: r.note } : {})
                },
                conceptLevelId: targetLevel?.id, // Link to level
                stats: {
                    correct: 0,
                    incorrect: 0,
                    lastStudied: null,
                    flashcardStatus: FlashcardStatus.New,
                    flashcardEncounters: 0,
                    isFlashcardReviewed: false,
                    lastPracticeDate: null
                },
                createdAt: Date.now(),
                modifiedAt: Date.now()
            });
        }
    }

    if (rowsToAdd.length > 0) {
        try {
            await tableStore.addRows(table.id, rowsToAdd);
        } catch (error) {
            console.error('Failed to create sample data rows:', error);
            // Don't return null here, partial success (structure) is better than failure
        }
    }

    return psConcept.id;
};
