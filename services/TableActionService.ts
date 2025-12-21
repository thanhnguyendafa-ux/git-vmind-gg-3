import { useTableStore } from '../stores/useTableStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';

export const TableActionService = {
    /**
     * Identifies which Confidence Sets would be affected (deleted) if a table is deleted.
     */
    getAffectedConfidenceSets: (tableId: string) => {
        const { confidenceProgresses } = useSessionDataStore.getState();
        return confidenceProgresses.filter(p => p.tableIds.includes(tableId));
    },

    /**
     * Checks if a table has any rows linked to Concepts (Kanban Board).
     * Note: This relies on rows being loaded in the store.
     */
    hasLinkedConcepts: (tableId: string) => {
        const { tables } = useTableStore.getState();
        const table = tables.find(t => t.id === tableId);
        if (!table) return false;

        // Check if any row has a conceptLevelId
        return table.rows.some(r => !!r.conceptLevelId);
    },

    /**
     * Generates a warning message for table deletion based on dependencies.
     */
    getDeleteWarning: (tableId: string, tableName: string) => {
        const affectedSets = TableActionService.getAffectedConfidenceSets(tableId);
        const hasConcepts = TableActionService.hasLinkedConcepts(tableId);

        let msg = "";

        if (affectedSets.length > 0) {
            const list = affectedSets.slice(0, 3).map(s => `• ${s.name}`).join('\n');
            const more = affectedSets.length > 3 ? `\n...and ${affectedSets.length - 3} more.` : '';
            msg += `This table is used by ${affectedSets.length} Confidence Set(s). Deleting it will also PERMANENTLY delete these sets:\n\n${list}${more}\n\n`;
        }

        if (hasConcepts) {
            msg += "⚠️ Warning: This table contains cards linked to Concept Links. Deleting it will remove those cards from the Kanban board.";
        }

        if (!msg) {
            return `Are you sure you want to permanently delete "${tableName}" and all its words?`;
        }

        return msg;
    },

    /**
     * Performs a cascading delete of a table and its dependent resources.
     */
    deleteTableWithDependencies: async (tableId: string) => {
        const affectedConfidenceSets = TableActionService.getAffectedConfidenceSets(tableId);
        const { deleteConfidenceProgress } = useSessionDataStore.getState();
        const { deleteTable } = useTableStore.getState();

        // 1. Cascading Delete: Remove dependent Confidence Sets
        if (affectedConfidenceSets.length > 0) {
            for (const set of affectedConfidenceSets) {
                await deleteConfidenceProgress(set.id);
            }
        }

        // 2. Delete the Table
        await deleteTable(tableId);
    },

    /**
     * Selector helper to filter tables that are not in any folder.
     */
    getUncategorizedTables: (tables: any[], folders: any[]) => {
        const tablesInFolders = new Set(folders.flatMap(f => f.tableIds));
        return tables.filter(t => !tablesInFolders.has(t.id));
    }
};
