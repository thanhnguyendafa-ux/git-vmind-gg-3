import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { generateUUID } from '../../../utils/uuidUtils';
import { VocabRow, FlashcardStatus } from '../../../types';

export const createPhotosynthesisSample = async () => {
    const conceptStore = useConceptStore.getState();
    const tableStore = useTableStore.getState();

    // Check if sample already exists to avoid duplicates
    const existing = conceptStore.concepts.find(c => c.code === 'BIO-PS-G5');
    if (existing) return existing.id;

    try {
        // 1. Create Folder
        const scienceFolder = await conceptStore.createConcept('SCI-G5', 'Science Grade 5', 'Primary Science Curriculum', undefined, true);

        // 2. Create Photosynthesis Concept under Folder
        const psConcept = await conceptStore.createConcept(
            'BIO-PS-G5',
            'Photosynthesis',
            'The process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll.',
            scienceFolder.id
        );

        // 3. Create Levels (Explicitly named Level 1-4)
        const level1 = await conceptStore.createLevel(psConcept.id, 'Level 1', 1, 'Reactants: What plants need (Sunlight, Water, CO2)');
        const level2 = await conceptStore.createLevel(psConcept.id, 'Level 2', 2, 'Structures: Where it happens (Chlorophyll, Chloroplasts)');
        const level3 = await conceptStore.createLevel(psConcept.id, 'Level 3', 3, 'Process: How it works (Gas Exchange, Stomata)');
        const level4 = await conceptStore.createLevel(psConcept.id, 'Level 4', 4, 'Products: What is produced (Glucose, Oxygen)');

        // 4. Create Vocabulary Table
        const tableName = 'Science Grade 5 - Photosynthesis';
        const columnsStr = 'Vocab, Definition, Note';
        const newTable = await tableStore.createTable(tableName, columnsStr);

        if (!newTable) throw new Error("Failed to create sample table");

        // 5. Create Rows
        const rawRows = [
            { vocab: 'Sunlight', def: 'Energy from the sun that powers photosynthesis.', note: 'Reactant', levelId: level1.id },
            { vocab: 'Carbon Dioxide', def: 'Gas taken from the air by plants.', note: 'Reactant', levelId: level1.id },
            { vocab: 'Water', def: 'Absorbed by roots for the chemical reaction.', note: 'Reactant', levelId: level1.id },
            { vocab: 'Chlorophyll', def: 'Green pigment that captures light.', note: 'Structure', levelId: level2.id },
            { vocab: 'Chloroplast', def: 'The "factory" inside leaves where it happens.', note: 'Structure', levelId: level2.id },
            { vocab: 'Stomata', def: 'Tiny pores on leaves for gas exchange.', note: 'Process', levelId: level3.id },
            { vocab: 'Glucose', def: 'The sugar produced for plant energy.', note: 'Product', levelId: level4.id },
            { vocab: 'Oxygen', def: 'The byproduct released into the atmosphere.', note: 'Product', levelId: level4.id },
        ];

        const rowsToAdd: VocabRow[] = rawRows.map(r => ({
            id: generateUUID(),
            cols: {
                [newTable.columns[0].id]: r.vocab,
                [newTable.columns[1].id]: r.def,
                [newTable.columns[2].id]: r.note
            },
            conceptLevelId: r.levelId, // Directly link to Level
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
        }));

        await tableStore.addRows(newTable.id, rowsToAdd);

        return psConcept.id;
    } catch (error) {
        console.error('Failed to create sample data:', error);
        return null;
    }
};
