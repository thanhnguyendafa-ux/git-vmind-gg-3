
import * as React from 'react';
import { VocabRow, Filter, Sort, Table, Column } from '../../../types';
import { useTableView } from '../contexts/TableViewContext';
import { getPriorityScore, getRankPoint, getLevel, getTotalAttempts, getSuccessRate } from '../../../utils/priorityScore';

interface UseProcessedTableDataProps {
  rows: VocabRow[];
  table: Table;
  preFilteredRowIds?: Set<string> | null;
  initialTagFilter?: Set<string> | null;
}

// Helper to extract value for sorting, now accepts maxInQueue
const getSortValue = (row: VocabRow, key: string, maxInQueue: number): string | number => {
    if (key === 'system:rowIdNum') {
        return row.rowIdNum ?? 0;
    }

    if (key.startsWith('stat:')) {
      const statKey = key.split(':')[1];
      const stats = row.stats;
      switch (statKey) {
        case 'successRate': return getSuccessRate(row) * 100;
        case 'encounters': return getTotalAttempts(row);
        case 'lastStudied': return stats.lastStudied || 0;
        case 'ankiRepetitions': return stats.ankiRepetitions ?? 0;
        case 'ankiEaseFactor': return stats.ankiEaseFactor ?? 0;
        case 'ankiInterval': return stats.ankiInterval ?? 0;
        case 'ankiDueDate': return stats.ankiDueDate ?? 0;
        case 'priorityScore': return getPriorityScore(row, maxInQueue);
        case 'rankPoint': return getRankPoint(row);
        case 'level': return getLevel(row);
        case 'failed': return stats.incorrect || 0;
        case 'totalAttempts': return getTotalAttempts(row);
        case 'lastPracticeDate': return stats.lastPracticeDate || 0;
        case 'wasQuit': return stats.wasQuit ? 1 : 0;
        case 'inQueueCount': return stats.inQueueCount || 0;
        case 'confiViewed': return stats.confiViewed || 0;
        default: return 0;
      }
    } else {
      return row.cols[key as string] || '';
    }
};

// Helper to extract a string representation of any cell (column or stat) for filtering
const getCellValueForFiltering = (row: VocabRow, key: string, maxInQueue: number): string => {
    if (key === 'system:rowIdNum') {
        return (row.rowIdNum ?? '').toString();
    }
    if (key.startsWith('stat:')) {
        const statKey = key.split(':')[1];
        const stats = row.stats;
        switch (statKey) {
            case 'successRate': return `${Math.round(getSuccessRate(row) * 100)}%`;
            case 'encounters': return getTotalAttempts(row).toString();
            case 'lastStudied': return stats.lastStudied ? new Date(stats.lastStudied).toLocaleDateString() : '';
            case 'ankiRepetitions': return (stats.ankiRepetitions ?? 0).toString();
            case 'ankiEaseFactor': return stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '';
            case 'ankiInterval': return (stats.ankiInterval ?? 0).toString();
            case 'ankiDueDate': return stats.ankiDueDate ? new Date(stats.ankiDueDate).toLocaleDateString() : '';
            case 'priorityScore': return getPriorityScore(row, maxInQueue).toFixed(2);
            case 'rankPoint': return getRankPoint(row).toString();
            case 'level': return getLevel(row).toString();
            case 'failed': return (stats.incorrect || 0).toString();
            case 'totalAttempts': return getTotalAttempts(row).toString();
            case 'lastPracticeDate': return stats.lastPracticeDate ? new Date(stats.lastPracticeDate).toLocaleDateString() : '';
            case 'wasQuit': return stats.wasQuit ? 'Yes' : 'No';
            case 'inQueueCount': return (stats.inQueueCount || 0).toString();
            case 'confiViewed': return (stats.confiViewed || 0).toString();
            default: return '';
        }
    }
    return row.cols[key] || '';
};

const findTagColumn = (columns: Column[]): Column | undefined => {
    return columns.find(c => /^tags$/i.test(c.name)) || columns.find(c => /^tag$/i.test(c.name));
};

export const useProcessedTableData = ({ rows, table, preFilteredRowIds, initialTagFilter }: UseProcessedTableDataProps) => {
    const { state } = useTableView();
    const { filters, sorts, grouping, searchQuery } = state;

    // 1. Keep a ref to the latest rows data.
    // This allows us to access the latest data inside useEffect for sorting/filtering logic
    // without adding 'rows' to the dependency array, which would trigger re-sorts on every background update.
    const rowsRef = React.useRef(rows);
    rowsRef.current = rows;

    const [orderedIds, setOrderedIds] = React.useState<string[]>([]);

    // Create stable signatures for dependencies to prevent unnecessary re-runs
    // This handles the case where rows update (new reference) but the list of items is identical.
    // It effectively "freezes" the sort order unless the membership changes.
    const rowIdsSignature = React.useMemo(() => {
        return rows.map(r => r.id).sort().join(',');
    }, [rows]);

    const tagFilterSignature = React.useMemo(() => {
        return initialTagFilter ? Array.from(initialTagFilter).sort().join(',') : null;
    }, [initialTagFilter]);
    
    const preFilterSignature = React.useMemo(() => {
        // If preFilteredRowIds is very large, this might be expensive, but it ensures stability.
        // For typical usage (Anki/Flashcard decks), it's acceptable.
        return preFilteredRowIds ? Array.from(preFilteredRowIds).sort().join(',') : null;
    }, [preFilteredRowIds]);


    // 2. The Sticky Sort Effect
    // Calculates the ORDER of rows based on criteria.
    React.useEffect(() => {
        const currentRows = rowsRef.current;
        const maxInQueue = Math.max(1, ...currentRows.map(r => r.stats.inQueueCount || 0));
        
        // 2.1 Initial Filter (Pre-filter & Tag Filter)
        let processed = currentRows;
        
        if (preFilteredRowIds) {
            processed = processed.filter(r => preFilteredRowIds.has(r.id));
        }

        if (initialTagFilter && initialTagFilter.size > 0) {
            const tagColumn = findTagColumn(table.columns);
            const cleanedTags = new Set(Array.from(initialTagFilter).map(tag => tag.startsWith('FC+') ? tag.substring(3).replace(/_/g, ' ') : tag));
            
            processed = processed.filter(row => {
                const allRowTags = new Set(row.tags || []);
                if (tagColumn) {
                    const rowTagsRaw = row.cols[tagColumn.id] || '';
                    rowTagsRaw.split(',').forEach(t => {
                        const trimmed = t.trim();
                        if (trimmed) allRowTags.add(trimmed);
                    });
                }
                if (allRowTags.size === 0) return false;
                for (const requiredTag of cleanedTags) {
                    if (allRowTags.has(requiredTag)) return true;
                }
                return false;
            });
        }

        // 2.2 Search
        if (searchQuery) {
            const lowerCaseQuery = searchQuery.toLowerCase();
            processed = processed.filter(row => 
                Object.values(row.cols).some(cellValue => 
                    String(cellValue).toLowerCase().includes(lowerCaseQuery)
                )
            );
        }

        // 2.3 Column/Stat Filters
        if (filters.length > 0) {
            processed = processed.filter(row => filters.every(filter => {
                const cellValue = getCellValueForFiltering(row, filter.columnId, maxInQueue);
                const filterValue = filter.value;
                switch (filter.condition) {
                    case 'contains': return cellValue.toLowerCase().includes(filterValue.toLowerCase());
                    case 'does-not-contain': return !cellValue.toLowerCase().includes(filterValue.toLowerCase());
                    case 'is': return cellValue.toLowerCase() === filterValue.toLowerCase();
                    case 'is-not': return cellValue.toLowerCase() !== filterValue.toLowerCase();
                    case 'is-empty': return !cellValue;
                    case 'is-not-empty': return !!cellValue;
                    default: return true;
                }
            }));
        }

        // 2.4 Sorting
        if (sorts.length > 0) {
            processed = [...processed].sort((a, b) => {
                for (const sort of sorts) {
                    const valA = getSortValue(a, sort.key, maxInQueue);
                    const valB = getSortValue(b, sort.key, maxInQueue);
                    let comparison = 0;
                    if (typeof valA === 'number' && typeof valB === 'number') {
                        comparison = valA - valB;
                    } else {
                        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
                    }
                    if (comparison !== 0) {
                        return sort.direction === 'asc' ? comparison : -comparison;
                    }
                }
                return 0;
            });
        }

        // Save only the IDs to maintain order stability
        setOrderedIds(processed.map(r => r.id));

    }, [
        // Dependencies that TRIGGER re-sort:
        filters, 
        sorts, 
        grouping, 
        searchQuery, 
        table.id, 
        preFilterSignature, 
        tagFilterSignature,
        rowIdsSignature // Re-sort ONLY if the SET of IDs changes (Add/Delete/Swap), not when stats update.
    ]);

    // 3. Map stable IDs back to live data
    // This runs whenever 'rows' updates (background sync), ensuring cell content is fresh
    // even if the order is "sticky".
    const finalRows = React.useMemo(() => {
        const rowMap = new Map(rows.map(r => [r.id, r]));
        return orderedIds.map(id => rowMap.get(id)).filter((r): r is VocabRow => !!r);
    }, [orderedIds, rows]);
    
    const groupedRows = React.useMemo(() => {
        if (!grouping) return null;
        const groups = new Map<string, VocabRow[]>();
        const ungrouped: VocabRow[] = [];

        finalRows.forEach(row => {
            const groupValue = row.cols[grouping.columnId] || '';
            if (groupValue) {
                if (!groups.has(groupValue)) groups.set(groupValue, []);
                groups.get(groupValue)!.push(row);
            } else {
                ungrouped.push(row);
            }
        });
        if (ungrouped.length > 0) groups.set('(empty)', ungrouped);
        return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
    }, [finalRows, grouping]);

    return { processedRows: finalRows, groupedRows };
};
