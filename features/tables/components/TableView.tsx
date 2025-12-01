
import * as React from 'react';
import { Table, VocabRow, Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useTableView } from '../contexts/TableViewContext';
import { getPriorityScore, getRankPoint, getLevel, getTotalAttempts, getSuccessRate } from '../../../utils/priorityScore';
import RichCell from './RichCell';
import { useVirtualizer } from '@tanstack/react-virtual';
import Popover from '../../../components/ui/Popover';

const MobileRowCard: React.FC<{
    row: VocabRow;
    table: Table;
    visibleCols: Column[];
    isSelected: boolean;
    onViewRow: (row: VocabRow) => void;
    onEditRow: (row: VocabRow) => void;
    onDeleteRow: (row: VocabRow) => void;
    handleSelectRow: (e: React.MouseEvent, rowId: string) => void;
    fontSizeClasses: string;
}> = ({ row, table, visibleCols, isSelected, onViewRow, onEditRow, onDeleteRow, handleSelectRow, fontSizeClasses }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Notion/Airtable Style: Show the first 5 visible columns.
  // The first column is the "Primary" field (Title).
  const primaryCol = visibleCols[0];
  const secondaryCols = visibleCols.slice(1, 5); 

  return (
    <div className={`relative bg-surface dark:bg-secondary-800 rounded-lg shadow-sm border border-border transition-all duration-200 ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'hover:shadow-md'}`}>
      <div className="flex items-start p-3 gap-3">
        {/* Checkbox for selection - Fixed width to prevent shrinking */}
        <div className="pt-1 flex-shrink-0">
          <input 
            type="checkbox" 
            checked={isSelected} 
            onClick={(e) => handleSelectRow(e, row.id)} 
            onChange={() => {}} 
            className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500 bg-surface dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600"
          />
        </div>
        
        {/* Main content area - min-w-0 is CRITICAL here to prevent flex child from overflowing parent */}
        <div onClick={() => onViewRow(row)} className="flex-1 cursor-pointer min-w-0 space-y-3">
            {/* Primary Field - Prominent Display */}
            {primaryCol && (
                <div className="mb-1 min-w-0">
                     <div className="font-bold text-lg text-text-main dark:text-secondary-100 truncate">
                         <RichCell 
                            value={row.cols[primaryCol.id] || 'Untitled'} 
                            column={primaryCol} 
                            table={table} 
                            isTextWrapEnabled={false} 
                            fontSizeClasses="truncate block" 
                        />
                    </div>
                </div>
            )}

            {/* Secondary Fields - Vertical Stack (Airtable Mobile Style) */}
            <div className="flex flex-col gap-2.5">
                {secondaryCols.map((col) => (
                    <div key={col.id} className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-text-subtle text-xs uppercase tracking-wide font-semibold truncate block">{col.name}</span>
                        <div className="text-text-main dark:text-secondary-200 min-w-0">
                            <RichCell 
                                value={row.cols[col.id] || '—'} 
                                column={col} 
                                table={table} 
                                isTextWrapEnabled={false} 
                                fontSizeClasses="text-sm truncate block" 
                            />
                        </div>
                    </div>
                ))}
            </div>

            {visibleCols.length > 5 && (
                <p className="text-xs text-text-subtle italic pt-1">+{visibleCols.length - 5} more fields...</p>
            )}
        </div>
        
        {/* "..." menu for actions - Fixed width */}
        <div className="flex-shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
             <Popover
                isOpen={isMenuOpen}
                setIsOpen={setIsMenuOpen}
                trigger={
                    <button className="p-2 text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md transition-colors">
                        <Icon name="dots-horizontal" className="w-5 h-5" />
                    </button>
                }
                contentClassName="w-32"
            >
                <div className="py-1">
                    <button onClick={() => { onEditRow(row); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                        <Icon name="pencil" className="w-4 h-4" /> Edit
                    </button>
                     <button onClick={() => { onDeleteRow(row); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                        <Icon name="trash" className="w-4 h-4" /> Delete
                    </button>
                </div>
            </Popover>
        </div>
      </div>
    </div>
  );
};

interface TableViewProps {
    table: Table;
    rows: VocabRow[];
    groupedRows: Map<string, VocabRow[]> | null;
    sortableStats: { key: string, label: string }[];
    onViewRow: (row: VocabRow) => void;
    onEditRow: (row: VocabRow) => void;
    onDeleteRow: (row: VocabRow) => void; 
    onConfigureAI: (column: Column) => void;
    fillableCells: Set<string>;
    onManageColumns: () => void;
}

const TableView: React.FC<TableViewProps> = ({ table, rows, groupedRows, sortableStats, onViewRow, onEditRow, onDeleteRow, onConfigureAI, fillableCells, onManageColumns }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows, visibleColumns, visibleStats, grouping, sorts, columnWidths, rowHeight, isTextWrapEnabled, fontSize, isBandedRows, searchQuery } = state;
    const resizingColumnRef = React.useRef<{ id: string, startX: number, startWidth: number } | null>(null);
    const [menuForRow, setMenuForRow] = React.useState<string | null>(null);

    const mainContainerRef = React.useRef<HTMLDivElement>(null);

    const maxInQueue = React.useMemo(() => 
        Math.max(1, ...rows.map(r => r.stats.inQueueCount || 0)), 
    [rows]);

    const getStatDisplayValue = React.useCallback((row: VocabRow, statKey: string): string | number => {
        const stats = row.stats;
        switch (statKey) {
            case 'stat:priorityScore':
                return getPriorityScore(row, maxInQueue).toFixed(2);
            case 'stat:rankPoint':
                return getRankPoint(row);
            case 'stat:level':
                return getLevel(row);
            case 'stat:failed':
                return stats.incorrect || 0;
            case 'stat:totalAttempts':
                return getTotalAttempts(row);
            case 'stat:lastPracticeDate':
                return stats.lastPracticeDate ? new Date(stats.lastPracticeDate).toLocaleDateString() : 'Never';
            case 'stat:wasQuit':
                return stats.wasQuit ? 'Yes' : 'No';
            case 'stat:inQueueCount':
                return stats.inQueueCount || 0;
            case 'stat:successRate':
                return `${Math.round(getSuccessRate(row) * 100)}%`;
            case 'stat:encounters':
                return getTotalAttempts(row);
            case 'stat:lastStudied':
                return stats.lastStudied ? new Date(stats.lastStudied).toLocaleString() : 'Never';
            case 'stat:ankiRepetitions':
                return stats.ankiRepetitions ?? '—';
            case 'stat:ankiEaseFactor':
                return stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '—';
            case 'stat:ankiInterval':
                return stats.ankiInterval ? `${stats.ankiInterval}d` : '—';
            case 'stat:ankiDueDate':
                return stats.ankiDueDate ? new Date(stats.ankiDueDate).toISOString().split('T')[0] : '—';
            default:
                return '...';
        }
    }, [maxInQueue]);

    const rowHeightMap = { short: 30, medium: 42, tall: 62 };

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => mainContainerRef.current,
        estimateSize: () => rowHeightMap[rowHeight],
        overscan: 5,
    });

    const mobileRowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => mainContainerRef.current,
        estimateSize: () => 160, // Adjusted for vertical stacking
        overscan: 5,
    });


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const payload = e.target.checked ? new Set(rows.map(r => r.id)) : new Set<string>();
        dispatch({ type: 'SET_SELECTED_ROWS', payload });
    };
    
    const handleSelectRow = (e: React.MouseEvent, rowId: string) => {
        e.stopPropagation();
        dispatch({ type: 'TOGGLE_ROW_SELECTION', payload: rowId });
    };
    
    const handleDeleteClick = (row: VocabRow) => {
        if (onDeleteRow) {
            onDeleteRow(row);
        } else {
            console.warn("Delete handler not provided to TableView");
        }
    }

    const handleSort = (key: string) => {
        const currentSort = sorts.find(s => s.key === key);
        let newSorts = [];

        if (currentSort) {
            if (currentSort.direction === 'asc') {
                newSorts = [{ ...currentSort, direction: 'desc' }];
            }
        } else {
            newSorts = [{ id: crypto.randomUUID(), key, direction: 'asc' }];
        }
        dispatch({ type: 'SET_SORTS', payload: newSorts });
    };

    const handleResizeMove = React.useCallback((e: MouseEvent | TouchEvent) => {
        if (!resizingColumnRef.current) return;

        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const { id, startX, startWidth } = resizingColumnRef.current;
        const deltaX = currentX - startX;
        const newWidth = startWidth + deltaX;
        
        const minWidth = 80;
        const finalWidth = Math.max(newWidth, minWidth);

        dispatch({ type: 'SET_COLUMN_WIDTH', payload: { columnId: id, width: finalWidth } });
    }, [dispatch]);

    const handleResizeEnd = React.useCallback(() => {
        resizingColumnRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
        window.removeEventListener('touchmove', handleResizeMove);
        window.removeEventListener('touchend', handleResizeEnd);
    }, [handleResizeMove]);

    const handleResizeStart = (columnId: string, e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        const th = e.currentTarget.parentElement;
        const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;

        if (th) {
            resizingColumnRef.current = {
                id: columnId,
                startX,
                startWidth: th.offsetWidth,
            };

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            window.addEventListener('touchmove', handleResizeMove);
            window.addEventListener('touchend', handleResizeEnd);
        }
    };

    React.useEffect(() => {
        return () => {
            handleResizeEnd();
        };
    }, [handleResizeEnd]);

    const visibleCols = table.columns.filter(c => visibleColumns.has(c.id));
    const visibleStatDefs = sortableStats.filter(s => visibleStats.has(s.key));

    const rowHeightClasses = {
        short: 'py-1',
        medium: 'py-2',
        tall: 'py-4',
    }[rowHeight];

    const fontSizeClasses = {
        sm: 'text-sm',
        base: 'text-base',
        lg: 'text-lg',
    }[fontSize];
    
    if (groupedRows) {
        return (
             <div className="overflow-x-auto bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg">
                 <table className="w-full">
                    <tbody>
                        {Array.from(groupedRows.entries()).map(([groupName, groupRows]) => (
                            <React.Fragment key={groupName}>
                                <tr><td colSpan={visibleCols.length + visibleStatDefs.length + 2} className="px-4 py-1 bg-slate-100 dark:bg-secondary-900/50 text-xs font-bold text-slate-600 dark:text-slate-300 sticky top-0 z-10">{groupName} ({groupRows.length})</td></tr>
                                {groupRows.map((row, index) => (
                                    <tr key={row.id} onClick={() => onViewRow(row)} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-150 group ${isBandedRows && index % 2 !== 0 ? 'bg-secondary-50 dark:bg-secondary-800/50' : ''}`}>
                                        <td className={`px-4 align-middle ${rowHeightClasses}`}><input type="checkbox" checked={selectedRows.has(row.id)} onClick={(e) => handleSelectRow(e, row.id)} onChange={() => {}} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/></td>
                                        {visibleCols.map(col => <td key={col.id} className={`px-4 align-middle ${rowHeightClasses}`}><RichCell value={row.cols[col.id] || ''} column={col} table={table} isTextWrapEnabled={isTextWrapEnabled} fontSizeClasses={fontSizeClasses}/></td>)}
                                        {visibleStatDefs.map(stat => <td key={stat.key} className={`px-4 align-middle ${rowHeightClasses} ${fontSizeClasses}`}>{getStatDisplayValue(row, stat.key)}</td>)}
                                        <td className={`px-4 align-middle ${rowHeightClasses}`}>
                                             <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                                <Popover isOpen={menuForRow === row.id} setIsOpen={() => setMenuForRow(null)} trigger={
                                                    <button onClick={() => setMenuForRow(row.id)} className="p-1.5 text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full"><Icon name="dots-horizontal" className="w-4 h-4" /></button>
                                                }>
                                                    <div className="py-1">
                                                        <button onClick={() => { onEditRow(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                                            <Icon name="pencil" className="w-4 h-4" /> Edit
                                                        </button>
                                                        <button onClick={() => { handleDeleteClick(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                                            <Icon name="trash" className="w-4 h-4" /> Delete
                                                        </button>
                                                    </div>
                                                </Popover>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                 </table>
             </div>
        )
    }

    return (
        <div ref={mainContainerRef} className="h-full overflow-auto">
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-3 pb-20" style={{ height: `${mobileRowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {mobileRowVirtualizer.getVirtualItems().map(virtualItem => {
                    const row = rows[virtualItem.index];
                    return (
                        <div key={row.id} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` }}>
                            <MobileRowCard 
                                row={row} 
                                table={table} 
                                visibleCols={visibleCols} 
                                isSelected={selectedRows.has(row.id)} 
                                onViewRow={onViewRow} 
                                onEditRow={onEditRow} 
                                onDeleteRow={handleDeleteClick} 
                                handleSelectRow={handleSelectRow}
                                fontSizeClasses={fontSizeClasses} 
                            />
                        </div>
                    );
                })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg overflow-x-auto">
                <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-inherit">
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th style={{ width: '50px' }} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <input type="checkbox" onChange={handleSelectAll} checked={rows.length > 0 && selectedRows.size === rows.length} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>
                            </th>
                            {visibleCols.map(col => {
                                const promptForCol = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                                const currentSort = sorts.find(s => s.key === col.id);
                                return (
                                    <th key={col.id} style={{ minWidth: columnWidths[col.id] ? `${columnWidths[col.id]}px` : '200px' }} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group relative">
                                        <div className="flex items-center justify-between gap-1.5">
                                            <div onClick={() => handleSort(col.id)} className="flex items-center gap-1 cursor-pointer flex-grow truncate">
                                                <span>{col.name}</span>
                                                {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-4 h-4" />) : (<Icon name="arrows-up-down" className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity" />)}
                                            </div>
                                            <button onClick={(e) => { e.stopPropagation(); onConfigureAI(col); }} title={promptForCol ? `Edit '${promptForCol.name}' prompt` : 'Configure AI Prompt'} className={`transition-colors p-1 rounded-full ${promptForCol ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-emerald-500'}`}><Icon name={promptForCol ? 'star' : 'star-outline'} className="w-4 h-4" /></button>
                                        </div>
                                        <div onMouseDown={(e) => handleResizeStart(col.id, e)} onTouchStart={(e) => handleResizeStart(col.id, e)} className="absolute top-0 right-0 h-full w-2 cursor-col-resize z-10 touch-none hover:bg-primary-500/30 transition-colors" />
                                    </th>
                                );
                            })}
                            {visibleStatDefs.map(stat => {
                                const currentSort = sorts.find(s => s.key === stat.key);
                                return (
                                    <th key={stat.key} style={{ minWidth: '140px' }} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group cursor-pointer" onClick={() => handleSort(stat.key)}>
                                        <div className="flex items-center gap-1">
                                            <span>{stat.label}</span>
                                            {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-4 h-4" />) : (<Icon name="arrows-up-down" className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity" />)}
                                        </div>
                                    </th>
                                );
                            })}
                            <th style={{ width: '80px' }} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                <button onClick={onManageColumns} title="Add or manage columns" className="p-1 rounded-full text-slate-400 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700"><Icon name="plus" className="w-5 h-5"/></button>
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualItem => {
                            const row = rows[virtualItem.index];
                            return (
                                 <tr key={row.id} onClick={() => onViewRow(row)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualItem.size}px`, transform: `translateY(${virtualItem.start}px)` }} className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-150 group ${isBandedRows && virtualItem.index % 2 !== 0 ? 'bg-secondary-50 dark:bg-secondary-800/50' : ''}`}>
                                    <td className={`px-4 align-middle ${rowHeightClasses}`}><input type="checkbox" checked={selectedRows.has(row.id)} onClick={(e) => handleSelectRow(e, row.id)} onChange={() => {}} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/></td>
                                    {visibleCols.map(col => <td key={col.id} className={`px-4 align-middle ${rowHeightClasses}`}><RichCell value={row.cols[col.id] || ''} column={col} table={table} isTextWrapEnabled={isTextWrapEnabled} fontSizeClasses={fontSizeClasses}/></td>)}
                                    {visibleStatDefs.map(stat => <td key={stat.key} className={`px-4 align-middle ${rowHeightClasses} ${fontSizeClasses}`}>{getStatDisplayValue(row, stat.key)}</td>)}
                                    <td className={`px-4 align-middle ${rowHeightClasses}`}>
                                         <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <Popover isOpen={menuForRow === row.id} setIsOpen={() => setMenuForRow(null)} trigger={
                                                <button onClick={() => setMenuForRow(row.id)} className="p-1.5 text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full"><Icon name="dots-horizontal" className="w-4 h-4" /></button>
                                            }>
                                                <div className="py-1">
                                                    <button onClick={() => { onEditRow(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                                        <Icon name="pencil" className="w-4 h-4" /> Edit
                                                    </button>
                                                    <button onClick={() => { handleDeleteClick(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                                        <Icon name="trash" className="w-4 h-4" /> Delete
                                                    </button>
                                                </div>
                                            </Popover>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TableView;
