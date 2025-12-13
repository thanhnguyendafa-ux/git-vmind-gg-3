
import * as React from 'react';
import { Table, VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { getPriorityScore, getRankPoint, getLevel, getTotalAttempts, getSuccessRate } from '../../../utils/priorityScore';

interface GalleryViewProps {
    table: Table;
    rows: VocabRow[];
    groupedRows: Map<string, VocabRow[]> | null;
    onEditRow: (row: VocabRow) => void;
    visibleColumns: Set<string>;
    visibleStats: Set<string>;
    sortableStats: { key: string, label: string }[];
    fontSize: 'sm' | 'base' | 'lg';
}

const getStatDisplayValue = (row: VocabRow, statKey: string, maxInQueue: number): string | number => {
    const stats = row.stats;
    switch (statKey) {
        case 'stat:priorityScore': return getPriorityScore(row, maxInQueue).toFixed(2);
        case 'stat:rankPoint': return getRankPoint(row);
        case 'stat:level': return getLevel(row);
        case 'stat:failed': return stats.incorrect || 0;
        case 'stat:totalAttempts': return getTotalAttempts(row);
        case 'stat:lastPracticeDate': return stats.lastPracticeDate ? new Date(stats.lastPracticeDate).toLocaleDateString() : 'Never';
        case 'stat:wasQuit': return stats.wasQuit ? 'Yes' : 'No';
        case 'stat:inQueueCount': return stats.inQueueCount || 0;
        case 'stat:successRate': return `${Math.round(getSuccessRate(row) * 100)}%`;
        case 'stat:encounters': return getTotalAttempts(row);
        case 'stat:lastStudied': return stats.lastStudied ? new Date(stats.lastStudied).toLocaleDateString() : 'Never';
        case 'stat:ankiRepetitions': return stats.ankiRepetitions ?? '—';
        case 'stat:ankiEaseFactor': return stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '—';
        case 'stat:ankiInterval': return stats.ankiInterval ? `${stats.ankiInterval}d` : '—';
        case 'stat:ankiDueDate': return stats.ankiDueDate ? new Date(stats.ankiDueDate).toISOString().split('T')[0] : '—';
        case 'stat:confiViewed': return stats.confiViewed ?? 0;
        default: return '';
    }
};

const GalleryCard: React.FC<{ row: VocabRow; table: Table; onEdit: () => void; visibleColumns: Set<string>; visibleStats: Set<string>; sortableStats: { key: string, label: string }[]; fontSize: 'sm' | 'base' | 'lg'; maxInQueue: number }> = ({ row, table, onEdit, visibleColumns, visibleStats, sortableStats, fontSize, maxInQueue }) => {
    const imageColumnId = table.imageConfig?.imageColumnId;
    const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;
    
    const fontSizeClasses = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
    }[fontSize];

    return (
        <div onClick={onEdit} className="bg-surface dark:bg-secondary-800 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all group relative cursor-pointer flex flex-col h-full border border-border dark:border-secondary-700">
            {imageUrl && visibleColumns.has(imageColumnId!) && (
                <div className="h-32 bg-secondary-100 dark:bg-secondary-700 rounded-t-2xl overflow-hidden">
                    <img src={imageUrl} alt="" className="w-full h-full object-contain"/>
                </div>
            )}
            <div className="p-4 flex-grow">
                <ul className="space-y-2">
                    {table.columns
                        .filter(col => visibleColumns.has(col.id))
                        .map(col => {
                        if (col.id === imageColumnId) return null;
                        return (
                            <li key={col.id}>
                                <p className="text-xs font-bold text-text-subtle uppercase tracking-wider">{col.name}</p>
                                <p className={`${fontSizeClasses} text-text-main dark:text-secondary-300 truncate font-medium`}>{row.cols[col.id] || '—'}</p>
                            </li>
                        );
                    })}
                </ul>
            </div>
            {visibleStats.size > 0 && (
                <div className="p-4 pt-0 border-t border-secondary-200 dark:border-secondary-700/50 mt-auto">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-3">
                        {sortableStats.filter(s => visibleStats.has(s.key)).map(stat => (
                            <div key={stat.key}>
                                <p className="text-[10px] font-bold text-text-subtle uppercase">{stat.label}</p>
                                <p className="text-xs text-text-main dark:text-secondary-200">{getStatDisplayValue(row, stat.key, maxInQueue)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <button className="absolute top-2 right-2 p-2 rounded-full bg-white/80 dark:bg-secondary-900/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:text-primary-500" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Icon name="pencil" className="w-4 h-4"/>
            </button>
        </div>
    );
};

const GalleryView: React.FC<GalleryViewProps> = ({ table, rows, groupedRows, onEditRow, visibleColumns, visibleStats, sortableStats, fontSize }) => {
    
    const maxInQueue = React.useMemo(() => Math.max(1, ...rows.map(r => r.stats.inQueueCount || 0)), [rows]);

    if (rows.length === 0) {
        return (
            <div className="text-center p-12 text-text-subtle bg-surface dark:bg-secondary-800/50 shadow-lg rounded-2xl border border-dashed border-secondary-300 dark:border-secondary-700">
                <Icon name="filter" className="w-12 h-12 mx-auto mb-2 text-secondary-300 dark:text-secondary-600"/>
                <p>No cards match your current filters.</p>
            </div>
        );
    }
    
    const renderContent = () => {
        if (groupedRows) {
            return Array.from(groupedRows.entries()).map(([groupName, groupRows]) => (
                <div key={groupName}>
                    <h3 className="text-lg font-bold text-text-main dark:text-secondary-200 mt-6 mb-3 px-1 sticky top-0 bg-background/95 py-2 z-10 backdrop-blur-sm">{groupName} ({groupRows.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {groupRows.map(row => <GalleryCard key={row.id} row={row} table={table} onEdit={() => onEditRow(row)} visibleColumns={visibleColumns} visibleStats={visibleStats} sortableStats={sortableStats} fontSize={fontSize} maxInQueue={maxInQueue} />)}
                    </div>
                </div>
            ));
        }
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {rows.map(row => <GalleryCard key={row.id} row={row} table={table} onEdit={() => onEditRow(row)} visibleColumns={visibleColumns} visibleStats={visibleStats} sortableStats={sortableStats} fontSize={fontSize} maxInQueue={maxInQueue} />)}
            </div>
        );
    };

    return <div className="p-4 h-full overflow-y-auto">{renderContent()}</div>;
};

export default GalleryView;
