
import { Table, VocabRow, FlashcardStatus, Relation, Column, AIPrompt } from '../types';

/**
 * Sanitizes a table for publication to the Community Library.
 * - Removes personal stats (correct, incorrect, anki state, etc).
 * - Resets flashcard statuses.
 * - Removes user-specific IDs (optional, but good practice if we want fresh IDs on import, 
 *   though keeping them allows simple version checks later. We will keep internal IDs for consistency
 *   but strip user data).
 */
export const sanitizeTableForPublish = (table: Table): Table => {
    // Deep clone to avoid mutating original
    const cleanTable = JSON.parse(JSON.stringify(table));

    // Reset rows
    cleanTable.rows = cleanTable.rows.map((row: VocabRow) => ({
        ...row,
        // Reset Stats
        stats: {
            correct: 0,
            incorrect: 0,
            lastStudied: null,
            flashcardStatus: FlashcardStatus.New,
            flashcardEncounters: 0,
            isFlashcardReviewed: false,
            lastPracticeDate: null,
            scrambleEncounters: 0,
            scrambleRatings: {},
            theaterEncounters: 0,
            inQueueCount: 0,
            ankiRepetitions: 0,
            ankiEaseFactor: 2.5, // Default Anki ease
            ankiInterval: 0,
            ankiDueDate: null,
            confiViewed: 0,
            wasQuit: false,
        },
        // Remove context links as they point to user's notes
        contextLinks: undefined,
        // Tag IDs are specific to user's tag tree. 
        // We will strip tagIds but keep the string `tags` if available for keyword search,
        // or just let the library metadata handle tags.
        // For the payload, we strip tagIds to avoid dead references.
        tagIds: [],
        tags: [] 
    }));

    return cleanTable;
};

/**
 * Rehydrates a downloaded table with NEW IDs to ensure it is a distinct entity in the user's workspace.
 * This prevents ID collisions if the user downloads the same table twice, or downloads their own table.
 * 
 * Crucial: Maps old Column IDs to New Column IDs in Relations and Row Data.
 */
export const rehydrateTableFromLibrary = (payload: Table): Table => {
    const idMap = new Map<string, string>();

    // 1. Generate New Table ID
    const newTableId = crypto.randomUUID();
    idMap.set(payload.id, newTableId);

    // 2. Map Columns (Old -> New)
    const newColumns: Column[] = payload.columns.map(col => {
        const newColId = crypto.randomUUID();
        idMap.set(col.id, newColId);
        return { ...col, id: newColId };
    });

    // 3. Map Rows & Data Cells
    const newRows: VocabRow[] = payload.rows.map((row, index) => {
        const newRowId = crypto.randomUUID();
        // Note: We don't necessarily need to map Row IDs for relations unless relations point to rows (which they don't in Vmind schema).
        // Relations point to Columns.
        
        const newCols: Record<string, string> = {};
        Object.entries(row.cols).forEach(([oldColId, value]) => {
            const newColId = idMap.get(oldColId);
            if (newColId) {
                newCols[newColId] = value;
            }
        });

        return {
            ...row,
            id: newRowId,
            cols: newCols,
            rowIdNum: index + 1, // Reset auto-increment
        };
    });

    // 4. Map Relations & Designs
    const newRelations: Relation[] = payload.relations.map(rel => {
        const newRelId = crypto.randomUUID();
        
        // Map Column References
        const newQuestionIds = rel.questionColumnIds.map(id => idMap.get(id)).filter(Boolean) as string[];
        const newAnswerIds = rel.answerColumnIds.map(id => idMap.get(id)).filter(Boolean) as string[];
        
        // Deep copy design to modify
        const newDesign = rel.design ? JSON.parse(JSON.stringify(rel.design)) : undefined;
        
        if (newDesign) {
            // Remap Typography Keys
            const remapTypography = (typoMap: Record<string, any>) => {
                const newTypoMap: Record<string, any> = {};
                Object.entries(typoMap).forEach(([key, style]) => {
                    const newKey = idMap.get(key) || key; // If key is colId, map it. If it's a text box ID, keep it.
                    newTypoMap[newKey] = style;
                });
                return newTypoMap;
            };

            if (newDesign.front.typography) newDesign.front.typography = remapTypography(newDesign.front.typography);
            if (newDesign.back.typography) newDesign.back.typography = remapTypography(newDesign.back.typography);

            // Remap Element Order
            const remapOrder = (order: string[]) => {
                return order.map(id => idMap.get(id) || id); // Map colIds, keep text box IDs
            };
            
            if (newDesign.front.elementOrder) newDesign.front.elementOrder = remapOrder(newDesign.front.elementOrder);
            if (newDesign.back.elementOrder) newDesign.back.elementOrder = remapOrder(newDesign.back.elementOrder);
        }
        
        // Map AI Prompts references in relation? (Relations don't store prompts, Tables do)
        
        return {
            ...rel,
            id: newRelId,
            questionColumnIds: newQuestionIds,
            answerColumnIds: newAnswerIds,
            design: newDesign
        };
    });

    // 5. Map AI Prompts
    const newAiPrompts = (payload.aiPrompts || []).map(prompt => {
        return {
            ...prompt,
            id: crypto.randomUUID(),
            targetColumnId: idMap.get(prompt.targetColumnId) || prompt.targetColumnId,
            sourceColumnIds: prompt.sourceColumnIds.map(id => idMap.get(id) || id)
        };
    });

    // 6. Map Image/Audio Config
    let newImageConfig = undefined;
    if (payload.imageConfig) {
        newImageConfig = {
            imageColumnId: idMap.get(payload.imageConfig.imageColumnId) || '',
            sourceColumnId: idMap.get(payload.imageConfig.sourceColumnId) || '',
        };
    }
    
    // 7. Map URL Templates
    const newUrlTemplates: Record<string, string> = {};
    if (payload.columnUrlTemplates) {
         Object.entries(payload.columnUrlTemplates).forEach(([oldId, template]) => {
             const newId = idMap.get(oldId);
             if (newId) newUrlTemplates[newId] = template;
         });
    }

    return {
        ...payload,
        id: newTableId,
        columns: newColumns,
        rows: newRows,
        relations: newRelations,
        aiPrompts: newAiPrompts,
        imageConfig: newImageConfig,
        columnUrlTemplates: newUrlTemplates,
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        // Reset external pointers
        tagIds: [], 
        tags: [],
        ankiConfig: payload.ankiConfig // Keep default Anki config if exists
    };
};
