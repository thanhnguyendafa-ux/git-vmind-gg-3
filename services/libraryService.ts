
import { supabase } from './supabaseClient';
import { LibraryItem, Table } from '../types';
import { sanitizeTableForPublish } from '../utils/libraryUtils';

export const fetchLibraryItems = async (): Promise<LibraryItem[]> => {
    const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as LibraryItem[];
};

export const fetchMyLibraryItems = async (userId: string): Promise<LibraryItem[]> => {
    const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as LibraryItem[];
};

export const updateLibraryItem = async (
    itemId: string, 
    updates: { title?: string, description?: string, tags?: string[] }
): Promise<void> => {
    const { error } = await supabase
        .from('library_items')
        .update(updates)
        .eq('id', itemId);

    if (error) throw error;
};

export const deleteLibraryItem = async (itemId: string): Promise<void> => {
    const { error } = await supabase
        .from('library_items')
        .delete()
        .eq('id', itemId);

    if (error) throw error;
};

/**
 * Removes a published item from the library based on the ID of the original table.
 * Used when unpublishing from the Workspace view.
 */
export const unpublishTableByOriginalId = async (tableId: string, userId: string): Promise<void> => {
    // We filter by author_id for security (RLS handles this usually, but explicit is good)
    // and filter the JSONB payload for the matching ID.
    const { error } = await supabase
        .from('library_items')
        .delete()
        .eq('author_id', userId)
        .eq('payload->>id', tableId);

    if (error) throw error;
};

export const publishTable = async (
    table: Table, 
    metadata: { title: string, description: string, tags: string[], authorName: string },
    userId: string
): Promise<void> => {
    const payload = sanitizeTableForPublish(table);

    const item: Partial<LibraryItem> = {
        author_id: userId,
        author_name: metadata.authorName,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        payload: payload,
        stats: { downloads: 0, likes: 0 },
        version: '1.0'
    };

    const { error } = await supabase.from('library_items').insert(item);
    if (error) throw error;
};

export const incrementDownloadCount = async (itemId: string): Promise<void> => {
    // Attempting a direct RPC call is best practice for atomic increments
    try {
        await supabase.rpc('increment_library_download', { row_id: itemId });
    } catch (e) {
        // Fallback or ignore
        console.warn("Could not increment download count", e);
    }
};
