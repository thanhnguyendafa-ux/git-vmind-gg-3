
import * as React from 'react';
import { Note, Folder, Tag } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import { useUserStore } from '../../../stores/useUserStore';
import Icon from '../../../components/ui/Icon';
import FolderGridItem from '../../tables/components/FolderGridItem';
import NoteGridItem from './NoteGridItem';
import { Button } from '../../../components/ui/Button';

interface NoteBrowserProps {
    currentFolderId: string | null;
    setCurrentFolderId: (id: string | null) => void;
    folders: Folder[];
    notes: Note[];
    orphanNotes: Note[];
    allGlobalTags: Tag[];
    onMoveNote: (note: Note) => void;
    onRenameNote: (note: Note) => void;
    onDeleteNote: (note: Note) => void;
    onDeleteFolder: (folderId: string) => void;
    onRenameFolder: (folder: Folder) => void;
    onUpdateFolder: (folderId: string, updates: Partial<Folder>) => void;
    onSelectNote: (noteId: string) => void;
    onCreateNote: () => void;
    onCreateFolder: () => void;
}

const NoteBrowser: React.FC<NoteBrowserProps> = (props) => {
    const { 
        currentFolderId, setCurrentFolderId,
        folders, notes, orphanNotes, 
        onMoveNote, onRenameNote, onDeleteNote, onDeleteFolder, onRenameFolder, onUpdateFolder, onSelectNote,
        onCreateNote, onCreateFolder
    } = props;
    
    const { theme } = useUIStore();
    const { settings } = useUserStore();
    
    // Internal View State
    const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
    const [sortMode, setSortMode] = React.useState<'title' | 'latest' | 'size'>('latest');

    // --- Derived Data ---
    const currentFolder = React.useMemo(() => 
        currentFolderId ? folders.find(f => f.id === currentFolderId) : null
    , [currentFolderId, folders]);

    const displayFolders = React.useMemo(() => {
        // Show folders only at Root Level
        if (currentFolderId) return [];
        return folders;
    }, [currentFolderId, folders]);

    const displayNotes = React.useMemo(() => {
        let items: Note[] = [];
        if (currentFolderId) {
            // Folder View: Notes inside the folder
            const folder = folders.find(f => f.id === currentFolderId);
            if (folder && folder.noteIds) {
                const folderNoteIds = new Set(folder.noteIds);
                items = notes.filter(n => folderNoteIds.has(n.id));
            }
        } else {
            // Root View: Orphan notes
            items = orphanNotes;
        }
        
        // Sorting
        return items.sort((a, b) => {
            if (sortMode === 'title') return a.title.localeCompare(b.title);
            if (sortMode === 'size') return (b.content?.length || 0) - (a.content?.length || 0);
            // Default: Created At (Newest first)
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }, [currentFolderId, folders, notes, orphanNotes, sortMode]);

    // --- Interaction Handlers ---
    const handleFolderClick = (folderId: string) => {
        setCurrentFolderId(folderId);
    };

    const handleBreadcrumbClick = () => {
        setCurrentFolderId(null);
    };

    // --- Empty State ---
    if (displayFolders.length === 0 && displayNotes.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fadeIn">
                <div className="bg-info-50/50 dark:bg-info-900/20 p-6 rounded-full mb-6 text-info-500 backdrop-blur-sm">
                    <Icon name={currentFolderId ? "folder" : "reading-person"} className="w-16 h-16" variant="filled" />
                </div>
                <h2 className="text-2xl font-bold text-text-main dark:text-secondary-100 mb-2">
                    {currentFolderId ? 'Empty Folder' : 'Reading Space Empty'}
                </h2>
                <p className="text-text-subtle mb-8 max-w-sm">
                    {currentFolderId 
                        ? "This folder has no notes yet. Move notes here or create a new one." 
                        : "Start your collection by creating a reading note or organizing with folders."
                    }
                </p>
                <div className="flex gap-4">
                    <Button onClick={onCreateNote} size="lg" className="shadow-lg">
                        <Icon name="plus" className="w-5 h-5 mr-2" /> New Note
                    </Button>
                     {!currentFolderId && (
                        <Button onClick={onCreateFolder} variant="secondary" size="lg">
                            <Icon name="folder" className="w-5 h-5 mr-2" /> New Folder
                        </Button>
                    )}
                </div>
                {currentFolderId && (
                    <button onClick={handleBreadcrumbClick} className="mt-8 text-primary-500 hover:underline">
                        Return to Reading Space
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header Bar: Glass */}
            <header className="flex-shrink-0 px-6 py-4 border-b border-white/20 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 bg-white/40 dark:bg-black/20 backdrop-blur-md z-20">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-lg font-medium overflow-hidden">
                    <button 
                        onClick={handleBreadcrumbClick} 
                        className={`flex items-center gap-1 transition-colors ${currentFolderId ? 'text-text-subtle hover:text-text-main' : 'text-text-main dark:text-secondary-100 font-bold'}`}
                    >
                        <Icon name="reading-person" className="w-5 h-5" variant="filled" />
                        <span className="hidden sm:inline">Reading Space</span>
                    </button>
                    
                    {currentFolder && (
                        <>
                            <Icon name="chevron-right" className="w-4 h-4 text-text-subtle flex-shrink-0" />
                            <div className="flex items-center gap-2 text-text-main dark:text-secondary-100 font-bold truncate">
                                <Icon name="folder" className="w-5 h-5 text-info-500" variant="filled" />
                                <span>{currentFolder.name}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button size="sm" onClick={onCreateNote} className="hidden md:flex">
                        <Icon name="plus" className="w-4 h-4 mr-1" /> New Note
                    </Button>

                    {!currentFolderId && (
                        <Button size="sm" variant="secondary" onClick={onCreateFolder} className="hidden md:flex">
                            <Icon name="folder" className="w-4 h-4 mr-1" /> New Folder
                        </Button>
                    )}

                    <div className="h-6 w-px bg-white/20 dark:bg-white/10 mx-1"></div>

                    {/* Sort */}
                     <select 
                        value={sortMode} 
                        onChange={(e) => setSortMode(e.target.value as any)}
                        className="bg-transparent text-sm font-semibold text-text-subtle hover:text-text-main focus:outline-none cursor-pointer"
                    >
                        <option value="latest">Latest</option>
                        <option value="title">Title</option>
                        <option value="size">Length</option>
                    </select>

                    {/* View Toggle */}
                    <div className="flex bg-white/30 dark:bg-black/30 rounded-lg p-1">
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 animate-fadeIn">
                
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
                                        variant="note" // Explicitly mark as Note Folder for Cyan styling
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {displayFolders.map(folder => (
                                    <div key={folder.id} onClick={() => handleFolderClick(folder.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/20 dark:hover:border-white/10 transition-colors group">
                                        <div className="p-1 rounded-md text-info-500" style={{ color: folder.color }}>
                                            <Icon name="folder" className="w-5 h-5" variant="filled" />
                                        </div>
                                        <span className="font-semibold text-text-main dark:text-secondary-100 flex-1">{folder.name}</span>
                                        <span className="text-xs text-text-subtle">{folder.noteIds?.length || 0} notes</span>
                                        <Icon name="chevron-right" className="w-4 h-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="h-px bg-white/20 dark:bg-white/10 w-full mt-6 opacity-50" />
                    </div>
                )}

                {/* SECTION 2: Notes Grid */}
                <div>
                     <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-3 px-1">
                         {currentFolderId ? `Notes in "${currentFolder?.name}"` : "All Notes"}
                    </h3>

                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                            {displayNotes.map(note => (
                                <NoteGridItem 
                                    key={note.id}
                                    note={note}
                                    onSelect={() => onSelectNote(note.id)}
                                    onMove={() => onMoveNote(note)}
                                    onRename={() => onRenameNote(note)}
                                    onDelete={() => onDeleteNote(note)}
                                    theme={theme}
                                    customTagColors={settings.tagColors || {}}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {displayNotes.map(note => {
                                const isJournal = /^\[\d{2}-\d{2}-\d{2} Journal\]/.test(note.title);
                                return (
                                <div key={note.id} onClick={() => onSelectNote(note.id)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer border border-transparent hover:border-white/20 dark:hover:border-white/10 transition-colors group">
                                    <Icon name={isJournal ? "pencil" : "reading-person"} className={`w-5 h-5 ${isJournal ? "text-purple-500" : "text-info-500"}`} variant={isJournal ? 'outline' : 'filled'} />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-text-main dark:text-secondary-100 truncate">{note.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-text-subtle">
                                            <span>{note.content?.split(/\s+/).length || 0} words</span>
                                            <span>•</span>
                                            <span>Created {new Date(note.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onSelectNote(note.id); }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        Read
                                    </Button>
                                </div>
                            )})}
                        </div>
                    )}
                    
                    {displayNotes.length === 0 && (
                         <div className="p-8 text-center text-text-subtle italic border-2 border-dashed border-white/20 dark:border-white/10 rounded-xl">
                             No notes here yet.
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
                <Button onClick={onCreateNote} size="lg" className="rounded-full shadow-xl w-14 h-14 p-0 flex items-center justify-center bg-primary-600 text-white">
                    <Icon name="plus" className="w-6 h-6" />
                </Button>
            </div>
        </div>
    );
};

export default NoteBrowser;
