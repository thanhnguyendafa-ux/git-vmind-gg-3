
import { useMemo } from 'react';
import { useTableStore } from '../stores/useTableStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';
import { Table, ConfidenceProgress } from '../types';

export const useDependencyGraph = () => {
  const tables = useTableStore(state => state.tables);
  const confidenceProgresses = useSessionDataStore(state => state.confidenceProgresses);

  return useMemo(() => {
    // 1. Initialize Map
    const usedBy: Record<string, ConfidenceProgress[]> = {};
    const dependsOn: Record<string, Table[]> = {};

    // 2. Build "Used By" (Table -> Sets)
    // Initialize empty arrays for all tables to ensure safe access
    tables.forEach(t => {
      usedBy[t.id] = [];
    });

    // 3. Build "Depends On" (Set -> Tables)
    confidenceProgresses.forEach(progress => {
      dependsOn[progress.id] = [];
      
      progress.tableIds.forEach(tableId => {
        // Link Table -> Set
        if (!usedBy[tableId]) usedBy[tableId] = [];
        // Prevent duplicates
        if (!usedBy[tableId].some(p => p.id === progress.id)) {
            usedBy[tableId].push(progress);
        }

        // Link Set -> Table
        const table = tables.find(t => t.id === tableId);
        if (table) {
            dependsOn[progress.id].push(table);
        }
      });
    });

    return { usedBy, dependsOn };
  }, [tables, confidenceProgresses]);
};
