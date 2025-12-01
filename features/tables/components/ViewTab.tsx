
import * as React from 'react';
import { Table, VocabRow, Column, AIPrompt, Filter, Sort } from '../../../types';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';
import TableViewControls from './TableViewControls';
import TableView from './TableView';
import GalleryView from './GalleryView';
import { useTableView } from '../contexts/TableViewContext';
import { useProcessedTableData } from '../hooks/useProcessedTableData';
import { Button } from '../../../components/ui/Button';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

interface ViewTabProps {
    table: Table;
    isLoading?: boolean;
    sortableStats: { key: string, label: string }[];
    fillablePrompts: { prompt: AIPrompt; fillableCells: { rowId: string; columnId: string; }[] }[];
    preFilteredRowIds?: Set<string> | null;
    progressName?: string;
    initialTagFilter?: Set<string> | null;
    onClearFilter?: () => void;
    onAddNewRow: () => void;
    onViewRow: (row: VocabRow) => void;
    onEditRow: (row: VocabRow) => void;
    onDeleteRow: (rowId: string) => void; // Changed to take rowId for simplicity or full row
    onConfigureAI: (column: Column) => void;
    onBatchDelete: () => void;
    onConfirmBatchGenerate: () => void;
    onRunAiClick: () => void;
    onManageColumns: () => void;
    onPasteData: (data: { rows: string[][] }) => void;
    onPasteClick: () => void;
}

const ViewTab: React.FC<ViewTabProps> = (props) => {
    const { table, isLoading, onBatchDelete, onConfirmBatchGenerate, fillablePrompts, onRunAiClick, onPasteData, onPasteClick, preFilteredRowIds, progressName, initialTagFilter, onClearFilter, onDeleteRow } = props;
    const { state, dispatch } = useTableView();
    const { selectedRows, grouping, visibleColumns, visibleStats, fontSize } = state;

    // Use useLocalStorage for persistent view mode
    const [viewMode, setViewMode] = useLocalStorage<'table' | 'gallery'>(`vmind-view-mode-${table.id}`, 'table');
    
    const { processedRows, groupedRows } = useProcessedTableData({ rows: table.rows, table, preFilteredRowIds, initialTagFilter });
    
    const fillableCellsSet = React.useMemo(() => {
        const cellSet = new Set<string>();
        fillablePrompts.forEach(({ fillableCells }) => {
            fillableCells.forEach(cell => {
                cellSet.add(`${cell.rowId}:${cell.columnId}`);
            });
        });
        return cellSet;
    }, [fillablePrompts]);

    const hasFillableSelected = React.useMemo(() => {
        if (!selectedRows.size || !fillableCellsSet.size) return false;
        for (const rowId of selectedRows) {
            for (const col of table.columns) {
                if (fillableCellsSet.has(`${rowId}:${col.id}`)) {
                    return true;
                }
            }
        }
        return false;
    }, [selectedRows, fillableCellsSet, table.columns]);

    React.useEffect(() => {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
    }, [table.id, dispatch]);

    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
                return;
            }
            
            const text = e.clipboardData?.getData('text/plain');
            if (!text || !text.trim()) return;
            
            e.preventDefault();

            const rows = text.trim().split('\n').map(row => row.split('\t'));
            if (rows.length === 0) return;
            
            onPasteData({ rows });
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [onPasteData]);

    const batchFillCount = fillablePrompts.reduce((sum, p) => sum + p.fillableCells.length, 0);

    // Local state for single row deletion confirmation if needed, 
    // but the parent TableScreen already has `deleteRows`.
    // To properly implement "Delete Record", we should hook up the prop.
    // `onDeleteRow` prop expects an ID. `TableView` might pass the full row.
    // Adapter function:
    const handleSingleRowDelete = (row: VocabRow) => {
        onDeleteRow(row.id);
    };

    if (isLoading) {
        return (
            <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg">
                <Icon name="spinner" className="w-10 h-10 text-primary-500 mx-auto animate-spin mb-4" />
                <p className="text-text-subtle">Loading rows...</p>
            </div>
        );
    }

    return (
        <>
            {preFilteredRowIds && progressName && onClearFilter && (
                <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between animate-fadeIn">
                    <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                        Viewing cards from: <span className="font-bold">{progressName}</span>
                        {initialTagFilter && initialTagFilter.size > 0 && (
                             <span className="text-xs italic ml-2">
                                (filtered by tags: {[...initialTagFilter].map(tag => tag.startsWith('FC+') ? tag.substring(3).replace(/_/g, ' ') : tag).join(', ')})
                            </span>
                        )}
                    </p>
                    <Button variant="ghost" size="sm" onClick={onClearFilter}>Clear Filter</Button>
                </div>
            )}
            <TableViewControls 
                {...props}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onManageColumns={props.onManageColumns}
                onRunAiClick={onRunAiClick}
                onPasteClick={onPasteClick}
                batchFillCount={batchFillCount}
            />
            
            {processedRows.length === 0 ? (
                <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg">
                    <TableIcon className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">This Table is Empty</h2>
                    <p className="text-text-subtle mt-2">Click "New" to add your first vocabulary row.</p>
                </div>
            ) : (
                viewMode === 'table' ? (
                    <TableView 
                        table={table}
                        rows={processedRows}
                        groupedRows={groupedRows}
                        fillableCells={fillableCellsSet}
                        {...props}
                        onDeleteRow={handleSingleRowDelete}
                    />
                ) : (
                    <GalleryView 
                        table={table}
                        rows={processedRows}
                        groupedRows={groupedRows}
                        visibleColumns={visibleColumns}
                        visibleStats={visibleStats}
                        fontSize={fontSize}
                        {...props}
                    />
                )
            )}
            
            {selectedRows.size > 0 && (
                <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-auto animate-slideInUp">
                    <div className="bg-slate-800 text-white rounded-lg shadow-lg flex items-center gap-4 px-4 py-2">
                        <span className="text-sm font-semibold">{selectedRows.size} selected</span>
                        <button onClick={onBatchDelete} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 font-semibold">
                            <Icon name="trash" className="w-5 h-5"/>
                            Delete
                        </button>
                        {hasFillableSelected && (
                            <>
                                <div className="w-px h-5 bg-slate-600"></div>
                                <button onClick={onConfirmBatchGenerate} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 font-semibold animate-ai-glow">
                                    <Icon name="sparkles" className="w-5 h-5"/>
                                    AI Fill
                                </button>
                            </>
                        )}
                        <div className="w-px h-5 bg-slate-600"></div>
                        <button onClick={() => dispatch({type: 'SET_SELECTED_ROWS', payload: new Set()})} className="text-sm text-slate-300 hover:text-white">
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ViewTab;