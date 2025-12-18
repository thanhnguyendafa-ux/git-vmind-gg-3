import { create } from 'zustand';
import { ContextLink } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useTableStore } from './useTableStore';

interface ContextLinkState {
  contextLinks: ContextLink[];
  setContextLinks: (links: ContextLink[]) => void;
  addContextLink: (link: Omit<ContextLink, 'id' | 'createdAt'>) => Promise<boolean>;
  deleteContextLinksForRow: (rowId: string) => Promise<boolean>;
  fetchLinksForNote: (noteId: string) => Promise<void>;
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

        // Use Sync Engine to respect queue order (Fixes FK constraints for new rows)
        VmindSyncEngine.getInstance().push('UPSERT_CONTEXT_LINK', { link: newLink }, session.user.id);
        return true;
      },

      deleteContextLinksForRow: async (rowId) => {
        // This is a placeholder for future functionality, not implemented in this phase.
        // In a full implementation, you would optimistically update and then call supabase.delete().
        return true;
      },

      fetchLinksForNote: async (noteId) => {
          const { session, isGuest } = useUserStore.getState();
          if (isGuest || !session) return;

          try {
              // 1. Fetch links AND the table_id of the associated row
              // This requires a join on vocab_rows.
              const { data, error } = await supabase
                  .from('context_links')
                  .select('*, vocab_rows(table_id)')
                  .eq('source_id', noteId)
                  .eq('source_type', 'reading');

              if (error) throw error;
              
              if (data && data.length > 0) {
                  const fetchedLinks: ContextLink[] = data.map((d: any) => ({
                      id: d.id,
                      rowId: d.row_id,
                      sourceType: d.source_type,
                      sourceId: d.source_id,
                      metadata: d.metadata,
                      createdAt: new Date(d.created_at).getTime(),
                  }));

                  // 2. Merge into store (avoid duplicates)
                  set(state => {
                      const existingIds = new Set(state.contextLinks.map(l => l.id));
                      const newLinks = fetchedLinks.filter(l => !existingIds.has(l.id));
                      return { contextLinks: [...state.contextLinks, ...newLinks] };
                  });

                  // 3. Hydrate Tables (Dependency Resolution)
                  // Identify which tables these rows belong to
                  const tableIdsToLoad = new Set<string>();
                  data.forEach((d: any) => {
                      if (d.vocab_rows && d.vocab_rows.table_id) {
                          tableIdsToLoad.add(d.vocab_rows.table_id);
                      }
                  });

                  // Check if those tables are loaded in useTableStore
                  const { tables, fetchTablePayload, loadingTableIds } = useTableStore.getState();
                  
                  tableIdsToLoad.forEach(tableId => {
                      const table = tables.find(t => t.id === tableId);
                      // If table exists but has no rows (metadata only), and isn't currently loading
                      if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                          console.log(`[JIT] Hydrating table ${table.name} for Reading Note context...`);
                          fetchTablePayload(tableId);
                      }
                  });
              }
          } catch (e) {
              console.error("Failed to fetch context links for note:", e);
          }
      }
    })
);