import * as React from 'react';
import { Table, Folder, Screen, VocabRow, FlashcardStatus, Column, Tag, ConfidenceProgress, AnkiProgress, AnkiConfig } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useTagStore } from '../../stores/useTagStore';
import { TableActionService } from '../../services/TableActionService';
import { populateAccountWithSampleData } from '../../services/sampleDataService';
import TablesLayout from './components/TablesLayout';
import TablesSidebar from './components/TablesSidebar';
import WordDetailModal from './WordDetailModal';
import TableScreen from './TableScreen';
import FileBrowser from './components/FileBrowser';
import BlockingLoader from '../concepts/components/BlockingLoader';

interface CreateAnkiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string, tags: string[]) => void;
    allTags: string[];
    tagColors: Record<string, string>;
}

const CreateAnkiModal: React.FC<CreateAnkiModalProps> = ({ isOpen, onClose, onCreate, allTags, tagColors }) => {
    const [name, setName] = React.useState('');
    const [tags, setTags] = React.useState<string[]>([]);
    const [tagInput, setTagInput] = React.useState('');

    React.useEffect(() => {
        if (!isOpen) {
            setName('');
            setTags([]);
            setTagInput('');
        } else {
            setName('New Anki Deck'); // Default name
        }
    }, [isOpen]);

    const handleAddTag = (tagToAdd: string) => {
        const newTag = tagToAdd.trim();
        if (newTag && !tags.includes(newTag)) {
            setTags([...tags, newTag]);
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag(tagInput);
        }
    };

    const handleCreate = () => {
        if (name.trim()) {
            onCreate(name.trim(), tags);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Anki Deck">
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1" htmlFor="deck-name">Deck Name</label>
                    <Input
                        id="deck-name"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g., Japanese Vocabulary"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1" htmlFor="deck-tags">Tags</label>
                    <div className="p-2 border border-secondary-300 dark:border-secondary-600 rounded-md bg-secondary-100 dark:bg-secondary-700 flex flex-wrap items-center gap-2">
                        {tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">
                                {tag}
                                <button onClick={() => handleRemoveTag(tag)} className="text-primary-800/70 dark:text-primary-300/70 hover:text-primary-800 dark:hover:text-primary-300">
                                    <Icon name="x" className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <Input
                            id="deck-tags"
                            type="text"
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 text-sm bg-transparent border-none focus:ring-0 h-auto p-0 min-w-[80px]"
                            placeholder="Add a tag..."
                        />
                    </div>
                    {allTags.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs text-text-subtle mb-1">Click to add existing tags:</p>
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                                {allTags.filter(t => !tags.includes(t)).map(tag => (
                                    <button key={tag} onClick={() => handleAddTag(tag)} className="text-xs font-semibold px-2 py-1 rounded-full bg-secondary-200 text-secondary-700 hover:bg-secondary-300 dark:bg-secondary-700 dark:text-secondary-200 dark:hover:bg-secondary-600">
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!name.trim()}>Create & Add Cards</Button>
                </div>
            </div>
        </Modal>
    );
};


const TablesScreen: React.FC = () => {
    // Navigation State
    const [selectedTableId, setSelectedTableId] = React.useState<string | null>(null);
    const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);

    const tableDisplayData = useTableStore(state =>
        state.tables.map(t => ({
            ...t,
            rowCount: t.rowCount ?? t.rows.length,
        }))
    );
    const folders = useTableStore(state => state.folders);
    const allGlobalTags = useTagStore(state => state.tags.filter(t => !t.scope || t.scope === 'global'));

    const { createTable, createFolder, createAnkiStyleTable, moveTableToFolder, upsertRow, updateTable, deleteTable, deleteFolder, updateFolder } = useTableStore.getState();
    const { setIsTablesSidebarOpen, setCurrentScreen, triggerGlobalAction } = useUIStore();
    const { setStudySetupSourceTableId } = useSessionStore();
    const { confidenceProgresses, deleteConfidenceProgress } = useSessionDataStore();

    const settings = useUserStore(state => state.settings);

    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [newTableName, setNewTableName] = React.useState('');
    const [newTableColumns, setNewTableColumns] = React.useState('');
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = React.useState(false);
    const [newFolderName, setNewFolderName] = React.useState('');
    const [tableToMove, setTableToMove] = React.useState<Partial<Table> | null>(null);
    const [quickAddTable, setQuickAddTable] = React.useState<Table | null>(null);
    const [rowForQuickAdd, setRowForQuickAdd] = React.useState<VocabRow | null>(null);
    const [isCreateAnkiModalOpen, setIsCreateAnkiModalOpen] = React.useState(false);

    const [tableToRename, setTableToRename] = React.useState<Partial<Table> | null>(null);
    const [editedTableName, setEditedTableName] = React.useState('');
    const [tableToDelete, setTableToDelete] = React.useState<Partial<Table> | null>(null);

    // --- Folder Management State ---
    const [folderToRename, setFolderToRename] = React.useState<Folder | null>(null);
    const [editedFolderName, setEditedFolderName] = React.useState('');
    const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);
    const [isDeletingTable, setIsDeletingTable] = React.useState(false);
    const [deletionMessage, setDeletionMessage] = React.useState('');

    const allUniqueTagNames = React.useMemo(() => {
        const tagSet = new Set<string>();
        tableDisplayData.forEach(table => { (table.tags || []).forEach(tag => tagSet.add(tag)); });
        return Array.from(tagSet).sort();
    }, [tableDisplayData]);

    // --- Dependency Analysis for Deletion (USING SERVICE) ---
    const affectedSets = React.useMemo(() => {
        if (!tableToDelete || !tableToDelete.id) return [];
        return TableActionService.getAffectedConfidenceSets(tableToDelete.id);
    }, [tableToDelete, confidenceProgresses]);

    const affectedConfidenceSets = affectedSets; // Alias for JSX usage

    const deleteWarningMessage = React.useMemo(() => {
        if (!tableToDelete || !tableToDelete.id || !tableToDelete.name) return "";
        return TableActionService.getDeleteWarning(tableToDelete.id, tableToDelete.name);
    }, [tableToDelete, confidenceProgresses]);

    const deleteWarningTitle = React.useMemo(() => {
        if (!tableToDelete || !tableToDelete.id) return "Delete Table?";
        const affectedSetsLocal = TableActionService.getAffectedConfidenceSets(tableToDelete.id);
        return affectedSetsLocal.length > 0 ? "Delete Table & Dependencies?" : `Delete "${tableToDelete.name}"?`;
    }, [tableToDelete, confidenceProgresses]);


    const handleCreateTable = async () => {
        if (newTableName) {
            const newTable = await createTable(newTableName, newTableColumns || 'Word,Definition');
            if (newTable && currentFolderId) {
                // If inside a folder, auto-move the new table there
                await moveTableToFolder(newTable.id, currentFolderId);
            }
            setIsCreateModalOpen(false);
            setNewTableName('');
            setNewTableColumns('');
        }
    };

    const handleCreateFolder = async () => {
        if (newFolderName) {
            await createFolder(newFolderName);
            setIsCreateFolderModalOpen(false);
            setNewFolderName('');
        }
    };

    const handleMoveTable = async (folderId: string | null) => {
        if (tableToMove && tableToMove.id) {
            await moveTableToFolder(tableToMove.id, folderId);
            setTableToMove(null);
        }
    };

    const handleCreateAnkiDeck = async (name: string, tags: string[]) => {
        setIsCreateAnkiModalOpen(false);
        const newTable = await createAnkiStyleTable(name, tags);
        if (newTable) {
            if (currentFolderId) {
                await moveTableToFolder(newTable.id, currentFolderId);
            }
            setQuickAddTable(newTable);
            setRowForQuickAdd({
                id: crypto.randomUUID(),
                cols: {},
                stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
                createdAt: Date.now(),
                modifiedAt: Date.now()
            });
        }
    };

    const handleQuickAddSave = async (newRow: VocabRow): Promise<boolean> => {
        if (!quickAddTable) return false;
        return upsertRow(quickAddTable.id, newRow);
    };

    const handleOpenRenameModal = (table: Partial<Table>) => {
        setTableToRename(table);
        setEditedTableName(table.name || '');
    };

    const handleConfirmRename = async () => {
        if (tableToRename && tableToRename.id && editedTableName.trim()) {
            const fullTable = useTableStore.getState().tables.find(t => t.id === tableToRename.id);
            if (fullTable) {
                await updateTable({ ...fullTable, name: editedTableName.trim() });
            }
            setTableToRename(null);
            setEditedTableName('');
        }
    };

    const handleOpenRenameFolderModal = (folder: Folder) => {
        setFolderToRename(folder);
        setEditedFolderName(folder.name);
    }

    const handleConfirmRenameFolder = async () => {
        if (folderToRename && editedFolderName.trim()) {
            await updateFolder(folderToRename.id, { name: editedFolderName.trim() });
            setFolderToRename(null);
            setEditedFolderName('');
        }
    }

    const handleConfirmDelete = async () => {
        if (tableToDelete && tableToDelete.id) {
            setIsDeletingTable(true);
            setDeletionMessage(`Deleting "${tableToDelete.name}" and cleaning up dependencies...`);

            try {
                // Delegate completely to Service
                await TableActionService.deleteTableWithDependencies(tableToDelete.id);

                if (selectedTableId === tableToDelete.id) {
                    setSelectedTableId(null);
                }

                useUIStore.getState().showToast(`Table "${tableToDelete.name}" deleted successfully.`, "success");
            } catch (err) {
                console.error("Failed to delete table:", err);
                useUIStore.getState().showToast("Failed to delete table. Please try again.", "error");
            } finally {
                setIsDeletingTable(false);
                setTableToDelete(null);
                setDeletionMessage('');
            }
        }
    };

    const handleNavigateStudy = (tableId: string) => {
        // Use Global Action guard if navigating to study setup directly
        triggerGlobalAction(() => {
            setStudySetupSourceTableId(tableId);
            setCurrentScreen(Screen.StudySetup);
        });
    };

    const tablesWithoutFolder = React.useMemo(() => {
        return TableActionService.getUncategorizedTables(tableDisplayData, folders);
    }, [tableDisplayData, folders]);

    // --- Navigation Logic ---
    const handleBackFromTable = () => {
        // Guarded navigation back to list view
        triggerGlobalAction(() => {
            setSelectedTableId(null);
        });
    };

    const handleSelectTableGuarded = (tableId: string) => {
        // Guarded navigation into table view
        triggerGlobalAction(() => {
            setSelectedTableId(tableId);
        });
    };

    const getBackLabel = () => {
        if (currentFolderId) {
            const folder = folders.find(f => f.id === currentFolderId);
            return folder ? `Back to ${folder.name}` : "Back to Folder";
        }
        return "Back to Workspace";
    };

    const handleSelectFolderFromTree = (folderId: string | null) => {
        // Guarded navigation for folder switching
        triggerGlobalAction(() => {
            setCurrentFolderId(folderId);
            setSelectedTableId(null);
        });
    };

    return (
        <TablesLayout
            sidebar={
                <TablesSidebar
                    folders={folders}
                    tables={tableDisplayData}
                    tablesWithoutFolder={tablesWithoutFolder}
                    allGlobalTags={allGlobalTags}
                    onMoveTable={setTableToMove}
                    onRenameTable={handleOpenRenameModal}
                    onDeleteTable={setTableToDelete}
                    onSelectTable={handleSelectTableGuarded}
                    currentFolderId={currentFolderId}
                    onSelectFolder={handleSelectFolderFromTree}
                />
            }
        >
            <div className="h-full w-full">
                <BlockingLoader isVisible={isDeletingTable} message={deletionMessage} />
                {selectedTableId ? (
                    // Table View
                    <TableScreen
                        tableId={selectedTableId}
                        onBack={handleBackFromTable}
                        backLabel={getBackLabel()}
                    />
                ) : (
                    // Workspace / File Browser View
                    <FileBrowser
                        currentFolderId={currentFolderId}
                        setCurrentFolderId={setCurrentFolderId}
                        folders={folders}
                        tables={tableDisplayData}
                        tablesWithoutFolder={tablesWithoutFolder}
                        allGlobalTags={allGlobalTags}
                        onMoveTable={setTableToMove}
                        onRenameTable={handleOpenRenameModal}
                        onDeleteTable={setTableToDelete}
                        onDeleteFolder={(id) => setFolderToDelete(id)}
                        onRenameFolder={handleOpenRenameFolderModal}
                        onUpdateFolder={updateFolder}
                        onSelectTable={handleSelectTableGuarded}
                        onCreateTable={() => setIsCreateModalOpen(true)}
                        onCreateFolder={() => setIsCreateFolderModalOpen(true)}
                        onCreateAnki={() => setIsCreateAnkiModalOpen(true)}
                        onNavigateStudy={handleNavigateStudy}
                    />
                )}

                {/* All modals remain here as they are triggered by actions in the parent screen */}
                <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Table">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Table Name</label>
                            <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Spanish Verbs" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Columns (comma-separated)</label>
                            <input type="text" value={newTableColumns} onChange={e => setNewTableColumns(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Word, Definition, Example" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateTable} disabled={!newTableName}>Create Table</Button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Create New Folder">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Folder Name</label>
                            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border rounded-md px-3 py-2" placeholder="e.g., Languages" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateFolder} disabled={!newFolderName}>Create Folder</Button>
                        </div>
                    </div>
                </Modal>

                <Modal isOpen={!!tableToMove} onClose={() => setTableToMove(null)} title={`Move "${tableToMove?.name}"`}>
                    <div className="p-6">
                        <p className="text-sm text-text-subtle mb-4">Select a destination folder:</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            <button onClick={() => handleMoveTable(null)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                <Icon name="table-cells" className="w-5 h-5 text-text-subtle" />
                                <span className="font-semibold">Uncategorized (Root)</span>
                            </button>
                            {folders.map(folder => (
                                <button key={folder.id} onClick={() => handleMoveTable(folder.id)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                    <Icon name="folder" className="w-5 h-5 text-warning-500" />
                                    <span className="font-semibold">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </Modal>

                <CreateAnkiModal
                    isOpen={isCreateAnkiModalOpen}
                    onClose={() => setIsCreateAnkiModalOpen(false)}
                    onCreate={handleCreateAnkiDeck}
                    allTags={allUniqueTagNames}
                    tagColors={settings.tagColors || {}}
                />

                {quickAddTable && (
                    <WordDetailModal
                        isOpen={!!rowForQuickAdd}
                        row={rowForQuickAdd}
                        table={quickAddTable}
                        columns={quickAddTable.columns}
                        onClose={() => { setQuickAddTable(null); setRowForQuickAdd(null); }}
                        onSave={handleQuickAddSave}
                        onDelete={() => { }}
                        onConfigureAI={() => { }}
                        quickAddMode={true}
                    />
                )}

                <ConfirmationModal
                    isOpen={!!tableToDelete}
                    onClose={() => setTableToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={deleteWarningTitle}
                    message={deleteWarningMessage}
                    warning="This action cannot be undone."
                    confirmText="Delete"
                    confirmVariant={affectedConfidenceSets.length > 0 ? "destructive" : "primary"}
                />

                <ConfirmationModal
                    isOpen={!!folderToDelete}
                    onClose={() => setFolderToDelete(null)}
                    onConfirm={() => { if (folderToDelete) deleteFolder(folderToDelete); setFolderToDelete(null); }}
                    title="Delete Folder?"
                    message="Are you sure you want to delete this folder? The tables inside will be moved to the root workspace."
                    confirmText="Delete Folder"
                />

                <Modal isOpen={!!tableToRename} onClose={() => setTableToRename(null)} title="Rename Table">
                    <form onSubmit={(e) => { e.preventDefault(); handleConfirmRename(); }} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="rename-input" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">New Name</label>
                            <Input
                                id="rename-input"
                                type="text"
                                value={editedTableName}
                                onChange={e => setEditedTableName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" type="button" onClick={() => setTableToRename(null)}>Cancel</Button>
                            <Button type="submit" disabled={!editedTableName.trim()}>Save</Button>
                        </div>
                    </form>
                </Modal>

                <Modal isOpen={!!folderToRename} onClose={() => setFolderToRename(null)} title="Rename Folder">
                    <form onSubmit={(e) => { e.preventDefault(); handleConfirmRenameFolder(); }} className="p-6 space-y-4">
                        <div>
                            <label htmlFor="rename-folder-input" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">New Name</label>
                            <Input
                                id="rename-folder-input"
                                type="text"
                                value={editedFolderName}
                                onChange={e => setEditedFolderName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="secondary" type="button" onClick={() => setFolderToRename(null)}>Cancel</Button>
                            <Button type="submit" disabled={!editedFolderName.trim()}>Save</Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </TablesLayout>
    );
};

export default TablesScreen;
