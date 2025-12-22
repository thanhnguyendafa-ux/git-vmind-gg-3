import * as React from 'react';
import { Table, Folder, Tag } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import { useUserStore } from '../../../stores/useUserStore';
import Icon from '../../../components/ui/Icon';
import TableGridItem from './TableGridItem';
import FolderGridItem from './FolderGridItem';
import { Button } from '../../../components/ui/Button';
import LibraryBrowser from './Library/LibraryBrowser';

interface FileBrowserProps {
    currentFolderId: string | null;
    setCurrentFolderId: (id: string | null) => void;
    folders: Folder[];
    tables: Table[];
    tablesWithoutFolder: Table[];
    allGlobalTags: Tag[];
    onMoveTable: (table: Partial<Table>) => void;
    onRenameTable: (table: Partial<Table>) => void;
    onDeleteTable: (table: Partial<Table>) => void;
    onDeleteFolder: (folderId: string) => void;
    onRenameFolder: (folder: Folder) => void;
    onUpdateFolder: (folderId: string, updates: Partial<Folder>) => void;
    onSelectTable: (tableId: string) => void;
    onCreateTable: () => void;
    onCreateFolder: () => void;
    onCreateAnki: () => void;
    onNavigateStudy: (tableId: string) => void;
}

const FileBrowser: React.FC<FileBrowserProps> = (props) => {
    const {
        currentFolderId, setCurrentFolderId,
        folders, tables, tablesWithoutFolder,
        onMoveTable, onRenameTable, onDeleteTable, onDeleteFolder, onRenameFolder, onUpdateFolder, onSelectTable,
        onCreateTable, onCreateFolder, onNavigateStudy
    } = props;

    const { theme, isLibraryMode, setIsLibraryMode, isDesktopSidebarOpen, toggleDesktopSidebar } = useUIStore();
    const { settings } = useUserStore();

    // Internal View State
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    const [sortMode, setSortMode] = React.useState<'name' | 'modified' | 'count'>('modified');

    // --- Derived Data ---
    const currentFolder = React.useMemo(() =>
        currentFolderId ? folders.find(f => f.id === currentFolderId) : null
        , [currentFolderId, folders]);

    const displayFolders = React.useMemo(() => {
        // Show folders only at Root Level
        if (currentFolderId) return [];
        return folders;
    }, [currentFolderId, folders]);

    const displayTables = React.useMemo(() => {
        let items: Table[] = [];
        if (currentFolderId) {
            // Folder View: Tables inside the folder
            const folder = folders.find(f => f.id === currentFolderId);
            if (folder) {
                items = tables.filter(t => folder.tableIds.includes(t.id));
            }
        } else {
            // Root View: Tables not in any folder
            items = tablesWithoutFolder as Table[];
        }

        // Sorting
        return items.sort((a, b) => {
            if (sortMode === 'name') return a.name.localeCompare(b.name);
            if (sortMode === 'count') return (b.rowCount ?? b.rows.length) - (a.rowCount ?? a.rows.length);
            // Default: Modified At (Newest first)
            return (b.modifiedAt || 0) - (a.modifiedAt || 0);
        });
    }, [currentFolderId, folders, tables, tablesWithoutFolder, sortMode]);

    // --- Interaction Handlers ---
    const handleFolderClick = (folderId: string) => {
        setCurrentFolderId(folderId);
    };

    const handleBreadcrumbClick = () => {
        setCurrentFolderId(null);
    };

    // --- Library View ---
    if (isLibraryMode) {
        return <LibraryBrowser />;
    }

    // --- Empty State ---
    if (displayFolders.length === 0 && displayTables.length === 0) {
        return (
            <div className="flex flex-col h-full relative">
                {/* Empty State Header with Toggle */}
                <div className="flex-shrink-0 px-6 py-4 flex justify-between items-center z-20">
                    <div className="flex items-center gap-4">
                        {!isDesktopSidebarOpen && (
                            <Button variant="ghost" size="sm" onClick={toggleDesktopSidebar} className="hidden md:flex h-8 w-8 p-0" title="Expand Sidebar">
                                <Icon name="sidebar" className="w-4 h-4" />
                            </Button>
                        )}
                        <div className="bg-secondary-100 dark:bg-secondary-800 p-1 rounded-lg flex items-center">
                            <button
                                onClick={() => setIsLibraryMode(false)}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold transition-all bg-white dark:bg-secondary-600 shadow text-text-main dark:text-white"
                            >
                                Workspace
                            </button>
                            <button
                                onClick={() => setIsLibraryMode(true)}
                                className="px-3 py-1.5 rounded-md text-sm font-semibold transition-all text-text-subtle hover:text-text-main"
                            >
                                Community
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fadeIn">
                    <div className="bg-secondary-100 dark:bg-secondary-800 p-6 rounded-full mb-6">
                        <Icon name={currentFolderId ? "folder" : "home"} className="w-16 h-16 text-secondary-300 dark:text-secondary-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-secondary-100 mb-2">
                        {currentFolderId ? 'Empty Folder' : 'Your Workspace is Empty'}
                    </h2>
                    <p className="text-text-subtle mb-8 max-w-sm">
                        {currentFolderId
                            ? "This folder has no tables yet. Move tables here or create a new one."
                            : "Start your journey by creating a vocabulary table or organizing with folders."
                        }
                    </p>
                    <div className="flex gap-4">
                        <Button onClick={onCreateTable} size="lg" className="shadow-lg">
                            <Icon name="plus" className="w-5 h-5 mr-2" /> New Table
                        </Button>
                        {!currentFolderId && (
                            <Button onClick={onCreateFolder} variant="secondary" size="lg">
                                <Icon name="folder" className="w-5 h-5 mr-2" /> New Folder
                            </Button>
                        )}
                    </div>
                    {currentFolderId && (
                        <button onClick={handleBreadcrumbClick} className="mt-8 text-primary-500 hover:underline">
                            Return to Workspace
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col relative">
            {/* Header Bar */}
            <header className="flex-shrink-0 px-6 py-4 border-b border-white/20 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-surface/60 dark:bg-secondary-900/60 backdrop-blur-md z-20">
                <div className="flex items-center gap-4">
                    {/* Sidebar Toggle (Desktop Only) */}
                    {!isDesktopSidebarOpen && (
                        <Button variant="ghost" size="sm" onClick={toggleDesktopSidebar} className="hidden md:flex h-8 w-8 p-0" title="Expand Sidebar">
                            <Icon name="sidebar" className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Library Toggle */}
                    <div className="bg-secondary-100 dark:bg-secondary-800 p-1 rounded-lg flex items-center flex-shrink-0">
                        <button
                            onClick={() => setIsLibraryMode(false)}
                            className="px-3 py-1.5 rounded-md text-sm font-semibold transition-all bg-white dark:bg-secondary-600 shadow text-text-main dark:text-white"
                        >
                            Workspace
                        </button>
                        <button
                            onClick={() => setIsLibraryMode(true)}
                            className="px-3 py-1.5 rounded-md text-sm font-semibold transition-all text-text-subtle hover:text-text-main"
                        >
                            Community
                        </button>
                    </div>

                    <div className="w-px h-6 bg-secondary-300 dark:bg-secondary-600 hidden md:block"></div>

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-lg font-medium overflow-hidden">
                        <button
                            onClick={handleBreadcrumbClick}
                            className={`flex items-center gap-1 transition-colors ${currentFolderId ? 'text-text-subtle hover:text-text-main' : 'text-text-main dark:text-secondary-100 font-bold'}`}
                        >
                            <Icon name="home" className="w-5 h-5" />
                            <span className="hidden sm:inline">Root</span>
                        </button>

                        {currentFolder && (
                            <>
                                <Icon name="chevron-right" className="w-4 h-4 text-text-subtle flex-shrink-0" />
                                <div className="flex items-center gap-2 text-text-main dark:text-secondary-100 font-bold truncate">
                                    <Icon name="folder" className="w-5 h-5 text-warning-500" variant="filled" />
                                    <span>{currentFolder.name}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button size="sm" onClick={onCreateTable} className="hidden md:flex">
                        <Icon name="plus" className="w-4 h-4 mr-1" /> New Table
                    </Button>

                    {!currentFolderId && (
                        <Button size="sm" variant="secondary" onClick={onCreateFolder} className="hidden md:flex">
                            <Icon name="folder" className="w-4 h-4 mr-1" /> New Folder
                        </Button>
                    )}

                    <div className="h-6 w-px bg-secondary-300 dark:bg-secondary-600 mx-1"></div>

                    {/* Sort */}
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as any)}
                        className="bg-transparent text-sm font-semibold text-text-subtle hover:text-text-main focus:outline-none cursor-pointer"
                    >
                        <option value="modified">Latest</option>
                        <option value="name">Name</option>
                        <option value="count">Size</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}
                        >
                            <Icon name="grid" className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}
                        >
                            <Icon name="list" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 animate-fadeIn">

                {/* SECTION 1: Folder Shelf (Root Only) */}
                {!currentFolderId && displayFolders.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3 px-1">Folders</h3>
                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                {displayFolders.map(folder => (
                                    <FolderGridItem
                                        key={folder.id}
                                        folder={folder}
                                        onSelect={() => handleFolderClick(folder.id)}
                                        onDelete={() => onDeleteFolder(folder.id)}
                                        onRename={() => onRenameFolder(folder)}
                                        onColorChange={(color) => onUpdateFolder(folder.id, { color })}
                                        theme={theme}
                                        variant="table" // Explicitly mark as Table Folder
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayFolders.map(folder => (
                                    <div key={folder.id} onClick={() => handleFolderClick(folder.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 cursor-pointer border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700 transition-colors group">
                                        <div className="p-1 rounded-md text-text-subtle" style={{ color: folder.color }}>
                                            <Icon name="folder" className="w-5 h-5" variant="filled" />
                                        </div>
                                        <span className="font-semibold text-text-main dark:text-secondary-100 flex-1">{folder.name}</span>
                                        <span className="text-xs text-text-subtle">{folder.tableIds.length} tables</span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="h-px bg-secondary-200 dark:bg-secondary-700 w-full mt-6 opacity-50" />
                    </div>
                )}

                {/* SECTION 2: Data Grid */}
                <div>
                    <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3 px-1">
                        {currentFolderId ? `Tables in "${currentFolder?.name}"` : "All Tables"}
                    </h3>

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {displayTables.map(table => (
                                <TableGridItem
                                    key={table.id}
                                    table={table}
                                    onSelect={() => onSelectTable(table.id)}
                                    onMove={() => onMoveTable(table)}
                                    onRename={() => onRenameTable(table)}
                                    onDelete={() => onDeleteTable(table)}
                                    onStudy={() => onNavigateStudy(table.id)}
                                    theme={theme}
                                    customTagColors={settings.tagColors || {}}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {displayTables.map(table => (
                                <div key={table.id} onClick={() => onSelectTable(table.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800/50 cursor-pointer border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700 transition-colors group">
                                    <Icon name="table-cells" className="w-5 h-5 text-primary-500" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-text-main dark:text-secondary-100 truncate">{table.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-text-subtle">
                                            <span>{table.rowCount ?? table.rows.length} words</span>
                                            <span>•</span>
                                            <span>Modified {new Date(table.modifiedAt || 0).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onNavigateStudy(table.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Study
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {displayTables.length === 0 && (
                        <div className="p-8 text-center text-text-subtle italic border-2 border-dashed border-secondary-200 dark:border-secondary-700 rounded-xl">
                            No tables here yet.
                        </div>
                    )}
                </div>

            </div>

            {/* Mobile Floating Action Button */}
            <div className="md:hidden fixed bottom-20 right-6 z-30 flex flex-col gap-3">
                {!currentFolderId && (
                    <Button onClick={onCreateFolder} size="lg" className="rounded-full shadow-lg w-12 h-12 p-0 flex items-center justify-center bg-secondary-200 dark:bg-secondary-700 text-text-main">
                        <Icon name="folder" className="w-5 h-5" />
                    </Button>
                )}
                <Button onClick={onCreateTable} size="lg" className="rounded-full shadow-xl w-14 h-14 p-0 flex items-center justify-center bg-primary-600 text-white">
                    <Icon name="plus" className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
};

export default FileBrowser;