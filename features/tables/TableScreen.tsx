

import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Table, VocabRow, Relation, Column, AIPrompt, Filter, Sort, Screen, StudyMode, FlashcardStatus } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { generateForPrompt } from '../../services/geminiService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';


import ConfirmationModal from '../../components/ui/ConfirmationModal';
import TableScreenHeader from './components/TableScreenHeader';
import ViewTab from './components/ViewTab';
import RelationsTab from './components/RelationsTab';
import SettingsTab from './components/SettingsTab';
import WordDetailModal from './WordDetailModal';
import WordInfoModal from './components/WordInfoModal';
import ShareModal from './components/ShareModal';
import ColumnEditorModal from './components/ColumnEditorModal';
import RelationSettingsModal from './components/RelationSettingsModal';
import AIPromptModal from './components/AIPromptModal';
import BatchAiModal from './components/BatchAiModal';
import PasteImportModal from './components/PasteImportModal';
import { TableViewProvider, useTableView } from './contexts/TableViewContext';
import { useTagStore } from '../../stores/useTagStore';

const sortableStats = [
    { key: 'stat:priorityScore', label: 'Priority Score' },
    { key: 'stat:rankPoint', label: 'Rank Point' },
    { key: 'stat:level', label: 'Level' },
    { key: 'stat:failed', label: 'Failed' },
    { key: 'stat:totalAttempts', label: 'Total Attempts' },
    { key: 'stat:lastPracticeDate', label: 'Last Practiced' },
    { key: 'stat:wasQuit', label: 'Was Quit' },
    { key: 'stat:inQueueCount', label: 'In Queue' },
    { key: 'stat:successRate', label: 'Success %' }, 
    { key: 'stat:encounters', label: 'Encounters' }, 
    { key: 'stat:lastStudied', label: 'Last Studied' },
    { key: 'stat:ankiRepetitions', label: 'Anki Reps' },
    { key: 'stat:ankiEaseFactor', label: 'Anki EF' },
    { key: 'stat:ankiInterval', label: 'Anki Interval' },
    { key: 'stat:ankiDueDate', label: 'Anki Due' },
];

const BatchDeleteConfirmation: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (rowsToDelete: Set<string>) => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    const { state, dispatch } = useTableView();
    const { selectedRows } = state;

    const handleConfirm = () => {
        onConfirm(selectedRows);
        dispatch({ type: 'SET_SELECTED_ROWS', payload: new Set() });
    };

    return (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={handleConfirm}
            title="Delete Selected Rows"
            message={`Are you sure you want to delete the ${selectedRows.size} selected rows?`}
            warning="This action cannot be undone."
            confirmText="Delete"
        />
    );
};


const TableScreenContent: React.FC<{ table: Table }> = ({ table }) => {
    // Optimization Step 3: Atomic Selector using Custom Equality Check
    const tableNames = useTableStore(
        useShallow(state => state.tables.map(t => ({ id: t.id, name: t.name })))
    );
    
    const updateTable = useTableStore(state => state.updateTable);
    const upsertRow = useTableStore(state => state.upsertRow);
    const addRows = useTableStore(state => state.addRows);
    const deleteRows = useTableStore(state => state.deleteRows);
    const deleteTable = useTableStore(state => state.deleteTable);
    const fetchTablePayload = useTableStore(state => state.fetchTablePayload);
    const loadingTableIds = useTableStore(useShallow(state => state.loadingTableIds));
    const { findOrCreateTagsByName } = useTagStore();

    const { showToast, setCurrentScreen, setIsApiKeyModalOpen, syncStatus } = useUIStore();
    const { isGuest, settings } = useUserStore();
    const { setStudySetupSourceTableId, ankiDeckFilter, clearAnkiDeckFilter, confidenceProgressFilter, clearConfidenceProgressFilter } = useSessionStore();
    const { ankiProgresses, confidenceProgresses } = useSessionDataStore();
    const { state, dispatch } = useTableView();
    const [activeTab, setActiveTab] = React.useState<'view' | 'relations' | 'settings'>('view');
    
    // State for modals
    const [rowToView, setRowToView] = React.useState<VocabRow | null>(null);
    const [rowToEdit, setRowToEdit] = React.useState<VocabRow | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
    const [isColumnEditorOpen, setIsColumnEditorOpen] = React.useState(false);
    const [relationToEdit, setRelationToEdit] = React.useState<Relation | null>(null);
    const [relationToDelete, setRelationToDelete] = React.useState<Relation | null>(null);
    const [columnToConfigureAI, setColumnToConfigureAI] = React.useState<Column | null>(null);
    const [isBatchAiModalOpen, setIsBatchAiModalOpen] = React.useState(false);
    const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = React.useState(false);
    const [pasteData, setPasteData] = React.useState<{ rows: string[][] } | null>(null);
    const [isQuickAddMode, setIsQuickAddMode] = React.useState(false);

    // --- METADATA FIRST STRATEGY: Trigger Payload Fetch ---
    // If rows are missing but rowCount > 0, or we just want to ensure freshness on visit.
    React.useEffect(() => {
        if (!isGuest) {
             fetchTablePayload(table.id);
        }
    }, [table.id, isGuest]);

    const isLoadingPayload = loadingTableIds.has(table.id);

    // --- End Data Fetching ---
    
    // --- Filter Logic ---
    const isAnkiFilterActive = ankiDeckFilter && ankiDeckFilter.tableId === table.id;
    const { preFilteredRowIds: ankiPreFilteredRowIds, ankiDeckName } = React.useMemo(() => {
        if (!isAnkiFilterActive) return { preFilteredRowIds: null, ankiDeckName: undefined };
        const progress = ankiProgresses.find(p => p.id === ankiDeckFilter.progressId);
        if (!progress) return { preFilteredRowIds: null, ankiDeckName: undefined };
        const progressTags = new Set(progress.tagIds);
        const filteredRows = table.rows.filter(row => {
            if (progressTags.size === 0) return true;
            if (!row.tagIds || row.tagIds.length === 0) return false;
            return row.tagIds.some(tagId => progressTags.has(tagId));
        });
        return {
            preFilteredRowIds: new Set(filteredRows.map(r => r.id)),
            ankiDeckName: progress.name,
        };
    }, [isAnkiFilterActive, ankiDeckFilter, ankiProgresses, table.rows]);

    const isConfidenceFilterActive = confidenceProgressFilter && confidenceProgressFilter.tableId === table.id;
    const { preFilteredRowIds: fcPreFilteredRowIds, progressName: fcProgressName, initialTagFilter } = React.useMemo(() => {
        if (!isConfidenceFilterActive) return { preFilteredRowIds: null, progressName: undefined, initialTagFilter: null };
        
        const progress = confidenceProgresses.find(p => p.id === confidenceProgressFilter.progressId);
        if (!progress) return { preFilteredRowIds: null, progressName: undefined, initialTagFilter: null };

        const preFilteredRowIds = new Set<string>(progress.queue);

        const sourceTableNames = tableNames
            .filter(t => progress.tableIds.includes(t.id))
            .map(t => t.name.replace(/\s/g, '_'));
        const autoGeneratedTags = new Set(sourceTableNames.map(name => `FC+${name}`));

        const userFilterTags = new Set<string>(
            (progress.tagIds || []).filter(tagId => !autoGeneratedTags.has(tagId))
        );

        return {
            preFilteredRowIds,
            progressName: progress.name,
            initialTagFilter: userFilterTags.size > 0 ? userFilterTags : null,
        };
    }, [isConfidenceFilterActive, confidenceProgressFilter, confidenceProgresses, tableNames]);

    const finalPreFilteredIds = ankiPreFilteredRowIds || fcPreFilteredRowIds;
    const activeProgressName = ankiDeckName || fcProgressName;
    const onClearFilter = isAnkiFilterActive ? clearAnkiDeckFilter : (isConfidenceFilterActive ? clearConfidenceProgressFilter : undefined);
    // --- End Filter Logic ---


    // --- View Settings Persistence ---
    const viewSettingsKey = `vmind-table-view-settings-${table.id}`;

    React.useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(viewSettingsKey);
            if (savedSettings) {
                dispatch({ type: 'INITIALIZE_VIEW_SETTINGS', payload: JSON.parse(savedSettings) });
            } else {
                dispatch({ type: 'INITIALIZE_VIEW_SETTINGS', payload: {} }); 
            }
        } catch (e) {
            console.error("Failed to load view settings from storage", e);
        }
    }, [table.id, dispatch]);

    React.useEffect(() => {
        const settingsToSave = {
            columnWidths: state.columnWidths,
            rowHeight: state.rowHeight,
            isTextWrapEnabled: state.isTextWrapEnabled,
            fontSize: state.fontSize,
            isBandedRows: state.isBandedRows,
            visibleColumns: Array.from(state.visibleColumns), // Save visibleColumns as array
        };
        localStorage.setItem(viewSettingsKey, JSON.stringify(settingsToSave));
    }, [state.columnWidths, state.rowHeight, state.isTextWrapEnabled, state.fontSize, state.isBandedRows, state.visibleColumns, viewSettingsKey]);
    // --- End View Settings Persistence ---

    const handleUpdateTable = (updated: Partial<Table>) => {
        // Use table.id from prop which is stable
        const currentTable = useTableStore.getState().tables.find(t => t.id === table.id);
        if (currentTable) {
            updateTable({ ...currentTable, ...updated });
        }
    };

    const handleAddNewRow = () => { 
        const newRow: VocabRow = { 
            id: crypto.randomUUID(), 
            cols: {}, 
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } 
        }; 
        setIsQuickAddMode(true);
        setRowToEdit(newRow); 
    };
    
    const handleUpdateRow = async (updatedRow: VocabRow): Promise<boolean> => {
        const success = await upsertRow(table.id, updatedRow);

        if (success && !isQuickAddMode) {
            const isNew = !table.rows.some(r => r.id === updatedRow.id);
            showToast(isNew ? 'Row added successfully.' : 'Row updated successfully.', 'success');
            setRowToEdit(null);
        }
        return success;
    };

    const handleDeleteRow = (rowId: string) => { deleteRows(table.id, [rowId]); showToast('Row deleted.', 'success'); };
    const handleConfirmBatchDelete = (rowsToDelete: Set<string>) => { deleteRows(table.id, Array.from(rowsToDelete)); showToast(`${rowsToDelete.size} rows deleted.`, 'success'); setIsBatchDeleteConfirmOpen(false); };
    
    const handleAddNewColumn = async (name: string): Promise<boolean> => {
        if (!name.trim()) return false;
        const newColumn: Column = { id: crypto.randomUUID(), name: name.trim() };
        const newColumns = [...table.columns, newColumn];
        const success = await updateTable({ ...table, columns: newColumns });
        if (success) {
            showToast('Column added successfully.', 'success');
        }
        return success;
    };
    
    const handleUpdateTagIds = (newTagIds: string[]) => {
        handleUpdateTable({ tagIds: newTagIds });
    };

    const handleSaveColumns = (newColumns: Column[], newAudioConfig: Record<string, { language: string }>, newImageConfig: Table['imageConfig']) => {
        const deletedColIds = new Set(table.columns.filter(c => !newColumns.some(nc => nc.id === c.id)).map(c => c.id));
        const updatedRows = table.rows.map(row => {
            const newCols = { ...row.cols };
            deletedColIds.forEach((id: string) => delete newCols[id]);
            return { ...row, cols: newCols };
        });
        
        handleUpdateTable({ 
            columns: newColumns, 
            rows: updatedRows,
            columnAudioConfig: newAudioConfig,
            imageConfig: newImageConfig
        });
        setIsColumnEditorOpen(false);
        showToast('Table structure updated.', 'success');
    };
    const handleSaveRelation = (rel: Relation) => { const isNew = !table.relations.some(r => r.id === rel.id); handleUpdateTable({ relations: isNew ? [...(table.relations || []), rel] : (table.relations || []).map(r => r.id === rel.id ? rel : r) }); setRelationToEdit(null); showToast(isNew ? 'Relation created.' : 'Relation updated.', 'success'); };
    const handleDeleteRelation = (relId: string) => { handleUpdateTable({ relations: (table.relations || []).filter(r => r.id !== relId) }); setRelationToDelete(null); showToast('Relation deleted.', 'success'); };
    const handleSaveAIPrompt = (prompt: AIPrompt) => { const prompts = (table.aiPrompts || []).filter(p => p.id !== prompt.id); handleUpdateTable({ aiPrompts: [...prompts, prompt] }); setColumnToConfigureAI(null); showToast('AI prompt saved.', 'success'); };
    const handleDeleteAIPrompt = (promptId: string) => { handleUpdateTable({ aiPrompts: (table.aiPrompts || []).filter(p => p.id !== promptId) }); setColumnToConfigureAI(null); showToast('AI prompt deleted.', 'success'); };
    
    const fillablePrompts = React.useMemo(() => {
        return (table.aiPrompts || [])
            .map(prompt => {
                const fillableCells = table.rows.map(row => {
                    const targetEmpty = !row.cols[prompt.targetColumnId];
                    const sourcesPresent = prompt.sourceColumnIds.every(srcId => row.cols[srcId]);
                    return (targetEmpty && sourcesPresent) ? { rowId: row.id, columnId: prompt.targetColumnId } : null;
                }).filter((c): c is { rowId: string, columnId: string } => c !== null);
                return { prompt, fillableCells };
            })
            .filter(p => p.fillableCells.length > 0);
    }, [table.aiPrompts, table.rows]);

    const handleRunAiClick = () => {
        if (fillablePrompts.length > 0) {
            setIsBatchAiModalOpen(true);
        } else {
            const allPromptTargetIds = new Set((table.aiPrompts || []).map(p => p.targetColumnId));
            const unconfiguredColumnWithEmptyCell = table.columns.find(col =>
                !allPromptTargetIds.has(col.id) && table.rows.some(row => !row.cols[col.id])
            );

            if (unconfiguredColumnWithEmptyCell) {
                showToast(`Column '${unconfiguredColumnWithEmptyCell.name}' has empty cells but no AI prompt is configured.`, 'info');
            } else {
                showToast('All AI-fillable cells already have data.', 'info');
            }
        }
    };
    
    const handleBatchGenerate = async (selectedPromptIds: Set<string>) => {
        setIsBatchAiModalOpen(false);
        showToast("Starting AI generation...", 'info');
        let totalFilled = 0;
        const fillable = fillablePrompts.filter(p => selectedPromptIds.has(p.prompt.id));
        
        const generationPromises = [];
        for (const { prompt, fillableCells } of fillable) {
            for (const cell of fillableCells.slice(0, 5 - totalFilled)) { // Limit to 5 total
                const row = table.rows.find(r => r.id === cell.rowId);
                if (!row) continue;
                const sourceValues = prompt.sourceColumnIds.reduce((acc, srcId) => { const colName = table.columns.find(c => c.id === srcId)?.name; if (colName) acc[colName] = row.cols[srcId] || ''; return acc; }, {} as Record<string, string>);
                generationPromises.push(generateForPrompt(prompt.prompt, sourceValues).then(result => ({ rowId: cell.rowId, columnId: cell.columnId, result })));
                totalFilled++;
            }
        }

        try {
            const results = await Promise.all(generationPromises);
            handleUpdateTable({
                rows: table.rows.map(row => {
                    const updates = results.filter(res => res.rowId === row.id);
                    if (updates.length === 0) return row;
                    const newCols = { ...row.cols };
                    updates.forEach(u => newCols[u.columnId] = u.result);
                    return { ...row, cols: newCols };
                })
            });
            showToast(`Successfully generated ${results.length} cells.`, 'success');
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") { setIsApiKeyModalOpen(true); }
            else { showToast("An AI error occurred during batch generation.", "error"); }
        }
    };

    // FIX: Removed 'Scramble' case as Screen.ScrambleSetup is obsolete.
    const handleStudyNavigation = (mode: 'StudySession' | 'Confidence' | 'Theater') => {
        setStudySetupSourceTableId(table.id);
        switch (mode) {
            case 'StudySession':
                setCurrentScreen(Screen.StudySetup);
                break;
            case 'Confidence':
                setCurrentScreen(Screen.Confidence);
                break;
            case 'Theater':
                setCurrentScreen(Screen.TheaterSetup);
                break;
        }
    };

    const handleConfirmPasteImport = (newRows: VocabRow[]) => {
        if (newRows.length > 0) {
            addRows(table.id, newRows);
            showToast(`Imported ${newRows.length} new rows.`, 'success');
        }
        setPasteData(null);
    };

    const handlePasteClick = () => {
        showToast("Copied from a spreadsheet? Just paste to import.", 'info');
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <div className="flex-shrink-0 p-4 sm:p-6">
                <TableScreenHeader
                    tableName={table.name}
                    isGuest={isGuest}
                    isPublic={table.isPublic}
                    onBack={() => setCurrentScreen(Screen.Tables)}
                    onUpdateName={(name) => handleUpdateTable({ name })}
                    onShareClick={() => setIsShareModalOpen(true)}
                    onStudyClick={handleStudyNavigation}
                    tagIds={table.tagIds || []}
                    onUpdateTagIds={handleUpdateTagIds}
                    tagColors={settings.tagColors || {}}
                />
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <div className="flex space-x-4">
                        <button onClick={() => setActiveTab('view')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'view' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>View</button>
                        <button onClick={() => setActiveTab('relations')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'relations' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Relations</button>
                        <button onClick={() => setActiveTab('settings')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'settings' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-slate-500'}`}>Settings</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-4">
                {activeTab === 'view' && (
                    <div className="animate-fadeIn">
                        <ViewTab 
                            table={table} 
                            isLoading={isLoadingPayload}
                            sortableStats={sortableStats} 
                            fillablePrompts={fillablePrompts} 
                            preFilteredRowIds={finalPreFilteredIds}
                            progressName={activeProgressName}
                            initialTagFilter={initialTagFilter}
                            onClearFilter={onClearFilter}
                            onAddNewRow={handleAddNewRow} 
                            onViewRow={setRowToView}
                            onEditRow={setRowToEdit}
                            onDeleteRow={handleDeleteRow}
                            onManageColumns={() => setIsColumnEditorOpen(true)}
                            onConfigureAI={setColumnToConfigureAI} 
                            onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
                            onConfirmBatchGenerate={() => setIsBatchAiModalOpen(true)} 
                            onRunAiClick={handleRunAiClick}
                            onPasteData={setPasteData}
                            onPasteClick={handlePasteClick}
                        />
                         <BatchDeleteConfirmation 
                            isOpen={isBatchDeleteConfirmOpen}
                            onClose={() => setIsBatchDeleteConfirmOpen(false)}
                            onConfirm={handleConfirmBatchDelete}
                        />
                    </div>
                )}
                {activeTab === 'relations' && <div className="animate-fadeIn"><RelationsTab table={table} onOpenNewRelation={() => setRelationToEdit({id: crypto.randomUUID(), name: 'New Relation', questionColumnIds: [], answerColumnIds: [], compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice, StudyMode.Typing]})} onOpenRelationSettings={(relation, tab) => setRelationToEdit(relation)} setRelationToDelete={setRelationToDelete} /></div>}
                {activeTab === 'settings' && <div className="animate-fadeIn"><SettingsTab table={table} onManageColumns={() => setIsColumnEditorOpen(true)} onConfigureAI={setColumnToConfigureAI} onUpdateTable={(t) => updateTable(t)}/></div>}
            </div>
            
            <WordInfoModal
                isOpen={!!rowToView}
                row={rowToView}
                table={table}
                onClose={() => setRowToView(null)}
                onEdit={() => {
                    if (rowToView) {
                        setRowToEdit(rowToView);
                        setRowToView(null);
                    }
                }}
            />
            <WordDetailModal 
                isOpen={!!rowToEdit} 
                row={rowToEdit} 
                table={table}
                columns={table.columns} 
                aiPrompts={table.aiPrompts} 
                imageConfig={table.imageConfig} 
                audioConfig={table.audioConfig} 
                onClose={() => { setRowToEdit(null); setIsQuickAddMode(false); }} 
                onSave={handleUpdateRow} 
                onDelete={handleDeleteRow} 
                onConfigureAI={setColumnToConfigureAI} 
                onAddColumn={handleAddNewColumn} 
                quickAddMode={isQuickAddMode}
            />
            <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} table={table} onShare={(desc, tags) => { 
                const tagNames = tags.split(',').map(t => t.trim()).filter(Boolean);
                const tagObjects = findOrCreateTagsByName(tagNames);
                const tagIds = tagObjects.map(t => t.id);
                handleUpdateTable({ description: desc, tagIds, isPublic: true }); 
                setIsShareModalOpen(false); 
                showToast('Sharing settings updated.', 'success'); 
            }} />
            <ColumnEditorModal isOpen={isColumnEditorOpen} onClose={() => setIsColumnEditorOpen(false)} table={table} onSave={handleSaveColumns} />
            <RelationSettingsModal isOpen={!!relationToEdit} onClose={() => setRelationToEdit(null)} onSave={handleSaveRelation} relation={relationToEdit} table={table} />
            <ConfirmationModal isOpen={!!relationToDelete} onClose={() => setRelationToDelete(null)} onConfirm={() => handleDeleteRelation(relationToDelete!.id)} title="Delete Relation" message={`Delete "${relationToDelete?.name}"?`} />
            <AIPromptModal isOpen={!!columnToConfigureAI} onClose={() => setColumnToConfigureAI(null)} onSave={handleSaveAIPrompt} onDelete={handleDeleteAIPrompt} targetColumn={columnToConfigureAI} tableColumns={table.columns} promptToEdit={(table.aiPrompts || []).find(p => p.targetColumnId === columnToConfigureAI?.id) || null} />
            <BatchAiModal isOpen={isBatchAiModalOpen} onClose={() => setIsBatchAiModalOpen(false)} onGenerate={handleBatchGenerate} fillablePrompts={fillablePrompts} columns={table.columns} />
            {pasteData && (
                <PasteImportModal
                    isOpen={!!pasteData}
                    onClose={() => setPasteData(null)}
                    onConfirm={handleConfirmPasteImport}
                    pastedData={pasteData}
                    table={table}
                />
            )}
        </div>
    );
};

const TableScreen: React.FC<{ tableId: string }> = ({ tableId }) => {
    const table = useTableStore(useShallow(state => state.tables.find(t => t.id === tableId)));
    const { ankiDeckFilter, confidenceProgressFilter } = useSessionStore();

    if (!table) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-text-subtle">
                 <p className="text-lg font-semibold">Table not found.</p>
                 <p className="text-sm">It may have been deleted.</p>
            </div>
        );
    }

    const isAnkiFilterActive = ankiDeckFilter && ankiDeckFilter.tableId === table.id;
    const isConfidenceFilterActive = confidenceProgressFilter && confidenceProgressFilter.tableId === table.id;

    const defaultVisibleStats = React.useMemo(() => {
        if (isAnkiFilterActive) {
            return new Set(['stat:ankiDueDate', 'stat:ankiInterval', 'stat:ankiEaseFactor']);
        }
        if (isConfidenceFilterActive) {
            return new Set(['stat:flashcardStatus']);
        }
        return undefined;
    }, [isAnkiFilterActive, isConfidenceFilterActive]);

    return (
        <TableViewProvider columns={table.columns} defaultVisibleStats={defaultVisibleStats}>
            <TableScreenContent table={table} />
        </TableViewProvider>
    );
};

export default TableScreen;
