
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { Table, VocabRow, Column, Relation, AIPrompt } from '../../../types';

export const useTableOperations = (table: Table) => {
    const { updateTable, upsertRow, deleteRows, addRows } = useTableStore();
    const { showToast } = useUIStore();

    const handleUpdateTable = async (updated: Partial<Table>) => {
        // We fetch the latest table state from store to ensure we don't overwrite concurrent changes
        // although in this context `table` is usually fresh from store due to re-renders.
        await updateTable({ ...table, ...updated });
    };

    const handleUpdateRow = async (updatedRow: VocabRow, isQuickAddMode: boolean): Promise<boolean> => {
        const success = await upsertRow(table.id, updatedRow);
        if (success && !isQuickAddMode) {
            const isNew = !table.rows.some(r => r.id === updatedRow.id);
            showToast(isNew ? 'Row added successfully.' : 'Row updated successfully.', 'success');
        }
        return success;
    };

    const handleDeleteRow = (rowId: string) => {
        deleteRows(table.id, [rowId]);
        showToast('Row deleted.', 'success');
    };

    const handleBatchDelete = (rowsToDelete: Set<string>) => {
        deleteRows(table.id, Array.from(rowsToDelete));
        showToast(`${rowsToDelete.size} rows deleted.`, 'success');
    };

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
        showToast('Table structure updated.', 'success');
    };

    const handleSaveRelation = (rel: Relation) => {
        const isNew = !table.relations.some(r => r.id === rel.id);
        handleUpdateTable({ relations: isNew ? [...(table.relations || []), rel] : (table.relations || []).map(r => r.id === rel.id ? rel : r) });
        showToast(isNew ? 'Relation created.' : 'Relation updated.', 'success');
    };

    const handleDeleteRelation = (relId: string) => {
        handleUpdateTable({ relations: (table.relations || []).filter(r => r.id !== relId) });
        showToast('Relation deleted.', 'success');
    };

    const handleSaveAIPrompt = (prompt: AIPrompt) => {
        const prompts = (table.aiPrompts || []).filter(p => p.id !== prompt.id);
        handleUpdateTable({ aiPrompts: [...prompts, prompt] });
        showToast('AI prompt saved.', 'success');
    };

    const handleDeleteAIPrompt = (promptId: string) => {
        handleUpdateTable({ aiPrompts: (table.aiPrompts || []).filter(p => p.id !== promptId) });
        showToast('AI prompt deleted.', 'success');
    };

    const handleConfirmPasteImport = (newRows: VocabRow[]) => {
        if (newRows.length > 0) {
            addRows(table.id, newRows);
            showToast(`Imported ${newRows.length} new rows.`, 'success');
        }
    };
    
    const handleSaveLinkTemplate = async (colId: string, template: string) => {
        const newTemplates = { ...(table.columnUrlTemplates || {}), [colId]: template };
        await updateTable({ ...table, columnUrlTemplates: newTemplates });
    };

    return {
        handleUpdateTable,
        handleUpdateRow,
        handleDeleteRow,
        handleBatchDelete,
        handleAddNewColumn,
        handleSaveColumns,
        handleSaveRelation,
        handleDeleteRelation,
        handleSaveAIPrompt,
        handleDeleteAIPrompt,
        handleConfirmPasteImport,
        handleSaveLinkTemplate
    };
};
