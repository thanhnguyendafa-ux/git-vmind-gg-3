
import { useTableStore } from '../stores/useTableStore';
import { useNoteStore } from '../stores/useNoteStore';
import { useDictationNoteStore } from '../stores/useDictationNoteStore';
import { useContextLinkStore } from '../stores/useContextLinkStore';
import { useSessionDataStore } from '../stores/useSessionDataStore';
import { useTagStore } from '../stores/useTagStore';
import { defaultState } from '../stores/appStorage';

/**
 * Populates the current user's account with the default sample data set.
 * This function iterates through the default data and uses the existing store actions
 * to create each item, ensuring they are correctly added to the local state and
 * queued for synchronization with the backend by VmindSyncEngine.
 */
export const populateAccountWithSampleData = async (): Promise<void> => {
    const { 
        createTable, 
        createFolder,
        moveTableToFolder,
        updateTable,
    } = useTableStore.getState();
    
    // Use set* methods which are simpler for bulk-adding non-relational data
    const { setNotes } = useNoteStore.getState();
    const { setDictationNotes } = useDictationNoteStore.getState();
    const { setContextLinks } = useContextLinkStore.getState();
    const { setConfidenceProgresses, setAnkiProgresses, setStudyProgresses } = useSessionDataStore.getState();
    const { setTags } = useTagStore.getState();

    try {
        // --- Add Tags ---
        setTags(defaultState.tags || []);
        
        // --- Add Tables and Folders ---
        const createdTableIds = new Map<string, string>();
        for (const table of defaultState.tables) {
            // createTable only needs name and columns string.
            const columnsStr = table.columns.map(c => c.name).join(',');
            const newTable = await createTable(table.name, columnsStr);
            if (newTable) {
                createdTableIds.set(table.id, newTable.id);
                // Now, update the new table with rows, relations, and other metadata
                const fullNewTable = {
                    ...newTable,
                    rows: table.rows,
                    relations: table.relations,
                    tagIds: table.tagIds,
                    description: table.description,
                };
                await updateTable(fullNewTable);
            }
        }
        
        for (const folder of defaultState.folders) {
            await createFolder(folder.name);
            // We need to find the newly created folder to move tables into it
            // This is a simplification; a more robust system would return the new folder from createFolder
            const newFolder = useTableStore.getState().folders.find(f => f.name === folder.name);
            if (newFolder) {
                for (const oldTableId of folder.tableIds) {
                    const newTableId = createdTableIds.get(oldTableId);
                    if (newTableId) {
                        await moveTableToFolder(newTableId, newFolder.id);
                    }
                }
            }
        }
        
        // --- Add other data types ---
        setNotes(defaultState.notes);
        setDictationNotes(defaultState.dictationNotes);
        setContextLinks(defaultState.contextLinks);
        // Update property name from flashcardProgresses to confidenceProgresses
        setConfidenceProgresses(() => defaultState.confidenceProgresses || []);
        setAnkiProgresses(() => defaultState.ankiProgresses || []);
        setStudyProgresses(() => defaultState.studyProgresses || []);

    } catch (error) {
        console.error("Error populating account with sample data:", error);
        throw new Error("Could not add sample data.");
    }
};
