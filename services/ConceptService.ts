import { supabase } from './supabaseClient';
import { Concept, ConceptLevel } from '../types';

export class ConceptService {
    // ==================== Helper Methods ====================

    private static mapConceptRow(row: any): Concept {
        return {
            id: row.id,
            code: row.code,
            name: row.name,
            description: row.description || undefined,
            parentId: row.parent_id || undefined,
            isFolder: row.is_folder || false,
            createdAt: row.created_at,
            modifiedAt: row.modified_at
        };
    }

    private static mapLevelRow(row: any): ConceptLevel {
        return {
            id: row.id,
            conceptId: row.concept_id,
            name: row.name,
            order: row.order,
            description: row.description || undefined,
            createdAt: row.created_at
        };
    }

    // ==================== Concept CRUD ====================

    static async fetchConcepts(userId: string): Promise<Concept[]> {
        const { data, error } = await supabase
            .from('concepts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(this.mapConceptRow);
    }

    static async createConcept(concept: Omit<Concept, 'id' | 'createdAt' | 'modifiedAt'>, userId: string): Promise<Concept> {
        const { data, error } = await supabase
            .from('concepts')
            .insert({
                code: concept.code,
                name: concept.name,
                description: concept.description,
                parent_id: concept.parentId,
                is_folder: concept.isFolder,
                user_id: userId
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapConceptRow(data);
    }

    static async updateConcept(id: string, updates: Partial<Concept>): Promise<Concept> {
        const updateData: any = {
            modified_at: Date.now()
        };

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.code !== undefined) updateData.code = updates.code;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;
        if (updates.isFolder !== undefined) updateData.is_folder = updates.isFolder;

        const { data, error } = await supabase
            .from('concepts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapConceptRow(data);
    }

    static async deleteConcept(id: string): Promise<void> {
        const { error } = await supabase
            .from('concepts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // ==================== Level CRUD ====================

    static async fetchAllLevels(userId: string): Promise<ConceptLevel[]> {
        const { data, error } = await supabase
            .from('concept_levels')
            .select(`
                *,
                concepts!inner(user_id)
            `)
            .eq('concepts.user_id', userId)
            .order('order', { ascending: true });

        if (error) throw error;

        return (data || []).map(this.mapLevelRow);
    }

    static async fetchLevelsByConcept(conceptId: string): Promise<ConceptLevel[]> {
        const { data, error } = await supabase
            .from('concept_levels')
            .select('*')
            .eq('concept_id', conceptId)
            .order('order', { ascending: true });

        if (error) throw error;

        return (data || []).map(this.mapLevelRow);
    }

    static async createLevel(level: Omit<ConceptLevel, 'id' | 'createdAt'>): Promise<ConceptLevel> {
        const { data, error } = await supabase
            .from('concept_levels')
            .insert({
                concept_id: level.conceptId,
                name: level.name,
                order: level.order,
                description: level.description
            })
            .select()
            .single();

        if (error) throw error;
        return this.mapLevelRow(data);
    }

    static async updateLevel(id: string, updates: Partial<ConceptLevel>): Promise<ConceptLevel> {
        const updateData: any = {};

        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.order !== undefined) updateData.order = updates.order;
        if (updates.description !== undefined) updateData.description = updates.description;

        const { data, error } = await supabase
            .from('concept_levels')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return this.mapLevelRow(data);
    }

    static async deleteLevel(id: string): Promise<void> {
        const { error } = await supabase
            .from('concept_levels')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
}
