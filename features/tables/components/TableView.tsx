
import * as React from 'react';
import { Table, VocabRow, Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useTableView } from '../contexts/TableViewContext';
import { getPriorityScore, getRankPoint, getLevel, getTotalAttempts, getSuccessRate } from '../../../utils/priorityScore';
import RichCell from './RichCell';
import { useVirtualizer } from '@tanstack/react-virtual';
import Popover from '../../../components/ui/Popover';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';

// Helper for namespaced ID formatting (e.g., VOC001)
const formatHumanId = (code: string | undefined, id: number) => {
    const prefix = code || '---';
    const num = String(id).padStart(3, '0');
    return `${prefix}${num}`;
};

const MobileRowCard: React.FC<{
    row: VocabRow;
    table: Table;
    visibleCols: Column[];
    isSelected: boolean;
    onViewRow: (row: VocabRow) => void;
    onEditRow: (row: VocabRow) => void;
    onDeleteRow: (row: VocabRow) => void;
    onPreviewRow: (row: VocabRow) => void;
    handleSelectRow: (e: React.MouseEvent, rowId: string) => void;
    fontSizeClasses: string;
}> = ({ row, table, visibleCols, isSelected, onViewRow, onEditRow, onDeleteRow, onPreviewRow, handleSelectRow, fontSizeClasses }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  // Notion/Airtable Style: Show the first 5 visible columns.
  const primaryCol = visibleCols[0];
  const secondaryCols = visibleCols.slice(1, 5); 

  return (
    <div className={`relative bg-surface dark:bg-secondary-800 rounded-xl shadow-sm border border-border transition-all duration-200 group active:scale-[0.98] ${isSelected ? 'ring-2 ring-primary-500 bg-primary-50/50 dark:bg-primary-900/10' : 'hover:shadow-md hover:bg-secondary-50 dark:hover:bg-secondary-800/50'}`}>
      {/* Row ID Badge */}
      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-[10px] font-mono text-text-subtle font-bold tracking-tight">
        {row.rowIdNum ? formatHumanId(table.shortCode, row.rowIdNum) : '—'}
      </div>

      <div className="flex items-start p-4 gap-3">
        {/* Checkbox for selection */}
        <div className="pt-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <label className="p-3 -m-3 flex items-center justify-center cursor-pointer rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors">
            <input 
              type="checkbox" 
              checked={isSelected} 
              onClick={(e) => handleSelectRow(e, row.id)} 
              onChange={() => {}} 
              className="w-5 h-5 rounded-md text-primary-600 focus:ring-primary-500 bg-surface dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600"
            />
          </label>
        </div>
        
        {/* Main content area (Click to View Detail on Mobile) */}
        <div onClick={() => onViewRow(row)} className="flex-1 cursor-pointer min-w-0 space-y-3">
            {/* Primary Field */}
            {primaryCol && (
                <div className="mb-1 min-w-0 pr-12">
                     <div className="font-bold text-lg text-text-main dark:text-secondary-100 truncate">
                         <RichCell 
                            value={row.cols[primaryCol.id] || 'Untitled'} 
                            column={primaryCol} 
                            table={table} 
                            rowId={row.id}
                            isTextWrapEnabled={false} 
                            fontSizeClasses="truncate block"
                            editable={false} // Mobile cards are read-only inline
                        />
                    </div>
                </div>
            )}

            {/* Secondary Fields */}
            <div className="flex flex-col gap-2.5">
                {secondaryCols.map((col) => (
                    <div key={col.id} className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-text-subtle text-xs uppercase tracking-wide font-semibold truncate block">{col.name}</span>
                        <div className="text-text-main dark:text-secondary-200 min-w-0">
                            <RichCell 
                                value={row.cols[col.id] || '—'} 
                                column={col} 
                                table={table} 
                                rowId={row.id} 
                                isTextWrapEnabled={false} 
                                fontSizeClasses="text-sm truncate block"
                                editable={false}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {visibleCols.length > 5 && (
                <p className="text-xs text-text-subtle italic pt-1">+{visibleCols.length - 5} more fields...</p>
            )}
        </div>
        
        {/* "..." menu for actions */}
        <div className="flex-shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
             <Popover
                isOpen={isMenuOpen}
                setIsOpen={setIsMenuOpen}
                trigger={
                    <button className="p-3 -m-2 text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors mt-6">
                        <Icon name="dots-horizontal" className="w-5 h-5" />
                    </button>
                }
                contentClassName="w-44 rounded-xl"
            >
                <div className="py-1">
                    <button onClick={() => { onPreviewRow(row); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                        <Icon name="play" className="w-4 h-4 text-primary-500" /> Preview Card
                    </button>
                    <button onClick={() => { onEditRow(row); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                        <Icon name="pencil" className="w-4 h-4" /> Edit Data
                    </button>
                     <button onClick={() => { onDeleteRow(row); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
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
    onPreviewRow: (row: VocabRow) => void;
    onConfigureAI: (column: Column) => void;
    onConfigureLink: (column: Column) => void;
    fillableCells: Set<string>;
    onManageColumns: () => void;
}

const TableView: React.FC<TableViewProps> = ({ table, rows, groupedRows, sortableStats, onViewRow, onEditRow, onDeleteRow, onPreviewRow, onConfigureAI, onConfigureLink, fillableCells, onManageColumns }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows, visibleColumns, visibleStats, grouping, sorts, columnWidths, rowHeight, isTextWrapEnabled, fontSize, isBandedRows, searchQuery, showRowId, selectedCell, dragTarget, isDraggingHandle } = state;
    const { batchUpdateRows } = useTableStore();
    const { showToast } = useUIStore();
    
    const resizingColumnRef = React.useRef<{ id: string, startX: number, startWidth: number } | null>(null);
    const [menuForRow, setMenuForRow] = React.useState<string | null>(null);

    // Scroll Containers
    const desktopContainerRef = React.useRef<HTMLDivElement>(null);
    const mobileContainerRef = React.useRef<HTMLDivElement>(null);

    const maxInQueue = React.useMemo(() => 
        Math.max(1, ...rows.map(r => r.stats.inQueueCount || 0)), 
    [rows]);

    const getStatDisplayValue = React.useCallback((row: VocabRow, statKey: string): string | number => {
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
            case 'stat:lastStudied': return stats.lastStudied ? new Date(stats.lastStudied).toLocaleString() : 'Never';
            case 'stat:ankiRepetitions': return stats.ankiRepetitions ?? '—';
            case 'stat:ankiEaseFactor': return stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '—';
            case 'stat:ankiInterval': return stats.ankiInterval ? `${stats.ankiInterval}d` : '—';
            case 'stat:ankiDueDate': return stats.ankiDueDate ? new Date(stats.ankiDueDate).toISOString().split('T')[0] : '—';
            case 'stat:confiViewed': return stats.confiViewed ?? 0;
            default: return '...';
        }
    }, [maxInQueue]);

    const rowHeightMap = { short: 36, medium: 48, tall: 72 };

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => desktopContainerRef.current,
        estimateSize: () => rowHeightMap[rowHeight],
        overscan: 20, 
    });

    React.useEffect(() => {
        rowVirtualizer.measure();
    }, [rowHeight, rowVirtualizer]);

    const mobileRowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => mobileContainerRef.current,
        estimateSize: () => 160, 
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
        }
    }

    const handleSort = (key: string) => {
        const currentSort = sorts.find(s => s.key === key);
        let newSorts = [];
        
        // Special logic for ID column: Off -> Desc -> Asc -> Off
        if (key === 'system:rowIdNum') {
            if (currentSort) {
                 if (currentSort.direction === 'desc') {
                     newSorts = [{ ...currentSort, direction: 'asc' }];
                 }
                 // If Asc, we return empty newSorts, removing the sort.
            } else {
                 // Default to Descending for ID
                 newSorts = [{ id: crypto.randomUUID(), key, direction: 'desc' }];
            }
        } else {
            // Standard logic for other columns: Off -> Asc -> Desc -> Off
            if (currentSort) {
                if (currentSort.direction === 'asc') {
                    newSorts = [{ ...currentSort, direction: 'desc' }];
                }
            } else {
                newSorts = [{ id: crypto.randomUUID(), key, direction: 'asc' }];
            }
        }
        
        dispatch({ type: 'SET_SORTS', payload: newSorts });
    };

    const handleResizeMove = React.useCallback((e: MouseEvent | TouchEvent) => {
        if (!resizingColumnRef.current) return;
        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const { id, startX, startWidth } = resizingColumnRef.current;
        const deltaX = currentX - startX;
        const newWidth = Math.max(startWidth + deltaX, 80);
        dispatch({ type: 'SET_COLUMN_WIDTH', payload: { columnId: id, width: newWidth } });
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
            resizingColumnRef.current = { id: columnId, startX, startWidth: th.offsetWidth };
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            window.addEventListener('touchmove', handleResizeMove);
            window.addEventListener('touchend', handleResizeEnd);
        }
    };

    // --- DRAG LOGIC (Global Handlers) ---
    React.useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDraggingHandle && selectedCell && dragTarget) {
                // Execute Batch Update
                const sourceRowIndex = rows.findIndex(r => r.id === selectedCell.rowId);
                const targetRowIndex = rows.findIndex(r => r.id === dragTarget.rowId);
                const colId = selectedCell.columnId;

                if (sourceRowIndex !== -1 && targetRowIndex !== -1 && colId === dragTarget.columnId) {
                    const start = Math.min(sourceRowIndex, targetRowIndex);
                    const end = Math.max(sourceRowIndex, targetRowIndex);
                    const sourceValue = rows[sourceRowIndex].cols[colId] || '';
                    
                    // Identify rows to update (excluding source row itself to save ops)
                    const updates = [];
                    for (let i = start; i <= end; i++) {
                        if (i !== sourceRowIndex) {
                            updates.push({
                                rowId: rows[i].id,
                                changes: { cols: { [colId]: sourceValue } }
                            });
                        }
                    }

                    if (updates.length > 0) {
                        batchUpdateRows(table.id, updates);
                        showToast(`Filled ${updates.length} cells.`, 'success');
                    }
                }
            }
            // Reset drag state
            dispatch({ type: 'SET_IS_DRAGGING_HANDLE', payload: false });
            dispatch({ type: 'SET_DRAG_TARGET', payload: null });
        };

        if (isDraggingHandle) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            handleResizeEnd();
        };
    }, [isDraggingHandle, selectedCell, dragTarget, rows, table.id, batchUpdateRows, dispatch, handleResizeEnd, showToast]);


    const visibleCols = table.columns.filter(c => visibleColumns.has(c.id));
    const visibleStatDefs = sortableStats.filter(s => visibleStats.has(s.key));

    const rowHeightClasses = { short: 'py-1.5', medium: 'py-3', tall: 'py-5' }[rowHeight];
    const fontSizeClasses = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[fontSize];

    // Helper to check if a row is within the drag range
    const isRowInDragRange = (rowId: string) => {
        if (!isDraggingHandle || !selectedCell || !dragTarget || selectedCell.columnId !== dragTarget.columnId) return false;
        
        // This is computationally expensive if we scan array every time.
        // But for small datasets < 1000 rows it's okay. Virtualizer handles DOM rendering limits.
        const srcIdx = rows.findIndex(r => r.id === selectedCell.rowId);
        const tgtIdx = rows.findIndex(r => r.id === dragTarget.rowId);
        const currentIdx = rows.findIndex(r => r.id === rowId);

        if (srcIdx === -1 || tgtIdx === -1 || currentIdx === -1) return false;
        
        const start = Math.min(srcIdx, tgtIdx);
        const end = Math.max(srcIdx, tgtIdx);
        return currentIdx >= start && currentIdx <= end;
    };

    // --- MOBILE CONTENT RENDERER ---
    const renderMobileContent = () => {
        return (
            <div ref={mobileContainerRef} className="h-full overflow-y-auto w-full">
                <div className="space-y-3 pb-20" style={{ height: `${mobileRowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
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
                                    onPreviewRow={onPreviewRow}
                                    handleSelectRow={handleSelectRow}
                                    fontSizeClasses={fontSizeClasses} 
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- DESKTOP CONTENT RENDERER ---
    const renderDesktopContent = () => {
        // We use explicit borders instead of border-collapse to play nice with sticky headers and virtualization <div> structure
        const cellBorderClass = "border-r border-border/50 dark:border-secondary-700/50 last:border-r-0";
        const headerBorderClass = "border-r border-border/50 dark:border-secondary-700/50 last:border-r-0";

        return (
             <div className="bg-surface dark:bg-secondary-800/50 rounded-lg shadow-sm border border-border dark:border-secondary-700 h-full flex flex-col overflow-hidden">
                <div 
                    ref={desktopContainerRef}
                    className="flex-1 overflow-auto w-full relative"
                >
                     {/* Sticky Header */}
                    <div className="sticky top-0 z-20 bg-secondary-50 dark:bg-secondary-900 border-b border-border dark:border-secondary-700 flex w-full">
                            <div style={{ width: '3.125rem' }} className={`px-4 py-2 flex items-center justify-center flex-shrink-0 ${headerBorderClass}`}>
                                <input type="checkbox" onChange={handleSelectAll} checked={rows.length > 0 && selectedRows.size === rows.length} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>
                            </div>
                            
                            {showRowId && (
                                <div 
                                    style={{ width: '5.5rem' }} 
                                    className={`px-2 py-2 flex items-center justify-center text-xs font-bold text-text-subtle uppercase tracking-wider flex-shrink-0 cursor-pointer hover:text-text-main transition-colors group ${headerBorderClass}`}
                                    onClick={() => handleSort('system:rowIdNum')}
                                >
                                    <div className="flex items-center gap-1">
                                        <span>ID</span>
                                        {sorts.find(s => s.key === 'system:rowIdNum') ? (
                                            <Icon name={sorts.find(s => s.key === 'system:rowIdNum')?.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-3.5 h-3.5 text-primary-500" />
                                        ) : (
                                            <Icon name="arrows-up-down" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {visibleCols.map(col => {
                                const promptForCol = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                                const isImageColumn = table.imageConfig?.imageColumnId === col.id;
                                const currentSort = sorts.find(s => s.key === col.id);
                                const minWidth = columnWidths[col.id] ? `${columnWidths[col.id] / 16}rem` : '12.5rem';
                                return (
                                    <div key={col.id} style={{ width: minWidth }} className={`px-4 py-2 flex items-center justify-between text-xs font-bold text-text-subtle uppercase tracking-wider group relative flex-shrink-0 ${headerBorderClass}`}>
                                        <div onClick={() => handleSort(col.id)} className="flex items-center gap-1.5 cursor-pointer flex-grow truncate hover:text-text-main transition-colors select-none">
                                            <span className="truncate">{col.name}</span>
                                            {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />) : (<Icon name="arrows-up-down" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity flex-shrink-0" />)}
                                        </div>
                                        {isImageColumn ? (
                                            <button onClick={(e) => { e.stopPropagation(); onConfigureLink(col); }} title="Configure Search Link" className="transition-colors p-1 rounded-full flex-shrink-0 text-purple-400 hover:text-purple-300">
                                                <Icon name="globe" className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); onConfigureAI(col); }} title={promptForCol ? `Edit '${promptForCol.name}' prompt` : 'Configure AI Prompt'} className={`transition-colors p-1 rounded-full flex-shrink-0 ${promptForCol ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-emerald-500'}`}>
                                                <Icon name={promptForCol ? 'star' : 'star-outline'} className="w-4 h-4" />
                                            </button>
                                        )}
                                        <div onMouseDown={(e) => handleResizeStart(col.id, e)} onTouchStart={(e) => handleResizeStart(col.id, e)} className="absolute top-0 right-0 h-full w-1 cursor-col-resize z-10 touch-none hover:bg-primary-500/50 transition-colors" />
                                    </div>
                                );
                            })}
                            {visibleStatDefs.map(stat => {
                                const currentSort = sorts.find(s => s.key === stat.key);
                                return (
                                    <div key={stat.key} style={{ width: '8.75rem' }} className={`px-4 py-2 flex items-center text-xs font-bold text-text-subtle uppercase tracking-wider group cursor-pointer hover:text-text-main transition-colors flex-shrink-0 ${headerBorderClass}`} onClick={() => handleSort(stat.key)}>
                                        <div className="flex items-center gap-1">
                                            <span>{stat.label}</span>
                                            {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-3.5 h-3.5 text-primary-500" />) : (<Icon name="arrows-up-down" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity" />)}
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{ width: '5rem' }} className={`px-4 py-2 flex items-center justify-center text-xs font-bold text-text-subtle uppercase tracking-wider flex-shrink-0 ${headerBorderClass}`}>
                                <button onClick={onManageColumns} title="Add or manage columns" className="p-1 rounded-full text-slate-400 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Icon name="plus" className="w-5 h-5"/></button>
                            </div>
                    </div>
                    
                    {/* Rows */}
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualItem => {
                            const row = rows[virtualItem.index];
                            const isSelected = selectedRows.has(row.id);
                            const isInDragRange = isDraggingHandle && isRowInDragRange(row.id);
                            
                            // Visual Banding Logic
                            const isEvenRow = virtualItem.index % 2 !== 0; 
                            let bgClasses = '';

                            if (isSelected) {
                                bgClasses = 'bg-primary-50/50 dark:bg-primary-900/20';
                            } else {
                                const hoverClass = 'hover:bg-secondary-100 dark:hover:bg-secondary-700/50'; 
                                if (isBandedRows && isEvenRow) {
                                    // FIX: Increased contrast for banded rows.
                                    // Light: secondary-100/60 (was secondary-50/60 which is invisible)
                                    // Dark: white/5 (was secondary-800/40 which matched background)
                                    bgClasses = `bg-secondary-100/60 dark:bg-white/5 ${hoverClass}`;
                                } else {
                                    bgClasses = `bg-transparent ${hoverClass}`; 
                                }
                            }
                            
                            return (
                                 <div 
                                    key={row.id} 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0, 
                                        left: 0, 
                                        width: '100%', 
                                        height: `${virtualItem.size}px`, 
                                        transform: `translateY(${virtualItem.start}px)` 
                                    }} 
                                    className={`border-b border-border/50 dark:border-secondary-700/50 transition-colors duration-150 group flex items-stretch ${bgClasses}`}
                                >
                                    {/* Selection Checkbox */}
                                    <div style={{ width: '3.125rem' }} className={`px-4 flex items-center justify-center flex-shrink-0 ${cellBorderClass}`}>
                                        <input type="checkbox" checked={isSelected} onClick={(e) => handleSelectRow(e, row.id)} onChange={() => {}} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>
                                    </div>
                                    
                                    {/* Row ID */}
                                    {showRowId && (
                                        <div style={{ width: '5.5rem' }} className={`px-2 flex items-center justify-center flex-shrink-0 text-center ${cellBorderClass}`}>
                                            <span className="font-mono text-xs text-text-subtle font-bold select-none">{row.rowIdNum ? formatHumanId(table.shortCode, row.rowIdNum) : '—'}</span>
                                        </div>
                                    )}

                                    {/* Editable Cells */}
                                    {visibleCols.map(col => {
                                        const width = columnWidths[col.id] ? `${columnWidths[col.id] / 16}rem` : '12.5rem';
                                        
                                        // Visual Check for Drag
                                        const isDragAffected = isInDragRange && selectedCell?.columnId === col.id;

                                        return (
                                            <div key={col.id} style={{ width }} className={`px-2 flex items-center relative flex-shrink-0 ${cellBorderClass} ${isDragAffected ? 'bg-primary-50/50 dark:bg-primary-900/20' : ''}`}>
                                                {/* Drag Overlay Border (Left/Right) */}
                                                {isDragAffected && (
                                                    <div className="absolute inset-y-0 left-0 border-l border-dashed border-primary-500 pointer-events-none z-30"></div>
                                                )}
                                                {isDragAffected && (
                                                    <div className="absolute inset-y-0 right-0 border-r border-dashed border-primary-500 pointer-events-none z-30"></div>
                                                )}
                                                
                                                <RichCell 
                                                    value={row.cols[col.id] || ''} 
                                                    column={col} 
                                                    table={table} 
                                                    rowId={row.id}
                                                    isTextWrapEnabled={isTextWrapEnabled} 
                                                    fontSizeClasses={fontSizeClasses}
                                                    editable={true} // Enable inline editing
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Read-only Stats */}
                                    {visibleStatDefs.map(stat => <div key={stat.key} style={{ width: '8.75rem' }} className={`px-4 flex items-center text-text-subtle select-none flex-shrink-0 ${cellBorderClass} ${fontSizeClasses}`}>{getStatDisplayValue(row, stat.key)}</div>)}
                                    
                                    {/* Actions */}
                                    <div style={{ width: '5rem' }} className={`px-4 flex items-center justify-center flex-shrink-0 ${cellBorderClass}`}>
                                         <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <Popover 
                                                isOpen={menuForRow === row.id} 
                                                setIsOpen={(isOpen) => setMenuForRow(isOpen ? row.id : null)} 
                                                trigger={
                                                    <button className="p-1.5 text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors">
                                                        <Icon name="dots-horizontal" className="w-4 h-4" />
                                                    </button>
                                                } 
                                                contentClassName="w-44 rounded-xl"
                                            >
                                                <div className="py-1">
                                                    <button onClick={() => { onPreviewRow(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                                        <Icon name="play" className="w-4 h-4 text-primary-500" /> Preview Card
                                                    </button>
                                                    <button onClick={() => { onEditRow(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                                        <Icon name="pencil" className="w-4 h-4" /> Detail View
                                                    </button>
                                                    <button onClick={() => { handleDeleteClick(row); setMenuForRow(null); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                                        <Icon name="trash" className="w-4 h-4" /> Delete
                                                    </button>
                                                </div>
                                            </Popover>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-hidden w-full">
            {/* Mobile View */}
            <div className="md:hidden h-full">
                {renderMobileContent()}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block h-full">
                {renderDesktopContent()}
            </div>
        </div>
    );
};

export default TableView;
