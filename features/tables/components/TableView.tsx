
import * as React from 'react';
import { Table, VocabRow, Column, Screen } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useTableView } from '../contexts/TableViewContext';
import { getPriorityScore, getRankPoint, getLevel, getTotalAttempts, getSuccessRate } from '../../../utils/priorityScore';
import RichCell from './RichCell';
import { useVirtualizer } from '@tanstack/react-virtual';
import Popover from '../../../components/ui/Popover';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import ConceptIndicatorCell from './ConceptIndicatorCell';
import KnowledgeSidebar from '../../concepts/components/KnowledgeSidebar';
import { validateRow } from '../../../utils/rowValidator';

// Helper for namespaced ID formatting (e.g., VOC001)
const formatHumanId = (code: string | undefined, id: number) => {
    const prefix = code || '---';
    const num = String(id).padStart(3, '0');
    return `${prefix}${num}`;
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

// Pseudo-column for system ID
const SYSTEM_ID_COL_DEF: Column = { id: 'system:rowIdNum', name: 'ID' };

const TableView: React.FC<TableViewProps> = ({ table, rows, groupedRows, sortableStats, onViewRow, onEditRow, onDeleteRow, onPreviewRow, onConfigureAI, onConfigureLink, fillableCells, onManageColumns }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows, visibleColumns, visibleStats, grouping, sorts, columnWidths, rowHeight, isTextWrapEnabled, fontSize, isBandedRows, searchQuery, showRowId, selectedCell, dragTarget, isDraggingHandle, columnOrder, frozenColumnCount, isSelecting, selectionAnchor, selectedRangeIds } = state;
    const { batchUpdateRows } = useTableStore();
    const { showToast, knowledgeSidebarOpen, knowledgeSidebarRowId, openKnowledgeSidebar } = useUIStore();

    const resizingColumnRef = React.useRef<{ id: string, startX: number, startWidth: number } | null>(null);
    const [menuForRow, setMenuForRow] = React.useState<string | null>(null);
    const [menuForCol, setMenuForCol] = React.useState<string | null>(null);

    // Scroll Containers & Sync Refs
    const containerRef = React.useRef<HTMLDivElement>(null);
    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const isSyncingTop = React.useRef(false);
    const isSyncingBottom = React.useRef(false);
    const [showTopScroll, setShowTopScroll] = React.useState(false);

    // Validation Results Map (rowId -> validation result)
    const validationResults = React.useMemo(() => {
        const results = new Map();
        // Only validate if table has relations
        if (table.relations.length === 0) return results;

        // Use the first relation for validation (in real scenarios, you'd pick the active one)
        const primaryRelation = table.relations[0];

        rows.forEach(row => {
            const result = validateRow(row, primaryRelation, table);
            if (!result.isValid) {
                results.set(row.id, result);
            }
        });

        return results;
    }, [rows, table]);

    // Ordered Columns Calculation (Unified: User Columns + System Columns)
    const visibleOrderedCols = React.useMemo(() => {
        // 1. Create a map for quick lookup
        const colMap = new Map<string, Column>();
        table.columns.forEach(c => colMap.set(c.id, c));
        colMap.set(SYSTEM_ID_COL_DEF.id, SYSTEM_ID_COL_DEF);

        // 2. Start with saved order, map to columns, filter out invalid/deleted columns
        const ordered = (columnOrder || []).map(id => colMap.get(id)).filter((c): c is Column => !!c);

        // 3. Find any new columns that aren't in the saved order yet
        const orderedIds = new Set(ordered.map(c => c.id));
        // Add system ID if missing
        if (!orderedIds.has(SYSTEM_ID_COL_DEF.id)) {
            ordered.unshift(SYSTEM_ID_COL_DEF);
            orderedIds.add(SYSTEM_ID_COL_DEF.id);
        }

        const newCols = table.columns.filter(c => !orderedIds.has(c.id));

        // 4. Combine (Existing Ordered + New appended)
        const fullList = [...ordered, ...newCols];

        // 5. Filter by visibility
        // Special Case: System ID visibility is controlled by `showRowId` but physically placed via `columnOrder`
        return fullList.filter(c => {
            if (c.id === SYSTEM_ID_COL_DEF.id) return showRowId;
            return visibleColumns.has(c.id);
        });
    }, [table.columns, columnOrder, visibleColumns, showRowId]);

    // Sync column order state if new columns appeared
    React.useEffect(() => {
        const currentIds = new Set(columnOrder);
        const incomingIds = table.columns.map(c => c.id);
        const hasNew = incomingIds.some(id => !currentIds.has(id));
        const missingSystemId = !currentIds.has(SYSTEM_ID_COL_DEF.id);

        if (hasNew || missingSystemId) {
            const newOrder = [...columnOrder];
            if (missingSystemId) newOrder.unshift(SYSTEM_ID_COL_DEF.id);

            incomingIds.forEach(id => {
                if (!currentIds.has(id)) newOrder.push(id);
            });
            dispatch({ type: 'SET_COLUMN_ORDER', payload: newOrder });
        }
    }, [table.columns, columnOrder, dispatch]);


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

    // Force at least 48px on mobile if not explicitly set small, to aid touch
    const rowHeightMap = { short: 36, medium: 48, tall: 72 };

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => rowHeightMap[rowHeight],
        overscan: 20,
    });

    React.useEffect(() => {
        rowVirtualizer.measure();
    }, [rowHeight, rowVirtualizer]);

    // --- Calculated Widths ---
    const visibleStatDefs = sortableStats.filter(s => visibleStats.has(s.key));

    const totalWidthPx = React.useMemo(() => {
        let w = 50 + 1; // Checkbox + border
        w += 12 + 1; // Concept Indicator + border
        visibleOrderedCols.forEach(c => {
            const defaultWidth = c.id === SYSTEM_ID_COL_DEF.id ? 88 : 200;
            const widthPx = columnWidths[c.id] || defaultWidth;
            w += widthPx + 1;
        });
        w += visibleStatDefs.length * (140 + 1);
        w += 80; // Action
        return w;
    }, [visibleOrderedCols, visibleStatDefs, columnWidths]);

    // --- Scroll Sync Logic ---
    const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncingBottom.current) {
            isSyncingBottom.current = false;
            return;
        }
        if (containerRef.current) {
            isSyncingTop.current = true;
            containerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    const handleContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (isSyncingTop.current) {
            isSyncingTop.current = false;
            return;
        }
        if (topScrollRef.current) {
            isSyncingBottom.current = true;
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // --- Overflow Detection for Top Scrollbar Visibility ---
    React.useEffect(() => {
        const checkOverflow = () => {
            if (containerRef.current) {
                const { clientWidth, scrollWidth } = containerRef.current;
                // Add a small buffer to avoid floating point flicker
                setShowTopScroll(scrollWidth > clientWidth + 1);
            }
        };

        checkOverflow();
        const resizeObserver = new ResizeObserver(checkOverflow);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        window.addEventListener('resize', checkOverflow);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', checkOverflow);
        };
    }, [totalWidthPx]); // Re-check whenever content width effectively changes

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

        if (key === 'system:rowIdNum') {
            if (currentSort) {
                if (currentSort.direction === 'desc') {
                    newSorts = [{ ...currentSort, direction: 'asc' }];
                }
            } else {
                newSorts = [{ id: crypto.randomUUID(), key, direction: 'desc' }];
            }
        } else {
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

    // --- Resize Logic ---
    const handleResizeMove = React.useCallback((e: MouseEvent | TouchEvent) => {
        if (!resizingColumnRef.current) return;
        const currentX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const { id, startX, startWidth } = resizingColumnRef.current;
        const deltaX = currentX - startX;
        const newWidth = Math.max(startWidth + deltaX, 50);
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
        e.stopPropagation();
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

    // --- DRAG & DROP LOGIC ---
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, colId: string) => {
        e.dataTransfer.setData('text/plain', colId);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class for visual feedback if needed
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetColId: string) => {
        e.preventDefault();
        const sourceColId = e.dataTransfer.getData('text/plain');
        if (sourceColId === targetColId) return;

        // Reorder based on VISIBLE order first
        const currentVisibleOrder = visibleOrderedCols.map(c => c.id);
        const sourceIndex = currentVisibleOrder.indexOf(sourceColId);
        const targetIndex = currentVisibleOrder.indexOf(targetColId);

        if (sourceIndex === -1 || targetIndex === -1) return;

        // Update the full columnOrder list
        // We find indices in the full list to perform the move
        const fullOrder = [...columnOrder];
        const fullSourceIndex = fullOrder.indexOf(sourceColId);
        const fullTargetIndex = fullOrder.indexOf(targetColId);

        if (fullSourceIndex > -1 && fullTargetIndex > -1) {
            const [movedCol] = fullOrder.splice(fullSourceIndex, 1);
            // Re-find target index as it might have shifted
            const newTargetIndex = fullOrder.indexOf(targetColId);
            // Insert before or after based on visual direction
            // If dragging RIGHT (source < target), insert AFTER target
            // If dragging LEFT (source > target), insert BEFORE target
            // But simplistic splice at newTargetIndex usually works for "insert before".
            // However, to make it feel natural, we often insert "at" the target index.
            fullOrder.splice(newTargetIndex, 0, movedCol);

            dispatch({ type: 'SET_COLUMN_ORDER', payload: fullOrder });
        }
    };

    // --- FREEZE LOGIC ---
    const handleFreezeColumn = (colId: string) => {
        const index = visibleOrderedCols.findIndex(c => c.id === colId);
        if (index !== -1) {
            // Freeze up to this column (1-based count)
            dispatch({ type: 'SET_FROZEN_COUNT', payload: index + 1 });
        }
        setMenuForCol(null);
    };

    const handleUnfreezeAll = () => {
        dispatch({ type: 'SET_FROZEN_COUNT', payload: 0 });
        setMenuForCol(null);
    };


    // --- Global Mouse Up for Fill Handle & Selection End ---
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
                // Reset drag state
                dispatch({ type: 'SET_IS_DRAGGING_HANDLE', payload: false });
                dispatch({ type: 'SET_DRAG_TARGET', payload: null });
            }

            // End Range Selection
            if (isSelecting) {
                dispatch({ type: 'END_SELECTION' });
            }
        };

        if (isDraggingHandle || isSelecting) {
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            handleResizeEnd();
        };
    }, [isDraggingHandle, selectedCell, dragTarget, rows, table.id, batchUpdateRows, dispatch, handleResizeEnd, showToast, isSelecting]);


    // --- Selection Logic ---
    const getCoordinates = (rowId: string, colId: string) => {
        const rowIndex = rows.findIndex(r => r.id === rowId);
        const colIndex = visibleOrderedCols.findIndex(c => c.id === colId);
        return { rowIndex, colIndex };
    };

    const handleCellMouseDown = (e: React.MouseEvent, rowId: string, colId: string) => {
        if (e.button !== 0) return; // Only left click
        dispatch({ type: 'START_SELECTION', payload: { rowId, colId } });
        // Don't prevent default, allow focus to work if it's not a drag
    };

    const handleCellMouseEnter = (rowId: string, colId: string) => {
        if (isSelecting && selectionAnchor) {
            const start = getCoordinates(selectionAnchor.rowId, selectionAnchor.colId);
            const end = getCoordinates(rowId, colId);

            if (start.rowIndex === -1 || start.colIndex === -1 || end.rowIndex === -1 || end.colIndex === -1) return;

            const minRow = Math.min(start.rowIndex, end.rowIndex);
            const maxRow = Math.max(start.rowIndex, end.rowIndex);
            const minCol = Math.min(start.colIndex, end.colIndex);
            const maxCol = Math.max(start.colIndex, end.colIndex);

            const newSet = new Set<string>();
            for (let r = minRow; r <= maxRow; r++) {
                for (let c = minCol; c <= maxCol; c++) {
                    const rId = rows[r].id;
                    const cId = visibleOrderedCols[c].id;
                    newSet.add(`${rId}:${cId}`);
                }
            }
            dispatch({ type: 'UPDATE_SELECTION', payload: newSet });
        }
    };

    // --- Keyboard Batch Delete ---
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only handle if not editing
            if (state.editingCell) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedRangeIds.size > 0) {
                    const updates: { rowId: string; changes: { cols: Record<string, string> } }[] = [];
                    // Group updates by row to make efficient calls
                    const rowsToUpdateMap = new Map<string, Record<string, string>>();

                    selectedRangeIds.forEach(key => {
                        const [rId, cId] = key.split(':');
                        if (cId === SYSTEM_ID_COL_DEF.id) return; // Cannot delete system ID

                        if (!rowsToUpdateMap.has(rId)) {
                            rowsToUpdateMap.set(rId, {});
                        }
                        rowsToUpdateMap.get(rId)![cId] = '';
                    });

                    rowsToUpdateMap.forEach((cols, rowId) => {
                        updates.push({ rowId, changes: { cols } });
                    });

                    if (updates.length > 0) {
                        batchUpdateRows(table.id, updates);
                        showToast(`Cleared ${selectedRangeIds.size} cells.`, 'success');
                    }
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRangeIds, state.editingCell, batchUpdateRows, table.id, showToast]);


    const fontSizeClasses = { sm: 'text-sm', base: 'text-base', lg: 'text-lg' }[fontSize];

    // Helper to check if a row is within the drag range (old drag fill logic)
    const isRowInDragRange = (rowId: string) => {
        if (!isDraggingHandle || !selectedCell || !dragTarget || selectedCell.columnId !== dragTarget.columnId) return false;

        const srcIdx = rows.findIndex(r => r.id === selectedCell.rowId);
        const tgtIdx = rows.findIndex(r => r.id === dragTarget.rowId);
        const currentIdx = rows.findIndex(r => r.id === rowId);

        if (srcIdx === -1 || tgtIdx === -1 || currentIdx === -1) return false;

        const start = Math.min(srcIdx, tgtIdx);
        const end = Math.max(srcIdx, tgtIdx);
        return currentIdx >= start && currentIdx <= end;
    };

    // --- DATA GRID RENDERER ---
    const renderDataGrid = () => {
        const cellBorderClass = "border-r border-border/50 dark:border-secondary-700/50 last:border-r-0";
        const headerBorderClass = "border-r border-border/50 dark:border-secondary-700/50 last:border-r-0";

        // Sticky Logic: First column (Checkbox) is always 50px.
        const checkboxWidthPx = 50;
        const indicatorWidthPx = 12; // Concept indicator width
        let headerStickyLeft = 0;

        // Checkbox always frozen
        const checkboxStickyHeaderStyle: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 50 };
        headerStickyLeft += checkboxWidthPx + 1; // +1 for border

        // Indicator always frozen (after checkbox)
        const indicatorStickyHeaderStyle: React.CSSProperties = { position: 'sticky', left: headerStickyLeft, zIndex: 50 };
        headerStickyLeft += indicatorWidthPx + 1; // +1 for border

        return (
            <div className="bg-surface dark:bg-secondary-800 rounded-lg shadow-sm border border-border dark:border-secondary-700 h-full flex flex-col overflow-hidden">
                {/* Top Horizontal Scrollbar (Virtual) */}
                {showTopScroll && (
                    <div
                        ref={topScrollRef}
                        className="overflow-x-auto overflow-y-hidden flex-shrink-0 border-b border-border/50 dark:border-secondary-700/50"
                        style={{ height: '12px' }}
                        onScroll={handleTopScroll}
                    >
                        <div style={{ width: `${totalWidthPx}px`, height: '1px' }}></div>
                    </div>
                )}

                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto w-full relative custom-scrollbar scroll-smooth"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                    onScroll={handleContainerScroll}
                >
                    {/* Sticky Header Row */}
                    <div
                        style={{ width: `${totalWidthPx}px` }}
                        className="sticky top-0 z-30 bg-secondary-50 dark:bg-secondary-900 border-b border-border dark:border-secondary-700 flex shadow-sm"
                    >
                        {/* Sticky Checkbox */}
                        <div
                            style={{
                                width: `${checkboxWidthPx}px`,
                                ...checkboxStickyHeaderStyle,
                                transform: 'translateZ(0)',
                                WebkitTransform: 'translateZ(0)'
                            }}
                            className={`px-4 py-2 flex items-center justify-center flex-shrink-0 bg-secondary-50 dark:bg-secondary-900 ${headerBorderClass}`}
                        >
                            <input type="checkbox" onChange={handleSelectAll} checked={rows.length > 0 && selectedRows.size === rows.length} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                        </div>

                        {/* Concept Indicator Header */}
                        <div
                            style={{
                                width: `${indicatorWidthPx}px`,
                                ...indicatorStickyHeaderStyle,
                                transform: 'translateZ(0)',
                                WebkitTransform: 'translateZ(0)'
                            }}
                            className={`flex items-center justify-center flex-shrink-0 bg-secondary-50 dark:bg-secondary-900 ${headerBorderClass}`}
                            title="Concept Links"
                        >
                            <Icon name="link" className="w-3 h-3 text-text-subtle" />
                        </div>

                        {/* Data Columns (Mixed ID + User Columns) */}
                        {visibleOrderedCols.map((col, index) => {
                            const isSystemId = col.id === SYSTEM_ID_COL_DEF.id;
                            const promptForCol = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                            const isImageColumn = table.imageConfig?.imageColumnId === col.id;
                            const currentSort = sorts.find(s => s.key === col.id);

                            const defaultWidth = isSystemId ? 88 : 200;
                            const colWidth = columnWidths[col.id] || defaultWidth;

                            // Dynamic Sticky Calculation for Data Columns
                            const isFrozen = index < frozenColumnCount;
                            const stickyStyle: React.CSSProperties = isFrozen
                                ? {
                                    position: 'sticky',
                                    left: index === -1 ? 0 : headerStickyLeft, // checkbox handled separately
                                    zIndex: 40,
                                    borderRight: '1px solid var(--color-border)',
                                    transform: 'translateZ(0)',
                                    WebkitTransform: 'translateZ(0)'
                                }
                                : {};

                            const leftVal = headerStickyLeft;
                            if (isFrozen) {
                                headerStickyLeft += colWidth + 1; // +1 for each column's right border
                            }

                            return (
                                <div
                                    key={col.id}
                                    style={{ width: `${colWidth}px`, ...stickyStyle }}
                                    className={`px-4 py-2 flex items-center justify-between text-xs font-bold text-text-subtle uppercase tracking-wider group relative flex-shrink-0 bg-secondary-50 dark:bg-secondary-900 ${isFrozen ? '' : headerBorderClass}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, col.id)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    <div onClick={() => handleSort(col.id)} className="flex items-center gap-1.5 cursor-pointer flex-grow truncate hover:text-text-main transition-colors select-none">
                                        <span className="truncate max-w-[140px]" title={col.name}>{col.name}</span>
                                        {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />) : (<Icon name="arrows-up-down" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity flex-shrink-0" />)}
                                    </div>

                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isImageColumn && (
                                            <button onClick={(e) => { e.stopPropagation(); onConfigureLink(col); }} title="Configure Search Link" className="transition-colors p-1 rounded-full flex-shrink-0 text-purple-400 hover:text-purple-300">
                                                <Icon name="globe" className="w-4 h-4" />
                                            </button>
                                        )}
                                        {!isSystemId && !isImageColumn && (
                                            <button onClick={(e) => { e.stopPropagation(); onConfigureAI(col); }} title={promptForCol ? `Edit '${promptForCol.name}' prompt` : 'Configure AI Prompt'} className={`transition-colors p-1 rounded-full flex-shrink-0 ${promptForCol ? 'text-amber-400 hover:text-amber-300' : 'text-slate-400 hover:text-emerald-500'}`}>
                                                <Icon name={promptForCol ? 'star' : 'star-outline'} className="w-4 h-4" />
                                            </button>
                                        )}

                                        <Popover
                                            isOpen={menuForCol === col.id}
                                            setIsOpen={(open) => setMenuForCol(open ? col.id : null)}
                                            trigger={
                                                <button className="p-1 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle transition-colors" title="Column Options">
                                                    <Icon name="dots-horizontal" className="w-4 h-4" />
                                                </button>
                                            }
                                            contentClassName="w-40"
                                        >
                                            <div className="py-1">
                                                <button onClick={() => handleFreezeColumn(col.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 text-text-main dark:text-secondary-100 flex items-center gap-2">
                                                    <Icon name="lock-closed" className="w-3 h-3" /> Freeze to here
                                                </button>
                                                {frozenColumnCount > 0 && (
                                                    <button onClick={handleUnfreezeAll} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 text-text-main dark:text-secondary-100 flex items-center gap-2">
                                                        <Icon name="lock-open" className="w-3 h-3" /> Unfreeze all
                                                    </button>
                                                )}
                                            </div>
                                        </Popover>
                                    </div>

                                    <div onMouseDown={(e) => handleResizeStart(col.id, e)} onTouchStart={(e) => handleResizeStart(col.id, e)} className="absolute top-0 right-0 h-full w-6 cursor-col-resize z-20 touch-none hover:bg-primary-500/20 transition-colors flex items-center justify-center -mr-3">
                                        <div className="w-0.5 h-full bg-transparent group-hover:bg-primary-500/20" />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Stats */}
                        {visibleStatDefs.map(stat => {
                            const currentSort = sorts.find(s => s.key === stat.key);
                            return (
                                <div key={stat.key} style={{ width: '140px' }} className={`px-4 py-2 flex items-center text-xs font-bold text-text-subtle uppercase tracking-wider group cursor-pointer hover:text-text-main transition-colors flex-shrink-0 bg-secondary-50 dark:bg-secondary-900 ${headerBorderClass}`} onClick={() => handleSort(stat.key)}>
                                    <div className="flex items-center gap-1">
                                        <span>{stat.label}</span>
                                        {currentSort ? (<Icon name={currentSort.direction === 'asc' ? 'arrow-up' : 'arrow-down'} className="w-3.5 h-3.5 text-primary-500" />) : (<Icon name="arrows-up-down" className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity" />)}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Action Header */}
                        <div style={{ width: '80px' }} className={`px-4 py-2 flex items-center justify-center text-xs font-bold text-text-subtle uppercase tracking-wider flex-shrink-0 bg-secondary-50 dark:bg-secondary-900 ${headerBorderClass}`}>
                            <button onClick={onManageColumns} title="Add or manage columns" className="p-1 rounded-full text-slate-400 hover:text-primary-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Icon name="plus" className="w-5 h-5" /></button>
                        </div>
                    </div>

                    {/* Virtualized Rows */}
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {rowVirtualizer.getVirtualItems().map(virtualItem => {
                            const row = rows[virtualItem.index];
                            const isSelected = selectedRows.has(row.id);
                            const isInDragRange = isDraggingHandle && isRowInDragRange(row.id);

                            // Reset sticky offset for each row render
                            let rowStickyLeft = 0;
                            const cbSticky: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 25 };
                            rowStickyLeft += checkboxWidthPx + 1; // +1 for border

                            const indicatorSticky: React.CSSProperties = { position: 'sticky', left: rowStickyLeft, zIndex: 25 };
                            rowStickyLeft += indicatorWidthPx + 1; // +1 for border

                            // Visual Banding & Background Logic
                            const isEvenRow = virtualItem.index % 2 !== 0;

                            // SOLID Backgrounds for sticky cells
                            let rowBgColor = 'bg-surface dark:bg-secondary-800';
                            if (isSelected) {
                                rowBgColor = 'bg-primary-50 dark:bg-primary-900';
                            } else if (isBandedRows && isEvenRow) {
                                rowBgColor = 'bg-secondary-50 dark:bg-secondary-700';
                            }

                            const hoverClass = 'hover:bg-secondary-100 dark:hover:bg-secondary-700';
                            const stickyBgClass = `${rowBgColor} group-hover:bg-secondary-100 dark:group-hover:bg-secondary-700`;

                            return (
                                <div
                                    key={row.id}
                                    style={{
                                        position: 'absolute',
                                        top: `${virtualItem.start}px`,
                                        left: 0,
                                        width: `${totalWidthPx}px`,
                                        height: `${virtualItem.size}px`,
                                    }}
                                    className={`border-b border-border/50 dark:border-secondary-700/50 transition-colors duration-150 group flex items-stretch ${rowBgColor} ${hoverClass}`}
                                >
                                    {/* Sticky Checkbox Cell */}
                                    <div
                                        style={{ width: `${checkboxWidthPx}px`, ...cbSticky }}
                                        className={`px-4 flex items-center justify-center flex-shrink-0 ${cellBorderClass} ${stickyBgClass}`}
                                    >
                                        <input type="checkbox" checked={isSelected} onClick={(e) => handleSelectRow(e, row.id)} onChange={() => { }} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 bg-surface dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600" />
                                    </div>

                                    {/* Concept Indicator Cell */}
                                    <div
                                        style={{ width: `${indicatorWidthPx}px`, ...indicatorSticky }}
                                        className={`flex items-center justify-center flex-shrink-0 ${cellBorderClass} ${stickyBgClass}`}
                                    >
                                        <ConceptIndicatorCell
                                            row={row}
                                            onDoubleClick={() => {
                                                useUIStore.getState().setCurrentScreen(Screen.ConceptLinks);
                                            }}
                                        />
                                    </div>

                                    {/* Editable Cells */}
                                    {visibleOrderedCols.map((col, index) => {
                                        const isSystemId = col.id === SYSTEM_ID_COL_DEF.id;
                                        const defaultWidth = isSystemId ? 88 : 200;
                                        const colWidth = columnWidths[col.id] || defaultWidth;
                                        const isDragAffected = isInDragRange && selectedCell?.columnId === col.id;

                                        // Freeze Logic for Row Cells
                                        const isFrozen = index < frozenColumnCount;
                                        const cellStickyStyle: React.CSSProperties = isFrozen
                                            ? {
                                                position: 'sticky',
                                                left: rowStickyLeft,
                                                zIndex: 20,
                                                borderRight: '1px solid var(--color-border)',
                                                transform: 'translateZ(0)',
                                                WebkitTransform: 'translateZ(0)'
                                            }
                                            : {};

                                        const cellBg = isFrozen ? stickyBgClass : '';

                                        // Range Selection Highlight
                                        const isRangeSelected = selectedRangeIds.has(`${row.id}:${col.id}`);
                                        const rangeBgClass = isRangeSelected ? 'bg-primary-100 dark:bg-primary-900/40' : '';

                                        if (isFrozen) {
                                            rowStickyLeft += colWidth + 1;
                                        }

                                        if (isSystemId) {
                                            // Check if row has validation issues
                                            const validationResult = validationResults.get(row.id);
                                            const hasIssues = validationResult && !validationResult.isValid;

                                            return (
                                                <div key={col.id} style={{ width: `${colWidth}px`, ...cellStickyStyle }} className={`px-2 flex items-center justify-center flex-shrink-0 text-center ${cellBorderClass} ${cellBg} relative`}>
                                                    <span className="font-mono text-xs text-text-subtle font-bold select-none">{row.rowIdNum ? formatHumanId(table.shortCode, row.rowIdNum) : '—'}</span>
                                                    {hasIssues && (
                                                        <div className="absolute -right-1 -top-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center" title="This row has validation issues">
                                                            <Icon name="exclamation-circle" className="w-2 h-2 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        // Check if this specific cell has a validation issue
                                        const validationResult = validationResults.get(row.id);
                                        const cellIssue = validationResult?.issues.find(issue => issue.columnId === col.id);
                                        const hasCellIssue = !!cellIssue;

                                        // Highlight cell if it has an issue
                                        const cellHighlightClass = hasCellIssue
                                            ? 'bg-orange-50 dark:bg-orange-900/20 border-l-2 border-l-orange-400'
                                            : '';

                                        return (
                                            <div
                                                key={col.id}
                                                style={{ width: `${colWidth}px`, ...cellStickyStyle }}
                                                className={`px-2 flex items-center relative flex-shrink-0 ${isFrozen ? '' : cellBorderClass} ${isDragAffected ? 'bg-primary-50/50 dark:bg-primary-900/40' : ''} ${cellBg} ${rangeBgClass} ${cellHighlightClass}`}
                                                onMouseDown={(e) => handleCellMouseDown(e, row.id, col.id)}
                                                onMouseEnter={() => handleCellMouseEnter(row.id, col.id)}
                                                title={hasCellIssue ? `Issue: ${cellIssue.reason === 'missing' ? 'Missing value' : 'Formula error'}` : undefined}
                                            >
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
                                                    editable={true}
                                                />
                                            </div>
                                        );
                                    })}

                                    {/* Read-only Stats */}
                                    {visibleStatDefs.map(stat => <div key={stat.key} style={{ width: '140px' }} className={`px-4 flex items-center text-text-subtle select-none flex-shrink-0 ${cellBorderClass} ${fontSizeClasses}`}>{getStatDisplayValue(row, stat.key)}</div>)}

                                    {/* Actions */}
                                    <div style={{ width: '80px' }} className={`px-4 flex items-center justify-center flex-shrink-0 ${cellBorderClass}`}>
                                        <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                            <Popover
                                                isOpen={menuForRow === row.id}
                                                setIsOpen={(isOpen) => setMenuForRow(isOpen ? row.id : null)}
                                                trigger={
                                                    <button className="p-1.5 text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors">
                                                        <Icon name="dots-horizontal" className="w-4 h-4" />
                                                    </button>
                                                }
                                                contentClassName="w-44 rounded-xl z-50"
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
        )
    }

    return (
        <div className="h-full overflow-hidden w-full relative">
            {renderDataGrid()}

            {/* Knowledge Sidebar */}
            {knowledgeSidebarOpen && knowledgeSidebarRowId && (
                <KnowledgeSidebar
                    row={rows.find(r => r.id === knowledgeSidebarRowId)!}
                    tableId={table.id}
                />
            )}
        </div>
    );
};

export default TableView;
