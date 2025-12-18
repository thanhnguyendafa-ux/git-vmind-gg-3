
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNoteStore } from '../../stores/useNoteStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { useTagStore } from '../../stores/useTagStore';
import { useUserStore } from '../../stores/useUserStore';
import { Note, Folder } from '../../types';
import AuroraBackground from '../../components/ui/AuroraBackground';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// Components
import ReadingLayout from './components/ReadingLayout';
import ReadingSidebar from './components/ReadingSidebar';
import ReadingContent from './components/ReadingContent';
import NoteBrowser from './components/NoteBrowser';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Icon from '../../components/ui/Icon';

type ViewMode = 'browser' | 'reading' | 'editing';

const ReadingScreen: React.FC = () => {
  const { notes, createNote, updateNote, deleteNote } = useNoteStore(useShallow(state => ({
      notes: state.notes,
      createNote: state.createNote,
      updateNote: state.updateNote,
      deleteNote: state.deleteNote,
  })));
  
  const { 
      folders, 
      createFolder, 
      deleteFolder, 
      updateFolder,
      moveNoteToFolder 
  } = useTableStore(useShallow(state => ({
      folders: state.folders,
      createFolder: state.createFolder,
      deleteFolder: state.deleteFolder,
      updateFolder: state.updateFolder,
      moveNoteToFolder: state.moveNoteToFolder
  })));

  const { tags: allGlobalTags } = useTagStore();
  const { setTagColor } = useUserStore();

  const { readingScreenTarget, setReadingScreenTarget } = useSessionStore();
  const { isTablesSidebarOpen, setIsTablesSidebarOpen } = useUIStore();
  
  // Persistent Desktop Sidebar State
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useLocalStorage('vmind-reading-sidebar-open', true);

  // Navigation State
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<ViewMode>('browser');
  
  // Modals
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState('');
  const [folderToRename, setFolderToRename] = React.useState<Folder | null>(null);
  const [editedFolderName, setEditedFolderName] = React.useState('');
  const [folderToDelete, setFolderToDelete] = React.useState<string | null>(null);

  const [noteToRename, setNoteToRename] = React.useState<Note | null>(null);
  const [editedNoteTitle, setEditedNoteTitle] = React.useState('');
  const [noteToDelete, setNoteToDelete] = React.useState<Note | null>(null);
  const [noteToMove, setNoteToMove] = React.useState<Note | null>(null);

  // Sync with external navigation (Deep Linking)
  React.useEffect(() => {
    if (readingScreenTarget?.noteId) {
      setActiveNoteId(readingScreenTarget.noteId);
      setViewMode('reading');
      // Force sidebar close on mobile or desktop when deep linking for immersion
      setIsTablesSidebarOpen(false);
      // We don't clear target here, Content consumes it for text highlighting
    }
  }, [readingScreenTarget, setIsTablesSidebarOpen]);

  // Handle Sidebar Toggle (Adaptive)
  const handleToggleSidebar = () => {
      if (window.innerWidth >= 768) {
          setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
      } else {
          setIsTablesSidebarOpen(!isTablesSidebarOpen);
      }
  };

  // Handle Note Selection
  const handleSelectNote = (id: string) => {
      setActiveNoteId(id);
      setViewMode('reading');
      // Collapse sidebar for immersive reading on desktop too
      setIsTablesSidebarOpen(false);
  };

  const handleBackToBrowser = () => {
      setActiveNoteId(null);
      setViewMode('browser');
      // Re-open sidebar when returning to browser
      setIsTablesSidebarOpen(true);
  };

  const handleToggleEditMode = () => {
      if (viewMode === 'reading') {
          setViewMode('editing');
          // Bring back sidebar for context when editing
          if (window.innerWidth >= 768) {
              setIsTablesSidebarOpen(true);
          }
      } else {
          setViewMode('reading');
          setIsTablesSidebarOpen(false);
      }
  };

  const handleCreateNote = async () => {
      // If inside a folder, we create it and move it there
      const initialNote = { title: 'New Note' };
      await createNote(initialNote);
      
      const newest = notes.sort((a, b) => b.createdAt - a.createdAt)[0];
      
      if (newest && currentFolderId) {
          await moveNoteToFolder(newest.id, currentFolderId);
      }
      
      if (newest) {
          setActiveNoteId(newest.id);
          // New notes enter Edit mode immediately
          setViewMode('editing');
          if (window.innerWidth >= 768) setIsTablesSidebarOpen(true);
      }
  };
  
  const handleCreateFolder = async () => {
      if (newFolderName.trim()) {
          await createFolder(newFolderName.trim());
          setIsCreateFolderModalOpen(false);
          setNewFolderName('');
      }
  };
  
  const handleConfirmRenameFolder = async () => {
      if (folderToRename && editedFolderName.trim()) {
          await updateFolder(folderToRename.id, { name: editedFolderName.trim() });
          setFolderToRename(null);
          setEditedFolderName('');
      }
  };
  
  const handleConfirmRenameNote = async () => {
      if (noteToRename && editedNoteTitle.trim()) {
          await updateNote({ ...noteToRename, title: editedNoteTitle.trim() });
          setNoteToRename(null);
          setEditedNoteTitle('');
      }
  };
  
  const handleMoveNote = async (targetFolderId: string | null) => {
      if (noteToMove) {
          await moveNoteToFolder(noteToMove.id, targetFolderId);
          setNoteToMove(null);
      }
  };
  
  const orphanNotes = React.useMemo(() => {
    const allFolderNoteIds = new Set(folders.flatMap(f => f.noteIds || []));
    const journalRegex = /^\[\d{2}-\d{2}-\d{2} Journal\]/;
    return notes
        .filter(n => !journalRegex.test(n.title))
        .filter(n => !allFolderNoteIds.has(n.id))
        .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes, folders]);
  
  const allFilteredNotes = React.useMemo(() => {
      const journalRegex = /^\[\d{2}-\d{2}-\d{2} Journal\]/;
      return notes.filter(n => !journalRegex.test(n.title));
  }, [notes]);

  return (
    <div className="relative h-full w-full overflow-hidden">
        {/* 1. The Atmosphere */}
        <AuroraBackground />

        {/* 2. The Content Layer */}
        <div className="relative z-10 h-full w-full">
            <ReadingLayout
                isSidebarOpen={isTablesSidebarOpen}
                setIsSidebarOpen={setIsTablesSidebarOpen}
                isDesktopSidebarOpen={isDesktopSidebarOpen}
                sidebar={
                    <ReadingSidebar
                        folders={folders}
                        notes={allFilteredNotes}
                        activeNoteId={activeNoteId}
                        onSelectNote={handleSelectNote}
                        onCreateNote={handleCreateNote}
                        currentFolderId={currentFolderId}
                        onSelectFolder={(id) => {
                            setCurrentFolderId(id);
                            setActiveNoteId(null);
                            setViewMode('browser');
                        }}
                        allGlobalTags={allGlobalTags}
                        setTagColor={setTagColor}
                    />
                }
            >
            {activeNoteId ? (
                <ReadingContent 
                    noteId={activeNoteId} 
                    viewMode={viewMode}
                    onModeChange={handleToggleEditMode}
                    onToggleSidebar={handleToggleSidebar}
                    onBack={handleBackToBrowser}
                />
            ) : (
                <NoteBrowser 
                    currentFolderId={currentFolderId}
                    setCurrentFolderId={setCurrentFolderId}
                    folders={folders}
                    notes={allFilteredNotes}
                    orphanNotes={orphanNotes}
                    allGlobalTags={allGlobalTags}
                    onMoveNote={setNoteToMove}
                    onRenameNote={(n) => { setNoteToRename(n); setEditedNoteTitle(n.title); }}
                    onDeleteNote={setNoteToDelete}
                    onDeleteFolder={(id) => setFolderToDelete(id)}
                    onRenameFolder={(f) => { setFolderToRename(f); setEditedFolderName(f.name); }}
                    onUpdateFolder={updateFolder}
                    onSelectNote={handleSelectNote}
                    onCreateNote={handleCreateNote}
                    onCreateFolder={() => setIsCreateFolderModalOpen(true)}
                />
            )}
            </ReadingLayout>
            
            {/* Modals */}
            <Modal isOpen={isCreateFolderModalOpen} onClose={() => setIsCreateFolderModalOpen(false)} title="Create New Folder">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Folder Name</label>
                        <Input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="e.g., Science Articles" autoFocus onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setIsCreateFolderModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create Folder</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!folderToRename} onClose={() => setFolderToRename(null)} title="Rename Folder">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">New Name</label>
                        <Input type="text" value={editedFolderName} onChange={e => setEditedFolderName(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmRenameFolder()} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setFolderToRename(null)}>Cancel</Button>
                        <Button onClick={handleConfirmRenameFolder} disabled={!editedFolderName.trim()}>Save</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={!!noteToRename} onClose={() => setNoteToRename(null)} title="Rename Note">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">New Title</label>
                        <Input type="text" value={editedNoteTitle} onChange={e => setEditedNoteTitle(e.target.value)} autoFocus onKeyDown={e => e.key === 'Enter' && handleConfirmRenameNote()} />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" onClick={() => setNoteToRename(null)}>Cancel</Button>
                        <Button onClick={handleConfirmRenameNote} disabled={!editedNoteTitle.trim()}>Save</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!noteToMove} onClose={() => setNoteToMove(null)} title={`Move "${noteToMove?.title}"`}>
                <div className="p-6">
                    <p className="text-sm text-text-subtle mb-4">Select a destination folder:</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                            <button onClick={() => handleMoveNote(null)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                            <Icon name="home" className="w-5 h-5 text-text-subtle"/>
                            <span className="font-semibold">Library Root</span>
                        </button>
                        {folders.map(folder => (
                            <button key={folder.id} onClick={() => handleMoveNote(folder.id)} className="w-full text-left flex items-center gap-2 p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                <Icon name="folder" className="w-5 h-5 text-warning-500" variant="filled"/>
                                <span className="font-semibold">{folder.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!folderToDelete}
                onClose={() => setFolderToDelete(null)}
                onConfirm={() => { if(folderToDelete) deleteFolder(folderToDelete); setFolderToDelete(null); }}
                title="Delete Folder?"
                message="Are you sure you want to delete this folder? Notes inside will be moved to the Library Root."
                confirmText="Delete Folder"
            />
            
            <ConfirmationModal
                isOpen={!!noteToDelete}
                onClose={() => setNoteToDelete(null)}
                onConfirm={() => { if(noteToDelete) deleteNote(noteToDelete.id); setNoteToDelete(null); }}
                title="Delete Note?"
                message={`Are you sure you want to delete "${noteToDelete?.title}"? This cannot be undone.`}
                confirmText="Delete"
                confirmVariant="destructive"
            />
        </div>
    </div>
  );
};

export default ReadingScreen;
