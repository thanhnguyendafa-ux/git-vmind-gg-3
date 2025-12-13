import { create } from 'zustand';
import { ContextLink } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';

interface ContextLinkState {
  contextLinks: ContextLink[];
  setContextLinks: (links: ContextLink[]) => void;
  addContextLink: (link: Omit<ContextLink, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteContextLinksForRow: (rowId: string) => Promise<boolean>;
}

export const useContextLinkStore = create<ContextLinkState>()(
    (set, get) => ({
      contextLinks: [],
      setContextLinks: (links) => set({ contextLinks: links }),
      
      addContextLink: async (linkData) => {
        const { session, isGuest } = useUserStore.getState();
        const newLink: ContextLink = {
            id: crypto.randomUUID(),
            ...linkData,
            createdAt: Date.now(),
        };

        // Optimistic update
        set(state => ({ contextLinks: [...state.contextLinks, newLink] }));
        
        if (isGuest || !session) return true;

        try {
            const { rowId, sourceType, sourceId, metadata, createdAt } = newLink;
            const linkForDb = {
                id: newLink.id,
                user_id: session.user.id,
                row_id: rowId,
                source_type: sourceType,
                source_id: sourceId,
                metadata,
                created_at: new Date(createdAt).toISOString(),
            };
            const { error } = await supabase.from('context_links').insert(linkForDb);
            if (error) throw error;
            return true;
        } catch(error: any) {
            console.error("Failed to create context link:", error.message || error);
            // Revert on error
            set(state => ({ contextLinks: state.contextLinks.filter(l => l.id !== newLink.id) }));
            useUIStore.getState().showToast("Failed to save context link.", "error");
            return false;
        }
      },

      deleteContextLinksForRow: async (rowId) => {
        // This is a placeholder for future functionality, not implemented in this phase.
        // In a full implementation, you would optimistically update and then call supabase.delete().
        return true;
      },
    })
);