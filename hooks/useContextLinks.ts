import { useMemo } from 'react';
import { VocabRow, ContextLink } from '../types';
import { useTableStore } from '../stores/useTableStore';
import { useContextLinkStore } from '../stores/useContextLinkStore';

/**
 * A hook that provides backward compatibility for context links.
 * It fetches links from the new normalized store and also transforms
 * any links still stored in the old VocabRow.contextLinks format.
 * @param rowId The ID of the vocabulary row.
 * @returns An array of context links in the new, normalized format.
 */
export const useContextLinks = (rowId: string | undefined): ContextLink[] => {
    const { tables } = useTableStore();
    const { contextLinks: newFormatLinks } = useContextLinkStore();

    return useMemo(() => {
        if (!rowId) return [];
        
        // 1. Get links from the new normalized store
        const linksFromStore = newFormatLinks.filter(link => link.rowId === rowId);

        // 2. Find the row to check for old format links
        let row: VocabRow | undefined;
        for (const table of tables) {
            const foundRow = table.rows.find(r => r.id === rowId);
            if (foundRow) {
                row = foundRow;
                break;
            }
        }
        
        // 3. Transform old format links to new format for display
        const linksFromOldFormat: ContextLink[] = [];
        if (row && row.contextLinks) {
            for (const oldLink of row.contextLinks) {
                linksFromOldFormat.push({
                    id: `old-${row.id}-${oldLink.noteId}-${oldLink.timestamp || 0}`,
                    rowId: row.id,
                    sourceType: oldLink.type,
                    sourceId: oldLink.noteId,
                    metadata: {
                        snippet: oldLink.snippet,
                        timestamp: oldLink.timestamp,
                    },
                    createdAt: 0, // Not available in old format
                });
            }
        }
        
        // 4. Combine and de-duplicate (preferring new format links)
        const combined = [...linksFromStore, ...linksFromOldFormat];
        const uniqueLinks = new Map<string, ContextLink>();
        
        combined.forEach(link => {
            // A simple unique key based on source
            const key = `${link.sourceType}-${link.sourceId}-${link.metadata.timestamp || 0}`;
            if (!uniqueLinks.has(key)) {
                uniqueLinks.set(key, link);
            }
        });

        return Array.from(uniqueLinks.values());

    }, [rowId, tables, newFormatLinks]);
};