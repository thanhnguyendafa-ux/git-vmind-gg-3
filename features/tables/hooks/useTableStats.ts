
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTableStore } from '../../../stores/useTableStore';
import { getLevel } from '../../../utils/priorityScore';

/**
 * A memoized selector hook to calculate global statistics across all tables.
 * This prevents expensive recalculations in multiple components.
 * It uses a stable "signature" of the data to control re-computation.
 */
export const useTableStats = () => {
    const { tables, folders } = useTableStore(useShallow(state => ({
        tables: state.tables,
        folders: state.folders,
    })));

    // Create a stable signature of the data that only changes when counts or relations change.
    // This is the key to preventing re-runs of useMemo on every minor data update.
    const tablesSignature = React.useMemo(() => {
        // This signature is intentionally simple to avoid re-calculating on every stat change.
        // wordsMastered might be slightly stale but will update on row count changes, which is an acceptable trade-off.
        return JSON.stringify(
            tables.map(t => ({
                id: t.id,
                rowCount: t.rowCount ?? t.rows.length
            }))
        );
    }, [tables]);

    const stats = React.useMemo(() => {
        const allRows = tables.flatMap(t => t.rows);

        const wordsMastered = allRows.filter(r => getLevel(r) === 6).length;
        const totalWords = tables.reduce((acc, t) => acc + (t.rowCount ?? t.rows.length), 0);
        const totalFolders = folders.length;
        const totalRelations = tables.reduce((acc, t) => acc + (t.relations?.length || 0), 0);

        return {
            wordsMastered,
            totalWords,
            totalFolders,
            totalRelations,
        };
    // The dependency array uses the stable signature.
    // We include `tables` itself so `wordsMastered` calculation can access the full row data.
    }, [tablesSignature, folders.length, tables]); 

    return stats;
};
