
import * as React from 'react';
import { Table, VocabRow, StudyMode, FlashcardStatus } from '../../../../types';
import { useTableScreen } from '../../contexts/TableScreenContext';
import { useTableOperations } from '../../hooks/useTableOperations';
import ViewTab from '../ViewTab';
import RelationsTab from '../RelationsTab';
import SettingsTab from '../SettingsTab';
import { useUIStore } from '../../../../stores/useUIStore';
import { generateForPrompt } from '../../../../services/geminiService';

interface TableContentAreaProps {
    table: Table;
    isLoadingPayload: boolean;
    sortableStats: { key: string, label: string }[];
    fillablePrompts: any[];
    finalPreFilteredIds: Set<string> | null;
    activeProgressName: string | undefined;
    initialTagFilter: Set<string> | null;
    onClearFilter?: () => void;
}

const TableContentArea: React.FC<TableContentAreaProps> = ({
    table,
    isLoadingPayload,
    sortableStats,
    fillablePrompts,
    finalPreFilteredIds,
    activeProgressName,
    initialTagFilter,
    onClearFilter
}) => {
    const { 
        activeTab, 
        setRowToView, 
        setRowToEdit, 
        setPreviewRow, 
        setRelationToEdit, 
        setRelationToDelete,
        setIsColumnEditorOpen,
        setIsBatchDeleteConfirmOpen,
        setIsBatchAiModalOpen,
        setIsQuickAddMode,
        setColumnToConfigureAI,
        setLinkTemplateCol,
        setPasteData
    } = useTableScreen();

    const { handleUpdateTable, handleDeleteRow } = useTableOperations(table);
    const { showToast, setIsApiKeyModalOpen } = useUIStore();

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

    const handleAddNewRow = () => { 
        const newRow: VocabRow = { 
            id: crypto.randomUUID(), 
            cols: {}, 
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } 
        }; 
        setIsQuickAddMode(true);
        setRowToEdit(newRow); 
    };

    const handlePasteClick = () => {
        showToast("Copied from a spreadsheet? Just paste to import.", 'info');
    };

    if (activeTab === 'view') {
        return (
            <div className="h-full px-4 sm:px-6 pt-2 pb-0 animate-fadeIn">
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
                    onPreviewRow={setPreviewRow}
                    onManageColumns={() => setIsColumnEditorOpen(true)}
                    onConfigureAI={setColumnToConfigureAI}
                    onConfigureLink={setLinkTemplateCol} 
                    onBatchDelete={() => setIsBatchDeleteConfirmOpen(true)}
                    onConfirmBatchGenerate={() => setIsBatchAiModalOpen(true)} 
                    onRunAiClick={handleRunAiClick}
                    onPasteData={setPasteData}
                    onPasteClick={handlePasteClick}
                />
            </div>
        );
    }
    
    return (
        <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 animate-fadeIn">
            {activeTab === 'relations' && (
                <RelationsTab 
                    table={table} 
                    onOpenNewRelation={() => setRelationToEdit({
                        id: crypto.randomUUID(), 
                        name: 'New Relation', 
                        questionColumnIds: [], 
                        answerColumnIds: [], 
                        compatibleModes: [StudyMode.Flashcards, StudyMode.MultipleChoice, StudyMode.Typing]
                    })} 
                    onOpenRelationSettings={(relation, tab) => setRelationToEdit(relation)} 
                    setRelationToDelete={setRelationToDelete} 
                />
            )}
            {activeTab === 'settings' && (
                <SettingsTab 
                    table={table} 
                    onManageColumns={() => setIsColumnEditorOpen(true)} 
                    onConfigureAI={setColumnToConfigureAI} 
                    onUpdateTable={(t) => handleUpdateTable(t)}
                />
            )}
        </div>
    );
};

export default TableContentArea;
