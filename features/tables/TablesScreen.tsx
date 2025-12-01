
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Table, Folder, Screen, VocabRow, FlashcardStatus, Column, Tag, ConfidenceProgress } from '../../types';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import Icon from '../../components/ui/Icon';
import TableIcon from '../../components/ui/TableIcon';
import { Button } from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { getTagStyle, getTagSolidColor } from '../../utils/colorUtils';
import TagFilterItem from './components/TagFilterItem';
import Popover from '../../components/ui/Popover';
import WordDetailModal from './WordDetailModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useTagStore } from '../../stores/useTagStore';
import { useTableStats } from './hooks/useTableStats';
import { populateAccountWithSampleData } from '../../services/sampleDataService';

// Helper function for formatting dates
const formatDate = (timestamp?: number) => timestamp ? new Date(timestamp).toLocaleDateString(undefined, { year: '2-digit', month: 'short', day: 'numeric' }) : 'N/A';

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
              <span key={tag} style={getTagStyle(tag, tagColors)} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full">
                {tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-white/70 hover:text-white">
                  <Icon name="x" className="w-3 h-3"/>
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
                  <button key={tag} onClick={() => handleAddTag(tag)} style={getTagStyle(tag, tagColors)} className="text-xs font-semibold px-2 py-1 rounded-full">
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

// TableCard component
const TableCard: React.FC<{
    table: Partial<Table> & { rowCount: number };
    onMoveClick: () => void;
    onRenameClick: () => void;
    onDeleteClick: () => void;
    backgroundColor: string;
    density: 'comfortable' | 'compact';
}> = ({ table, onMoveClick, onRenameClick, onDeleteClick, backgroundColor, density }) => {
    // Optimization: Subscribe to specific parts of stores
    const settings = useUserStore(useShallow(state => state.settings));
    const handleSelectTable = useSessionStore(state => state.handleSelectTable);
    const theme = useUIStore(useShallow(state => state.theme));
    
    const rowCount = table.rowCount;
    const relationsCount = table.relations?.length || 0;
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    const firstTag = table.tags && table.tags.length > 0 ? table.tags[0] : null;
    const borderColor = firstTag ? getTagSolidColor(firstTag, theme, settings.tagColors || {}) : 'transparent';
    
    const isDefaultBg = backgroundColor === '#FAFAFA';
    
    const cardStyle: React.CSSProperties = {
        borderLeft: `4px solid ${borderColor}`,
    };
    if (theme === 'light' && !isDefaultBg) {
        cardStyle.backgroundColor = backgroundColor;
    }

    const ActionsMenu = () => (
        <Popover
            isOpen={isMenuOpen}
            setIsOpen={setIsMenuOpen}
            trigger={
                <button
                    onClick={(e) => { e.stopPropagation(); setIsMenuOpen(true); }}
                    className="p-2 rounded-full text-text-subtle hover:text-primary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                    title="Options"
                >
                    <Icon name="dots-horizontal" className="w-5 h-5" />
                </button>
            }
            contentClassName="w-40 right-0"
        >
            <div className="py-1">
                <button onClick={(e) => { e.stopPropagation(); onRenameClick(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                    <Icon name="pencil" className="w-4 h-4 text-text-subtle"/> Rename
                </button>
                 <button onClick={(e) => { e.stopPropagation(); onMoveClick(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors">
                    <Icon name="folder" className="w-4 h-4 text-text-subtle"/> Move
                </button>
                 <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1 mx-2"></div>
                 <button onClick={(e) => { e.stopPropagation(); onDeleteClick(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors">
                    <Icon name="trash" className="w-4 h-4"/> Delete
                </button>
            </div>
        </Popover>
    );

    if (density === 'compact') {
        return (
            <div style={cardStyle} className={`${isDefaultBg && theme === 'light' ? 'bg-primary-50' : ''} dark:bg-secondary-800 rounded-lg shadow-sm hover:shadow-md transition-all group relative flex items-center justify-between h-14 pr-2`}>
                <div onClick={() => handleSelectTable(table.id!)} className="flex items-center gap-3 flex-1 px-4 cursor-pointer h-full">
                    <TableIcon className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <h3 className="font-bold text-sm text-text-main dark:text-secondary-100 truncate">{table.name}</h3>
                    {table.tags && table.tags.length > 0 && (
                         <span className="text-xs text-text-subtle hidden sm:inline-block bg-secondary-200 dark:bg-secondary-700 px-2 py-0.5 rounded-full">
                            {table.tags[0]}
                        </span>
                    )}
                </div>
                <ActionsMenu />
            </div>
        );
    }

    // Comfortable View
    return (
        <div style={cardStyle} className={`${isDefaultBg && theme === 'light' ? 'bg-primary-50' : ''} dark:bg-secondary-800 rounded-lg shadow-md hover:shadow-xl transition-all group relative flex flex-col`}>
            <div onClick={() => handleSelectTable(table.id!)} className="p-4 cursor-pointer">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1 pr-8">
                        <TableIcon className="w-6 h-6 text-primary-500 flex-shrink-0" />
                        <h3 className="font-bold text-text-main dark:text-secondary-100 truncate">{table.name}</h3>
                    </div>
                </div>
                
                <div className="mt-2 flex items-center gap-4 text-xs text-text-subtle">
                    <span className="flex items-center gap-1"><Icon name="list-bullet" className="w-3.5 h-3.5" /> {rowCount} {rowCount === 1 ? 'row' : 'rows'}</span>
                    <span className="flex items-center gap-1"><Icon name="link" className="w-3.5 h-3.5" /> {relationsCount} relations</span>
                </div>

                {table.tags && table.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
                        {table.tags.slice(0, 3).map(tag => (
                            <div key={tag} style={getTagStyle(tag, settings.tagColors || {})} className="text-xs font-semibold px-2 py-0.5 rounded-full">
                                {tag}
                            </div>
                        ))}
                        {table.tags.length > 3 && (
                            <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-200 dark:bg-secondary-700 text-text-subtle">
                                +{table.tags.length - 3}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
             <div className="absolute top-2 right-2">
                <ActionsMenu />
            </div>
            
            <div className="mt-auto pt-3 border-t border-secondary-200 dark:border-secondary-700/50 text-xs text-text-subtle flex justify-between items-center px-4 pb-3">
                <span>Created: {formatDate(table.createdAt)}</span>
                <span>Modified: {formatDate(table.modifiedAt)}</span>
            </div>
        </div>
    );
};


// Folder component
const FolderRow: React.FC<{
    folder: Folder;
    tables: (Partial<Table> & { rowCount: number })[];
    onMoveTable: (table: Partial<Table>) => void;
    onRenameTable: (table: Partial<Table>) => void;
    onDeleteTable: (table: Partial<Table>) => void;
    cardBg: string;
    density: 'comfortable' | 'compact';
}> = ({ folder, tables, onMoveTable, onRenameTable, onDeleteTable, cardBg, density }) => {
    // Change default expanded state to false (closed)
    const [isExpanded, setIsExpanded] = React.useState(false);
    const tablesInFolder = tables.filter(t => folder.tableIds.includes(t.id!));

    // Standardize empty folders to just show empty state if needed, but keeping expanded logic
    return (
        <div>
            <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-800/50 transition-colors">
                <Icon name="chevron-down" className={`w-5 h-5 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                <Icon name="folder" className="w-6 h-6 text-warning-500" />
                <h2 className="text-lg font-bold">{folder.name}</h2>
                <span className="text-sm text-text-subtle ml-2">{tablesInFolder.length}</span>
            </button>
            {isExpanded && (
                <div className={`pl-4 md:pl-8 pt-2 grid gap-3 ${density === 'compact' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                    {tablesInFolder.map(table => (
                        <div key={table.id}>
                            <TableCard
                                table={table}
                                backgroundColor={cardBg}
                                density={density}
                                onMoveClick={() => onMoveTable(table)}
                                onRenameClick={() => onRenameTable(table)}
                                onDeleteClick={() => onDeleteTable(table)}
                            />
                        </div>
                    ))}
                    {tablesInFolder.length === 0 && (
                        <div className="p-4 text-sm text-text-subtle italic border-2 border-dashed border-secondary-200 dark:border-secondary-700 rounded-lg">
                            Empty folder
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const CARD_BACKGROUND_OPTIONS = [
    { name: 'Default', value: '#FAFAFA' },
    { name: 'Mint', value: '#F0FDF4' },
    { name: 'Lavender', value: '#F5F3FF' },
    { name: 'Peach', value: '#FFF7ED' },
    { name: 'Sky', value: '#EFF6FF' },
];

const StatCard: React.FC<{ icon: string; value: string | number; label: string; }> = ({ icon, value, label }) => (
    <div className="flex-shrink-0 w-36 bg-surface dark:bg-secondary-800 rounded-lg p-3 flex items-center gap-3 border border-secondary-200/80 dark:border-secondary-700/50">
        <Icon name={icon} className="w-8 h-8 text-primary-500" />
        <div>
            <p className="text-2xl font-bold text-text-main dark:text-secondary-100">{value}</p>
            <p className="text-xs text-text-subtle">{label}</p>
        </div>
    </div>
);

const TablesScreen: React.FC = () => {
    // Architecture Shift: Use atomic selectors for display data
    const tableDisplayData = useTableStore(useShallow(state =>
        state.tables.map(t => ({
            id: t.id,
            name: t.name,
            tags: t.tags,
            rowCount: t.rowCount ?? t.rows.length,
            relations: t.relations,
            createdAt: t.createdAt,
            modifiedAt: t.modifiedAt,
        }))
    ));
    const folders = useTableStore(useShallow(state => state.folders));
    const { tags: allGlobalTags } = useTagStore(useShallow(state => ({ tags: state.tags })));
    
    // Get actions directly from the store instance (actions are stable)
    const { createTable, createFolder, createAnkiStyleTable, moveTableToFolder, upsertRow, updateTable, deleteTable } = useTableStore.getState();

    const settings = useUserStore(useShallow(state => state.settings));
    const setTagColor = useUserStore(state => state.setTagColor);
    const { confidenceProgresses, ankiProgresses, studyProgresses } = useSessionDataStore(
      useShallow(state => ({
        confidenceProgresses: state.confidenceProgresses,
        ankiProgresses: state.ankiProgresses,
        studyProgresses: state.studyProgresses,
      }))
    );
    // Optimization: Use the memoized hook for derived stats
    const { totalWords } = useTableStats();

    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [newTableName, setNewTableName] = React.useState('');
    const [newTableColumns, setNewTableColumns] = React.useState('');
    const [activeTags, setActiveTags] = React.useState<Set<string>>(new Set());
    const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = React.useState(false);
    const [newFolderName, setNewFolderName] = React.useState('');
    const [tableToMove, setTableToMove] = React.useState<Partial<Table> | null>(null);
    const [quickAddTable, setQuickAddTable] = React.useState<Table | null>(null);
    const [rowForQuickAdd, setRowForQuickAdd] = React.useState<VocabRow | null>(null);
    const [isCreateAnkiModalOpen, setIsCreateAnkiModalOpen] = React.useState(false);
    const [tableToRename, setTableToRename] = React.useState<Partial<Table> | null>(null);
    const [editedTableName, setEditedTableName] = React.useState('');
    const [tableToDelete, setTableToDelete] = React.useState<Partial<Table> | null>(null);
    const [cardBg, setCardBg] = useLocalStorage<string>('vmind-table-card-bg', '#FAFAFA');
    const [tableDensity, setTableDensity] = useLocalStorage<'comfortable' | 'compact'>('vmind-table-density', 'comfortable');
    const [isViewPopoverOpen, setIsViewPopoverOpen] = React.useState(false);
    const [isLoadingSample, setIsLoadingSample] = React.useState(false);

    const allTagsWithCount = React.useMemo(() => {
        return allGlobalTags
            .map(tagObject => {
                const count = tableDisplayData.filter(table =>
                    (table.tags || []).includes(tagObject.name)
                ).length;
                return { tagObject, count };
            })
            .filter(({ count }) => count > 0)
            .sort((a, b) => a.tagObject.name.localeCompare(b.tagObject.name));
    }, [allGlobalTags, tableDisplayData]);
    
    const allUniqueTagNames = React.useMemo(() => {
        const tagSet = new Set<string>();
        tableDisplayData.forEach(table => { (table.tags || []).forEach(tag => tagSet.add(tag)); });
        return Array.from(tagSet).sort();
    }, [tableDisplayData]);

    const statsData = [
      { icon: 'table-cells', value: tableDisplayData.length, label: 'Tables' },
      { icon: 'list-bullet', value: totalWords.toLocaleString(), label: 'Total Words' },
      { icon: 'folder', value: folders.length, label: 'Folders' },
      { icon: 'flashcards', value: confidenceProgresses.length, label: 'Confidence Sets' },
      { icon: 'stack-of-cards', value: ankiProgresses.length, label: 'Anki Decks' },
      { icon: 'progress-arrows', value: studyProgresses.length, label: 'Study Queues' },
    ];

    const handleCreateTable = async () => {
        if (newTableName) {
            await createTable(newTableName, newTableColumns || 'Word,Definition');
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

    const handleOpenCreateAnkiModal = () => {
        setIsCreateAnkiModalOpen(true);
    };

    const handleCreateAnkiDeck = async (name: string, tags: string[]) => {
        setIsCreateAnkiModalOpen(false);
        const newTable = await createAnkiStyleTable(name, tags);
        if (newTable) {
            setQuickAddTable(newTable);
            setRowForQuickAdd({
                id: crypto.randomUUID(),
                cols: {},
                stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
            });
        }
    };

    const handleQuickAddSave = async (newRow: VocabRow): Promise<boolean> => {
        if (!quickAddTable) return false;
        return upsertRow(quickAddTable.id, newRow);
    };

    const handleToggleTag = (tag: string) => {
        const newSet = new Set(activeTags);
        if (newSet.has(tag)) newSet.delete(tag); else newSet.add(tag);
        setActiveTags(newSet);
    };

    const handleOpenRenameModal = (table: Partial<Table>) => {
        setTableToRename(table);
        setEditedTableName(table.name || '');
    };

    const handleConfirmRename = async () => {
        if (tableToRename && tableToRename.id && editedTableName.trim()) {
            // Fetch full table object to update
            const fullTable = useTableStore.getState().tables.find(t => t.id === tableToRename.id);
            if(fullTable) {
                await updateTable({ ...fullTable, name: editedTableName.trim() });
            }
            setTableToRename(null);
            setEditedTableName('');
        }
    };

    const handleConfirmDelete = async () => {
        if (tableToDelete && tableToDelete.id) {
            await deleteTable(tableToDelete.id);
            setTableToDelete(null);
        }
    };

    const handleLoadSampleData = async () => {
        setIsLoadingSample(true);
        try {
            await populateAccountWithSampleData();
        } catch (error) {
            useUIStore.getState().showToast("Failed to load sample data.", "error");
        } finally {
            setIsLoadingSample(false);
        }
    };

    const filteredTables = React.useMemo(() => {
        if (activeTags.size === 0) return tableDisplayData;
        return tableDisplayData.filter(table => (table.tags || []).some(tag => activeTags.has(tag)));
    }, [tableDisplayData, activeTags]);

    const sortedFolders = React.useMemo(() => {
        const folderMap = new Map(folders.map(f => [f.id, f]));
        const order = settings.folderOrder || [];
        const ordered = order.map(id => folderMap.get(id)).filter((f): f is Folder => !!f);
        const unordered = folders.filter(f => !order.includes(f.id)).sort((a, b) => {
            const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
            const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
            return timeB - timeA;
        });
        return [...ordered, ...unordered];
    }, [folders, settings.folderOrder]);

    const tablesWithoutFolder = React.useMemo(() => {
        const tablesInFolders = new Set(folders.flatMap(f => f.tableIds));
        return tableDisplayData.filter(t => !tablesInFolders.has(t.id!));
    }, [tableDisplayData, folders]);

    if (tableDisplayData.length === 0 && folders.length === 0) {
        return (
            <div className="p-4 sm:p-6 mx-auto animate-fadeIn flex flex-col items-center justify-center text-center h-[calc(100vh-10rem)]">
                <Icon name="table-cells" className="w-24 h-24 text-secondary-300 dark:text-secondary-700 mb-4" />
                <h1 className="text-3xl font-bold text-text-main dark:text-secondary-100 mb-2">Welcome to Vmind!</h1>
                <p className="text-text-subtle max-w-md">
                    This is your workspace for vocabulary tables. Create a new table to start your collection, or load our sample data to explore what's possible.
                </p>
                <div className="mt-8 flex gap-4">
                    <Button onClick={() => setIsCreateModalOpen(true)} size="lg">
                        <Icon name="plus" className="w-5 h-5 mr-2" />
                        Create New Table
                    </Button>
                    <Button onClick={handleLoadSampleData} variant="secondary" size="lg" disabled={isLoadingSample}>
                        {isLoadingSample ? (
                            <><Icon name="spinner" className="w-5 h-5 mr-2 animate-spin" /> Loading...</>
                        ) : (
                            <><Icon name="sparkles" className="w-5 h-5 mr-2" /> Load Sample Data</>
                        )}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Tables</h1>
                    <p className="text-sm text-text-subtle">Your vocabulary collections.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsCreateModalOpen(true)}>New Table</Button>
                    <Button onClick={handleOpenCreateAnkiModal} variant="secondary">New Anki Deck</Button>
                    <Button onClick={() => setIsCreateFolderModalOpen(true)} variant="secondary">New Folder</Button>
                     <Popover
                        isOpen={isViewPopoverOpen}
                        setIsOpen={setIsViewPopoverOpen}
                        trigger={
                            <Button variant="secondary" size="md">
                                <Icon name="sliders" className="w-4 h-4 mr-2" />
                                View
                            </Button>
                        }
                        contentClassName="w-56"
                    >
                        <div className="space-y-4 p-1">
                            <div>
                                <h4 className="font-semibold text-xs text-text-subtle uppercase mb-2">Layout Density</h4>
                                <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-md p-1">
                                    <button 
                                        onClick={() => setTableDensity('comfortable')} 
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-sm font-medium transition-all ${tableDensity === 'comfortable' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                                        title="Comfortable View"
                                    >
                                        <Icon name="credit-card" className="w-4 h-4" />
                                        Card
                                    </button>
                                    <button 
                                        onClick={() => setTableDensity('compact')} 
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-sm font-medium transition-all ${tableDensity === 'compact' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                                        title="Compact View"
                                    >
                                        <Icon name="list-bullet" className="w-4 h-4" />
                                        List
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-secondary-200 dark:border-secondary-700 pt-3">
                                <h4 className="font-semibold text-xs text-text-subtle uppercase mb-2">Card Color</h4>
                                <div className="grid grid-cols-5 gap-2">
                                    {CARD_BACKGROUND_OPTIONS.map(color => (
                                        <button
                                            key={color.name}
                                            onClick={() => setCardBg(color.value)}
                                            className={'w-8 h-8 rounded-full flex items-center justify-center transition-all border border-black/10 hover:scale-110' + (cardBg === color.value ? ' ring-2 ring-primary-500 ring-offset-2 ring-offset-surface dark:ring-offset-secondary-800' : '')}
                                            style={{ backgroundColor: color.value }}
                                            title={color.name}
                                        >
                                            {cardBg === color.value && <Icon name="check" className="w-4 h-4 text-primary-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Popover>
                </div>
            </header>

            <section className="mb-6 animate-fadeIn">
              <h2 className="text-sm font-bold uppercase text-text-subtle mb-2 px-2">Workspace Overview</h2>
              <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 px-2">
                {statsData.map(stat => (
                  <StatCard key={stat.label} icon={stat.icon} value={stat.value} label={stat.label} />
                ))}
              </div>
            </section>

            {allTagsWithCount.length > 0 && (
                <div className="mb-6 p-4 bg-surface dark:bg-secondary-800/50 rounded-lg border border-secondary-200/80 dark:border-secondary-700/50">
                    <h3 className="text-sm font-semibold mb-2">Filter by Tags</h3>
                    <div className="flex flex-wrap gap-2">
                        {allTagsWithCount.map(({ tagObject, count }) => (
                            <TagFilterItem 
                                key={tagObject.id}
                                tag={tagObject}
                                count={count}
                                isChecked={activeTags.has(tagObject.name)}
                                onToggle={() => handleToggleTag(tagObject.name)}
                                onColorChange={setTagColor}
                                customColors={settings.tagColors || {}}
                            />
                        ))}
                    </div>
                </div>
            )}

            <main className="space-y-6">
                 {activeTags.size > 0 ? (
                    <div className={`grid gap-3 ${tableDensity === 'compact' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                        {filteredTables.map(table => (
                            <div key={table.id}>
                                <TableCard
                                    table={table as (Partial<Table> & { rowCount: number })}
                                    backgroundColor={cardBg}
                                    density={tableDensity}
                                    onMoveClick={() => setTableToMove(table)}
                                    onRenameClick={() => handleOpenRenameModal(table)}
                                    onDeleteClick={() => setTableToDelete(table)}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {tablesWithoutFolder.length > 0 && (
                             <div>
                                <h2 className="text-lg font-bold text-text-subtle mb-3 ml-2">Uncategorized</h2>
                                <div className={`grid gap-3 ${tableDensity === 'compact' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                                    {tablesWithoutFolder.map(table => (
                                        <div key={table.id}>
                                            <TableCard
                                                table={table as (Partial<Table> & { rowCount: number })}
                                                backgroundColor={cardBg}
                                                density={tableDensity}
                                                onMoveClick={() => setTableToMove(table)}
                                                onRenameClick={() => handleOpenRenameModal(table)}
                                                onDeleteClick={() => setTableToDelete(table)}
                                            />
                                        </div>
                                    ))}
                                </div>
                             </div>
                        )}

                        {sortedFolders.map(folder => 
                            <FolderRow 
                                key={folder.id} 
                                folder={folder} 
                                tables={tableDisplayData as (Partial<Table> & { rowCount: number })[]}
                                onMoveTable={setTableToMove}
                                onRenameTable={handleOpenRenameModal}
                                onDeleteTable={setTableToDelete}
                                cardBg={cardBg}
                                density={tableDensity}
                            />
                        )}
                    </>
                )}
            </main>

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
                            <TableIcon className="w-5 h-5 text-text-subtle"/>
                            <span className="font-semibold">Uncategorized</span>
                        </button>
                        {sortedFolders.map(folder => (
                            <button key={folder.id} onClick={() => handleMoveTable(folder.id)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                <Icon name="folder" className="w-5 h-5 text-warning-500"/>
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
                    onDelete={() => {}}
                    onConfigureAI={() => {}}
                    quickAddMode={true}
                />
            )}
            <ConfirmationModal
                isOpen={!!tableToDelete}
                onClose={() => setTableToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={`Delete "${tableToDelete?.name}"?`}
                message="Are you sure you want to permanently delete this table and all its words?"
                warning="This action cannot be undone."
                confirmText="Delete"
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
        </div>
    );
};

export default TablesScreen;
