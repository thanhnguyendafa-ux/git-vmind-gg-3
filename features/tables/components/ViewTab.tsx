
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
import { useTableStore } from '../../../stores/useTableStore';
import { parseSmartClipboard } from '../../../utils/clipboardUtils';
import { useUIStore } from '../../../stores/useUIStore';
import Popover from '../../../components/ui/Popover';

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
    onDeleteRow: (rowId: string) => void; 
    onPreviewRow: (row: VocabRow) => void; // New prop
    onConfigureAI: (column: Column) => void;
    onConfigureLink: (column: Column) => void;
    onBatchDelete: () => void;
    onConfirmBatchGenerate: () => void;
    onRunAiClick: () => void;
    onManageColumns: () => void;
    onPasteData: (data: { rows: string[][] }) => void;
    onPasteClick: () => void;
}

const ViewTab: React.FC<ViewTabProps> = (props) => {
    const { table, isLoading, onBatchDelete, onConfirmBatchGenerate, fillablePrompts, onRunAiClick, onPasteData, onPasteClick, preFilteredRowIds, progressName, initialTagFilter, onClearFilter, onDeleteRow, onPreviewRow, sortableStats, onViewRow } = props;
    const { state, dispatch } = useTableView();
    const { selectedRows, visibleColumns, visibleStats, fontSize } = state;
    const { showToast } = useUIStore();
    const [isSelectionMenuOpen, setIsSelectionMenuOpen] = React.useState(false);

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
            for (const colId of visibleColumns) {
                if (fillableCellsSet.has(`${rowId}:${colId}`)) {
                    return true;
                }
            }
        }
        return false;
    }, [selectedRows, fillableCellsSet, visibleColumns]);
    
    // Find selected row data for single-row actions
    const singleSelectedRow = React.useMemo(() => {
        if (selectedRows.size === 1) {
            const rowId = selectedRows.values().next().value;
            return table.rows.find(r => r.id === rowId);
        }
        return null;
    }, [selectedRows, table.rows]);

    React.useEffect(() => {
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 1 });
    }, [table.id, dispatch]);

    // --- View Settings Persistence (Sync-Enabled) ---
    const viewSettingsKey = `vmind-table-view-settings-${table.id}`;

    React.useEffect(() => {
        // Initialization Priority:
        // 1. Cloud Config (table.viewConfig) - The single source of truth for persistent settings.
        // 2. Local Storage (Legacy/Fallback) - Used if cloud config is missing or for local-only prefs.
        
        let initialSettings: any = {};
        
        try {
            const savedSettings = localStorage.getItem(viewSettingsKey);
            if (savedSettings) {
                initialSettings = JSON.parse(savedSettings);
            }
        } catch (e) {
            console.error("Failed to load local view settings", e);
        }

        // Overlay Cloud Settings if available
        if (table.viewConfig) {
            initialSettings = {
                ...initialSettings,
                isTextWrapEnabled: table.viewConfig.isTextWrapEnabled ?? initialSettings.isTextWrapEnabled,
                isBandedRows: table.viewConfig.isBandedRows ?? initialSettings.isBandedRows,
                rowHeight: table.viewConfig.rowHeight ?? initialSettings.rowHeight,
                visibleColumns: table.viewConfig.visibleColumns ?? initialSettings.visibleColumns,
                columnOrder: table.viewConfig.columnOrder ?? initialSettings.columnOrder,
                frozenColumnCount: table.viewConfig.frozenColumnCount ?? initialSettings.frozenColumnCount
            };
        }

        dispatch({ type: 'INITIALIZE_VIEW_SETTINGS', payload: initialSettings });
    }, [table.id, dispatch]); // Run only on mount/table switch. table.viewConfig changes are handled via local state.

    React.useEffect(() => {
        // 1. Save all settings to LocalStorage (Cache)
        const settingsToSave = {
            columnWidths: state.columnWidths,
            rowHeight: state.rowHeight,
            isTextWrapEnabled: state.isTextWrapEnabled,
            isBandedRows: state.isBandedRows,
            fontSize: state.fontSize,
            visibleColumns: Array.from(state.visibleColumns),
            columnOrder: state.columnOrder,
            frozenColumnCount: state.frozenColumnCount
        };
        localStorage.setItem(viewSettingsKey, JSON.stringify(settingsToSave));
    }, [
        state.columnWidths, state.rowHeight, state.isTextWrapEnabled, state.isBandedRows, state.fontSize, state.visibleColumns, 
        state.columnOrder, state.frozenColumnCount,
        viewSettingsKey
    ]);
    
    // Access updateTable via hook
    const updateTable = useTableStore(state => state.updateTable);

    // Re-implement the sync effect correctly
    React.useEffect(() => {
        const currentConfig = table.viewConfig || {};
        
        const isWrapChanged = state.isTextWrapEnabled !== currentConfig.isTextWrapEnabled;
        const isBandedChanged = state.isBandedRows !== currentConfig.isBandedRows;
        const isHeightChanged = state.rowHeight !== currentConfig.rowHeight;
        const isFrozenChanged = state.frozenColumnCount !== currentConfig.frozenColumnCount;
        
        // Deep compare array
        const currentVisCols = (currentConfig.visibleColumns || []).slice().sort();
        const newVisCols = Array.from(state.visibleColumns).slice().sort();
        const isVisColsChanged = JSON.stringify(currentVisCols) !== JSON.stringify(newVisCols);
        
        const isOrderChanged = JSON.stringify(currentConfig.columnOrder || []) !== JSON.stringify(state.columnOrder);

        if (isWrapChanged || isBandedChanged || isHeightChanged || isVisColsChanged || isOrderChanged || isFrozenChanged) {
             const newViewConfig = {
                ...currentConfig,
                isTextWrapEnabled: state.isTextWrapEnabled,
                isBandedRows: state.isBandedRows,
                rowHeight: state.rowHeight,
                visibleColumns: Array.from(state.visibleColumns),
                columnOrder: state.columnOrder,
                frozenColumnCount: state.frozenColumnCount
             };
             
             updateTable({ ...table, viewConfig: newViewConfig });
        }
    }, [
        state.isTextWrapEnabled, state.isBandedRows, state.rowHeight, state.visibleColumns, 
        state.columnOrder, state.frozenColumnCount,
        table, updateTable
    ]);


    React.useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
                return;
            }
            
            e.preventDefault();
            
            if (e.clipboardData) {
                const parsed = parseSmartClipboard(e.clipboardData);
                if (parsed.rows.length > 0) {
                    onPasteData({ rows: parsed.rows });
                    if (parsed.source === 'html') {
                        showToast(`Smart Paste detected: ${parsed.rows.length} rows with formatting.`, 'info');
                    }
                }
            }
        };

        document.addEventListener('paste', handlePaste);
        return () => document.removeEventListener('paste', handlePaste);
    }, [onPasteData, showToast]);

    const batchFillCount = fillablePrompts.reduce((sum, p) => sum + p.fillableCells.length, 0);

    const handleSingleRowDelete = (row: VocabRow) => {
        onDeleteRow(row.id);
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-center">
                <div>
                    <Icon name="spinner" className="w-10 h-10 text-primary-500 mx-auto animate-spin mb-4" />
                    <p className="text-text-subtle">Loading rows...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0">
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
            </div>
            
            <div className="flex-1 min-w-0 overflow-hidden relative">
                {processedRows.length === 0 ? (
                    <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 rounded-lg shadow-lg border border-border dark:border-secondary-700 mt-4">
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
                            sortableStats={sortableStats}
                            onViewRow={props.onViewRow}
                            onEditRow={props.onEditRow}
                            onDeleteRow={handleSingleRowDelete}
                            onPreviewRow={onPreviewRow}
                            onConfigureAI={props.onConfigureAI}
                            onConfigureLink={props.onConfigureLink}
                            onManageColumns={props.onManageColumns}
                        />
                    ) : (
                        <GalleryView 
                            table={table}
                            rows={processedRows}
                            groupedRows={groupedRows}
                            visibleColumns={visibleColumns}
                            visibleStats={visibleStats}
                            sortableStats={sortableStats}
                            fontSize={fontSize}
                            onEditRow={props.onEditRow}
                        />
                    )
                )}
            </div>
            
            {selectedRows.size > 0 && (
                <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[60] w-auto animate-slideInUp max-w-[90vw]">
                    {/* ... (Existing toolbar code) ... */}
                    <div className="hidden md:flex bg-slate-800 text-white rounded-lg shadow-xl border border-slate-700 items-center gap-2 px-3 py-2">
                        <span className="text-sm font-semibold mr-2 whitespace-nowrap">{selectedRows.size} selected</span>
                        {singleSelectedRow && (
                            <>
                                <button onClick={() => onViewRow(singleSelectedRow)} className="flex items-center gap-1.5 text-sm text-primary-300 hover:text-white font-semibold px-2 py-1 hover:bg-slate-700 rounded transition-colors"><Icon name="eye" className="w-4 h-4"/>Open</button>
                                <button onClick={() => onPreviewRow(singleSelectedRow)} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-1 hover:bg-slate-700 rounded transition-colors"><Icon name="play" className="w-4 h-4"/>Preview</button>
                            </>
                        )}
                        <div className="w-px h-4 bg-slate-600 mx-1"></div>
                        {hasFillableSelected && (
                            <button onClick={onConfirmBatchGenerate} className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 font-semibold animate-ai-glow px-2 py-1 hover:bg-slate-700 rounded transition-colors"><Icon name="sparkles" className="w-4 h-4"/>AI Fill</button>
                        )}
                        <button onClick={onBatchDelete} className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 font-semibold px-2 py-1 hover:bg-slate-700 rounded transition-colors"><Icon name="trash" className="w-4 h-4"/>Delete</button>
                        <div className="w-px h-4 bg-slate-600 mx-1"></div>
                        <button onClick={() => dispatch({type: 'SET_SELECTED_ROWS', payload: new Set()})} className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-slate-700"><Icon name="x" className="w-4 h-4"/></button>
                    </div>

                    <div className="flex md:hidden bg-slate-800 text-white rounded-full shadow-xl shadow-primary-500/20 border border-slate-700 items-center pl-5 pr-2 py-2 gap-2">
                        <span className="text-sm font-bold whitespace-nowrap mr-auto">{selectedRows.size} selected</span>
                        {singleSelectedRow && (<button onClick={() => onViewRow(singleSelectedRow)} className="p-2 rounded-full hover:bg-slate-700 text-primary-300 transition-colors" title="Open"><Icon name="eye" className="w-5 h-5"/></button>)}
                        <Popover isOpen={isSelectionMenuOpen} setIsOpen={setIsSelectionMenuOpen} breakpoint={768} trigger={<button className="p-2 rounded-full hover:bg-slate-700 text-white transition-colors"><Icon name="dots-horizontal" className="w-5 h-5" /></button>} contentClassName="w-56 mb-2 rounded-xl overflow-hidden">
                            <div className="p-1 space-y-1">
                                <div className="px-3 py-2 text-xs font-bold text-text-subtle uppercase border-b border-secondary-200 dark:border-secondary-700 mb-1">{selectedRows.size} items selected</div>
                                {singleSelectedRow && ( <button onClick={() => { onPreviewRow(singleSelectedRow); setIsSelectionMenuOpen(false); }} className="w-full text-left px-3 py-3 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-3 text-text-main dark:text-secondary-100"> <Icon name="play" className="w-5 h-5 text-emerald-500" /> Preview Card </button>)}
                                {hasFillableSelected && ( <button onClick={() => { onConfirmBatchGenerate(); setIsSelectionMenuOpen(false); }} className="w-full text-left px-3 py-3 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-3 text-text-main dark:text-secondary-100"> <Icon name="sparkles" className="w-5 h-5 text-cyan-500" /> AI Fill Empty Cells </button>)}
                                <button onClick={() => { onBatchDelete(); setIsSelectionMenuOpen(false); }} className="w-full text-left px-3 py-3 text-sm hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md flex items-center gap-3 text-error-600 dark:text-error-400"> <Icon name="trash" className="w-5 h-5" /> Delete Selected </button>
                            </div>
                        </Popover>
                        <div className="w-px h-6 bg-slate-600 mx-1"></div>
                        <button onClick={() => dispatch({type: 'SET_SELECTED_ROWS', payload: new Set()})} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"> <Icon name="x" className="w-5 h-5"/> </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewTab;
