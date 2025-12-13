
import { supabase } from './supabaseClient';
import { ConfidenceProgress, AnkiProgress, StudyProgress } from '../types';

export const migrateUserData = async (userId: string, userProfile: any) => {
    if (!userProfile) return;

    // Check if migration is needed (if new tables are empty but profile has data)
    const { count } = await supabase.from('study_sets').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    
    if (count && count > 0) {
        console.log("Migration skipped: Data already exists in study_sets.");
        return;
    }

    console.log("Starting Data Migration...");

    // 1. Migrate Confidence Progress
    const confidenceProgresses: ConfidenceProgress[] = userProfile.confidenceProgresses || [];
    for (const p of confidenceProgresses) {
        // Insert Set Metadata
        const { data: set, error: setError } = await supabase.from('study_sets').insert({
            id: p.id,
            user_id: userId,
            name: p.name,
            type: 'confidence',
            settings: {
                tableIds: p.tableIds,
                relationIds: p.relationIds,
                tags: p.tagIds || p.tags || [],
                intervalConfig: p.intervalConfig,
                currentIndex: p.currentIndex, // Save current index in settings for now
                newWordCount: p.newWordCount
            },
            created_at: new Date(p.createdAt).toISOString()
        }).select().single();

        if (setError) {
            console.error("Failed to migrate set:", p.name, setError);
            continue;
        }

        // Insert Items (Queue & Status)
        // We map the queue array and cardStates map into individual items
        const itemsToInsert = [];
        
        // 1. Add items from Queue (preserves order via created_at if needed, but we rely on array order in app)
        // For database, we just dump them. The app might need to reconstruct the queue order.
        // In this simplified migration, we mark them as 'due' or 'learning' based on existence in cardStates.
        
        const uniqueRowIds = new Set([...p.queue, ...Object.keys(p.cardStates || {})]);

        for (const rowId of uniqueRowIds) {
            const status = p.cardStates?.[rowId] || 'New';
            itemsToInsert.push({
                set_id: set.id,
                row_id: rowId,
                status: status,
                data: {
                    isInQueue: p.queue.includes(rowId)
                }
            });
        }

        if (itemsToInsert.length > 0) {
            const { error: itemsError } = await supabase.from('study_items').insert(itemsToInsert);
            if (itemsError) console.error("Failed to migrate items for set:", p.name, itemsError);
        }
    }

    // 2. Migrate Anki Progress
    const ankiProgresses: AnkiProgress[] = userProfile.ankiProgresses || [];
    for (const p of ankiProgresses) {
         const { data: set, error: setError } = await supabase.from('study_sets').insert({
            id: p.id,
            user_id: userId,
            name: p.name,
            type: 'anki',
            settings: {
                tableIds: p.tableIds,
                relationIds: p.relationIds,
                tags: p.tagIds || p.tags || [],
                ankiConfig: p.ankiConfig
            },
            created_at: new Date(p.createdAt).toISOString()
        }).select().single();

        if (setError) continue;

        // Note: Anki items are usually derived from table rows dynamically in the old app.
        // Only explicit state overrides might need migration if we tracked them.
        // If Anki state was stored on VocabRow.stats (which it is), we don't need to migrate Items here,
        // as VocabRow is already a separate table.
    }

    // 3. Migrate Study Queues
    const studyProgresses: StudyProgress[] = userProfile.studyProgresses || [];
    for (const p of studyProgresses) {
         const { data: set, error: setError } = await supabase.from('study_sets').insert({
            id: p.id,
            user_id: userId,
            name: p.name,
            type: 'queue',
            settings: {
                studySettings: p.settings,
                currentIndex: p.currentIndex
            },
            created_at: new Date(p.createdAt).toISOString()
        }).select().single();
        
        if (setError) continue;

        const itemsToInsert = p.queue.map((q, index) => ({
            set_id: set.id,
            row_id: q.rowId, // Assuming Question object has rowId
            data: {
                questionSnapshot: q, // Store full question logic
                sortOrder: index
            }
        }));

        if (itemsToInsert.length > 0) {
            await supabase.from('study_items').insert(itemsToInsert);
        }
    }

    console.log("Migration completed.");
};
