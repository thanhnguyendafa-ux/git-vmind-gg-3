import { supabase } from './supabaseClient';
import { migrateUserData } from './migrationService';
import { Table, Relation, VocabRow } from '../types';

export const normalizeServerTable = (serverObj: any): Table => {
    const relationsData = serverObj.relations as any[];
    const relations: Relation[] = (Array.isArray(relationsData) ? relationsData : [])
        .filter((r): r is object & { id: string; name: string } => r && typeof r === 'object' && r.id && r.name)
        .map((r: any): Relation => ({
            id: r.id,
            name: r.name,
            questionColumnIds: r.question_column_ids ?? r.questionColumnIds ?? [],
            answerColumnIds: r.answer_column_ids ?? r.answerColumnIds ?? [],
            answerFormula: r.answer_formula ?? r.answerFormula,
            targetLabel: r.target_label ?? r.targetLabel,
            compatibleModes: r.compatible_modes ?? r.compatibleModes ?? [],
            design: (r.design && r.design.front && r.design.back) ? r.design : undefined,
            tags: Array.isArray(r.tags) ? r.tags : [],
            audioConfig: r.audio_config ?? r.audioConfig,
            displayTiers: r.displayTiers,
            scrambleConfig: r.scrambleConfig,
            clozeConfig: r.clozeConfig,
            dictationConfig: r.dictationConfig,
            promptType: r.promptType,
            customPromptText: r.customPromptText,
            interactionType: r.interactionType,
            interactionModes: r.interactionModes,
            interactionConfig: r.interactionConfig,
            speedModeDefault: r.speedModeDefault,
        }));

    return {
        id: serverObj.id,
        name: serverObj.name || 'Untitled Table',
        columns: Array.isArray(serverObj.columns) ? serverObj.columns : [],
        rows: [] as VocabRow[], // Explicitly initialize empty rows for Metadata First strategy
        rowCount: serverObj.vocab_rows?.[0]?.count ?? serverObj.rowCount ?? 0,
        relations: relations,
        imageConfig: serverObj.image_config ?? serverObj.imageConfig,
        columnAudioConfig: serverObj.column_audio_config ?? serverObj.columnAudioConfig,
        aiPrompts: serverObj.ai_prompts ?? serverObj.aiPrompts,
        description: serverObj.description,
        tagIds: serverObj.tag_ids ?? serverObj.tagIds ?? [],
        tags: serverObj.tags ?? [],
        isPublic: serverObj.is_public ?? serverObj.isPublic,
        createdAt: serverObj.created_at ? new Date(serverObj.created_at).getTime() : undefined,
        modifiedAt: serverObj.modified_at ? new Date(serverObj.modified_at).getTime() : undefined,
        ankiConfig: serverObj.anki_config ?? serverObj.ankiConfig,
        viewConfig: serverObj.view_settings ?? serverObj.viewConfig, // Map backend view_settings to frontend viewConfig
        columnUrlTemplates: serverObj.column_url_templates ?? serverObj.columnUrlTemplates, // Map backend column_url_templates
    } as Table;
};

export const fetchUserData = async (userId: string) => {
    const [
        profileRes,
        tablesRes,
        foldersRes,
        notesRes,
        dictationNotesRes,
        contextLinksRes,
        studySetsRes,
        conceptsRes,
        conceptLevelsRes,
    ] = await Promise.all([
        supabase.from('profiles').select('user_profile').eq('id', userId).single(),
        supabase.from('tables').select('*, vocab_rows(count)').eq('user_id', userId),
        supabase.from('folders').select('*').eq('user_id', userId),
        supabase.from('notes_metadata').select('*').eq('user_id', userId),
        supabase.from('dictation_metadata').select('*').eq('user_id', userId),
        supabase.from('context_links').select('*').eq('user_id', userId),
        supabase.from('study_sets').select('*').eq('user_id', userId),
        supabase.from('concepts').select('*').eq('user_id', userId),
        supabase.from('concept_levels').select('*').eq('user_id', userId),
    ]);

    if (profileRes.error && profileRes.status !== 406) throw profileRes.error;
    if (tablesRes.error) throw tablesRes.error;
    if (foldersRes.error) throw foldersRes.error;
    if (notesRes.error) throw notesRes.error;
    if (dictationNotesRes.error) throw dictationNotesRes.error;
    if (contextLinksRes.error) throw contextLinksRes.error;
    if (studySetsRes.error) throw studySetsRes.error;
    if (conceptsRes.error) throw conceptsRes.error;
    if (conceptLevelsRes.error) throw conceptLevelsRes.error;

    // --- MIGRATION TRIGGER ---
    // If study_sets is empty but profile has data, trigger migration
    const hasOldData = profileRes.data?.user_profile?.confidenceProgresses?.length > 0;
    const hasNewData = studySetsRes.data && studySetsRes.data.length > 0;

    if (hasOldData && !hasNewData) {
        await migrateUserData(userId, profileRes.data?.user_profile);
        // Re-fetch study sets after migration
        const { data: migratedSets } = await supabase.from('study_sets').select('*').eq('user_id', userId);
        studySetsRes.data = migratedSets || [];
    }
    // -------------------------

    return {
        profile: profileRes.data?.user_profile,
        tables: tablesRes.data || [],
        folders: foldersRes.data || [],
        notes: notesRes.data || [],
        dictationNotes: dictationNotesRes.data || [],
        contextLinks: contextLinksRes.data || [],
        studySets: studySetsRes.data || [],
        concepts: conceptsRes.data || [],
        conceptLevels: conceptLevelsRes.data || [],
    };
};
