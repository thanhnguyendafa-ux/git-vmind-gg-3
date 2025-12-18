
import * as React from 'react';
import { useTableScreen } from '../../contexts/TableScreenContext';
import { useTableOperations } from '../../hooks/useTableOperations';
import { useNoteStore } from '../../../../stores/useNoteStore';
import { useTableStore } from '../../../../stores/useTableStore';
import { useUIStore } from '../../../../stores/useUIStore';
import { generateForPrompt } from '../../../../services/geminiService';
import { useTableView } from '../../contexts/TableViewContext';

// Modals
import WordInfoModal from '../WordInfoModal';
import WordDetailModal from '../../WordDetailModal';
import RowPreviewOrchestrator from '../RowPreviewOrchestrator';
import PublishModal from '../Library/PublishModal';
import ColumnEditorModal from '../ColumnEditorModal';
import RelationSettingsModal from '../RelationSettingsModal';
import ConfirmationModal from '../../../../components/ui/ConfirmationModal';
import AIPromptModal from '../AIPromptModal';
import BatchAiModal from '../BatchAiModal';
import PasteImportModal from '../PasteImportModal';
import LinkTemplateModal from '../LinkTemplateModal';

export const TableModalsContainer: React.FC = () => {
    const {
        table,
        rowToView, setRowToView,
        rowToEdit, setRowToEdit,
        isQuickAddMode, setIsQuickAddMode,
        previewRow, setPreviewRow,
        isPublishModalOpen, setIsPublishModalOpen,
        isColumnEditorOpen, setIsColumnEditorOpen,
        relationToEdit, setRelationToEdit,
        relationToDelete, setRelationToDelete,
        columnToConfigureAI, setColumnToConfigureAI,
        isBatchAiModalOpen, setIsBatchAiModalOpen,
        pasteData, setPasteData,
        linkTemplateCol, setLinkTemplateCol,
        isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen
    } = useTableScreen();

    const {
        handleUpdateRow,
        handleDeleteRow,
        handleAddNewColumn,
        handleSaveColumns,
        handleSaveRelation,
        handleDeleteRelation,
        handleSaveAIPrompt,
        handleDeleteAIPrompt,
        handleUpdateTable,
        handleBatchDelete,
        handleConfirmPasteImport,
        handleSaveLinkTemplate
    } = useTableOperations(table);

    const { handleSaveToJournal } = useNoteStore();
    const { showToast, setIsApiKeyModalOpen } = useUIStore();
    const { batchUpdateRows } = useTableStore();
    
    // Connect to TableView Context for batch operations selection
    const { state, dispatch } = useTableView();

    // Batch Generation Logic
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

            // Group updates by row to minimize operations
            const updatesByRow: Record<string, Record<string, string>> = {};
            results.forEach(({ rowId, columnId, result }) => {
                if (!updatesByRow[rowId]) updatesByRow[rowId] = {};
                updatesByRow[rowId][columnId] = result;
            });

            const batchUpdates = Object.entries(updatesByRow).map(([rowId, newCols]) => ({
                rowId,
                changes: { cols: newCols }
            }));

            if (batchUpdates.length > 0) {
                await batchUpdateRows(table.id, batchUpdates);
                showToast(`Successfully generated ${results.length} cells.`, 'success');
            }
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") { setIsApiKeyModalOpen(true); }
            else { showToast("An AI error occurred during batch generation.", "error"); }
        }
    };

    return (
        <>
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
                onSave={(r) => handleUpdateRow(r, isQuickAddMode)} 
                onDelete={handleDeleteRow} 
                onConfigureAI={setColumnToConfigureAI} 
                onAddColumn={handleAddNewColumn} 
                quickAddMode={isQuickAddMode}
            />
            {previewRow && (
                <RowPreviewOrchestrator
                    isOpen={true}
                    onClose={() => setPreviewRow(null)}
                    row={previewRow}
                    table={table}
                    onSaveToJournal={handleSaveToJournal}
                />
            )}
            <PublishModal 
                isOpen={isPublishModalOpen} 
                onClose={() => setIsPublishModalOpen(false)} 
                table={table} 
            />
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
             {linkTemplateCol && (
                <LinkTemplateModal
                    isOpen={!!linkTemplateCol}
                    onClose={() => setLinkTemplateCol(null)}
                    table={table}
                    column={linkTemplateCol}
                    onSave={(template) => handleSaveLinkTemplate(linkTemplateCol.id, template)}
                />
            )}
            <ConfirmationModal
                isOpen={isBatchDeleteConfirmOpen}
                onClose={() => setIsBatchDeleteConfirmOpen(false)}
                onConfirm={() => {
                     handleBatchDelete(state.selectedRows);
                     dispatch({ type: 'SET_SELECTED_ROWS', payload: new Set() });
                     setIsBatchDeleteConfirmOpen(false); 
                }}
                title="Delete Selected Rows"
                message={`Are you sure you want to delete ${state.selectedRows.size} row(s)?`}
                warning="This action cannot be undone."
                confirmText="Delete"
                confirmVariant="destructive"
            />
        </>
    );
};
