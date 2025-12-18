
import * as React from 'react';
import { Note, Folder, Tag, Bookmark } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { Input } from '../../../components/ui/Input';
import FileTreeItem from '../../tables/components/FileTreeItem'; // Reusing consistency
import TagFilterItem from '../../tables/components/TagFilterItem'; // Reusing consistency
import { useShallow } from 'zustand/react/shallow';
import { useUserStore } from '../../../stores/useUserStore';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useSessionStore } from '../../../stores/useSessionStore';

interface ReadingSidebarProps {
  folders: Folder[];
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  // Tree Navigation Props
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  // Tags
  allGlobalTags: Tag[];
  setTagColor: (tagName: string, color: string) => void;
}

const SidebarSection: React.FC<{ 
    title: string; 
    icon: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    action?: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children, action }) => (
    <div className="flex flex-col border-b border-white/40 dark:border-white/10 last:border-0">
        <button 
            onClick={onToggle}
            className="flex items-center justify-between px-4 py-3 hover:bg-white/40 dark:hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-text-subtle">
                <Icon name={icon} className="w-4 h-4" />
                <span>{title}</span>
            </div>
            <Icon name="chevron-down" className={`w-4 h-4 text-text-subtle transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="px-2 pb-2">
                {children}
                {action && <div className="mt-2 px-2">{action}</div>}
            </div>
        </div>
    </div>
);

const ReadingSidebar: React.FC<ReadingSidebarProps> = ({ 
    folders, 
    notes, 
    activeNoteId, 
    onSelectNote, 
    onCreateNote,
    currentFolderId,
    onSelectFolder,
    allGlobalTags,
    setTagColor
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const { settings } = useUserStore(useShallow(state => ({ settings: state.settings })));
  const { removeBookmark } = useNoteStore();
  const { setReadingScreenTarget } = useSessionStore();

  const [isExplorerOpen, setIsExplorerOpen] = React.useState(true);
  const [isTagsOpen, setIsTagsOpen] = React.useState(true);
  const [isBookmarksOpen, setIsBookmarksOpen] = React.useState(true);
  const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(new Set());

  // Strict Data Separation: Filter out Journal entries
  const filteredNotes = React.useMemo(() => {
    const journalRegex = /^\[\d{2}-\d{2}-\d{2} Journal\]/;
    return notes
      .filter(n => !journalRegex.test(n.title)) // Exclude journals
      .filter(n => n.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [notes, searchTerm]);

  // Group notes by folder
  const notesInFolders = React.useMemo(() => {
    const map = new Map<string, Note[]>();
    folders.forEach(f => {
        if (f.noteIds) {
             const folderNotes = filteredNotes.filter(n => f.noteIds!.includes(n.id));
             map.set(f.id, folderNotes.sort((a, b) => b.createdAt - a.createdAt));
        } else {
             map.set(f.id, []);
        }
    });
    return map;
  }, [folders, filteredNotes]);

  // Find orphans
  const orphanNotes = React.useMemo(() => {
    const allFolderNoteIds = new Set(folders.flatMap(f => f.noteIds || []));
    return filteredNotes.filter(n => !allFolderNoteIds.has(n.id)).sort((a, b) => b.createdAt - a.createdAt);
  }, [filteredNotes, folders]);

  // Auto-expand folder if selected via other means
  React.useEffect(() => {
    if (currentFolderId && !expandedIds.has(currentFolderId)) {
      setExpandedIds(prev => new Set(prev).add(currentFolderId));
    }
  }, [currentFolderId]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev => {
        const next = new Set(prev);
        if (next.has(tagId)) next.delete(tagId);
        else next.add(tagId);
        return next;
    });
  };
  
  const handleBookmarkClick = (noteId: string, startIndex: number) => {
      setReadingScreenTarget({
          noteId,
          selectionStartIndex: startIndex
      });
  };
  
  const handleDeleteBookmark = (noteId: string, bookmarkId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      removeBookmark(noteId, bookmarkId);
  };

  const tagCounts = React.useMemo(() => {
      const counts = new Map<string, number>();
      filteredNotes.forEach(note => {
          (note.tagIds || []).forEach(tagId => {
              counts.set(tagId, (counts.get(tagId) || 0) + 1);
          });
      });
      return counts;
  }, [filteredNotes]);

  const activeNoteBookmarks = React.useMemo(() => {
      if (!activeNoteId) return [];
      const note = notes.find(n => n.id === activeNoteId);
      if (!note || !note.bookmarks) return [];
      return [...note.bookmarks].sort((a, b) => a.startIndex - b.startIndex);
  }, [notes, activeNoteId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/40 dark:border-white/10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-main dark:text-secondary-100 flex items-center gap-2">
                <Icon name="reading-person" className="w-5 h-5 text-primary-500" variant="filled" />
                Reading Space
            </h2>
            <button onClick={onCreateNote} className="p-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-md hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors" title="New Note">
                <Icon name="plus" className="w-4 h-4" />
            </button>
        </div>
        <div className="relative">
            <Icon name="search" className="w-4 h-4 text-text-subtle absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notes..."
                className="pl-9 h-9 text-sm bg-white/50 dark:bg-black/20 border-white/40 dark:border-white/10 focus:bg-white dark:focus:bg-black/40"
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* 1. Explorer Section */}
          <SidebarSection 
                title="Explorer" 
                icon="folder" 
                isOpen={isExplorerOpen} 
                onToggle={() => setIsExplorerOpen(!isExplorerOpen)}
            >
                <div className="flex flex-col gap-0.5 py-1">
                     {/* Root / Workspace */}
                      <FileTreeItem
                        label="Reading Space"
                        icon="home"
                        level={0}
                        isSelected={currentFolderId === null && activeNoteId === null}
                        onSelect={() => {
                            onSelectFolder(null);
                            onSelectNote(''); // Deselect active note
                        }}
                        hasChildren={true}
                        isExpanded={true} 
                        onToggle={() => {}} 
                      />
                      
                      <div className="flex flex-col gap-0.5 relative">
                         {/* Indentation Guide */}
                         <div className="absolute left-[17px] top-0 bottom-0 w-px bg-white/20 dark:bg-white/10" />

                         {/* Folders */}
                         {folders.map(folder => {
                             const folderNotes = notesInFolders.get(folder.id) || [];
                             const isExpanded = expandedIds.has(folder.id);
                             const hasChildren = folderNotes.length > 0;

                             return (
                                <React.Fragment key={folder.id}>
                                    <FileTreeItem
                                        label={folder.name}
                                        icon="folder"
                                        iconColor="text-info-500" // Reading Space Blue
                                        level={1}
                                        isSelected={currentFolderId === folder.id && activeNoteId === null}
                                        hasChildren={hasChildren}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleExpand(folder.id)}
                                        onSelect={() => {
                                            onSelectFolder(folder.id);
                                            onSelectNote(''); // Deselect active note
                                            if (!isExpanded) toggleExpand(folder.id);
                                        }}
                                    />
                                    {isExpanded && hasChildren && (
                                        <div className="flex flex-col gap-0.5 relative">
                                            <div className="absolute left-[29px] top-0 bottom-2 w-px bg-white/20 dark:bg-white/10" />
                                            {folderNotes.map(note => (
                                                <FileTreeItem
                                                    key={note.id}
                                                    label={note.title}
                                                    icon="reading-person" // Updated icon
                                                    iconColor="text-info-500" // Reading Space Blue
                                                    level={2}
                                                    isSelected={activeNoteId === note.id}
                                                    onSelect={() => onSelectNote(note.id)}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </React.Fragment>
                             )
                         })}
                         
                         {/* Orphan Notes */}
                         {orphanNotes.map(note => (
                             <FileTreeItem
                                key={note.id}
                                label={note.title}
                                icon="reading-person" // Updated icon
                                iconColor="text-info-500" // Reading Space Blue
                                level={1}
                                isSelected={activeNoteId === note.id}
                                onSelect={() => onSelectNote(note.id)}
                            />
                         ))}
                      </div>
                </div>
          </SidebarSection>
          
          {/* 2. Bookmarks Section (Visible only when note is active) */}
          {activeNoteId && (
              <SidebarSection
                title="Bookmarks"
                icon="bookmark"
                isOpen={isBookmarksOpen}
                onToggle={() => setIsBookmarksOpen(!isBookmarksOpen)}
              >
                  {activeNoteBookmarks.length === 0 ? (
                      <p className="text-xs text-text-subtle italic px-2 py-1">No bookmarks yet.</p>
                  ) : (
                      <div className="space-y-1">
                          {activeNoteBookmarks.map(b => (
                              <div key={b.id} className="group flex items-center justify-between p-2 rounded-md hover:bg-white/40 dark:hover:bg-white/5 cursor-pointer transition-colors" onClick={() => handleBookmarkClick(b.noteId, b.startIndex)}>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                      <Icon name="bookmark" className="w-3.5 h-3.5 text-warning-500 flex-shrink-0" variant="filled" />
                                      <span className="text-xs text-text-main dark:text-secondary-200 truncate">{b.textPreview}</span>
                                  </div>
                                  <button 
                                    onClick={(e) => handleDeleteBookmark(b.noteId, b.id, e)}
                                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-text-subtle hover:text-error-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                      <Icon name="trash" className="w-3 h-3" />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </SidebarSection>
          )}
          
          {/* 3. Tags Section */}
           <SidebarSection 
                title="Tags" 
                icon="tag" 
                isOpen={isTagsOpen} 
                onToggle={() => setIsTagsOpen(!isTagsOpen)}
                action={
                     selectedTagIds.size > 0 ? (
                        <button onClick={() => setSelectedTagIds(new Set())} className="text-xs text-primary-500 hover:underline w-full text-left">
                            Clear filters
                        </button>
                    ) : undefined
                }
            >
                <div className="space-y-0.5">
                    {allGlobalTags.map(tag => (
                        <TagFilterItem 
                            key={tag.id}
                            tag={tag}
                            isChecked={selectedTagIds.has(tag.id)}
                            onToggle={() => handleToggleTag(tag.id)}
                            onColorChange={setTagColor}
                            customColors={settings.tagColors || {}}
                            count={tagCounts.get(tag.id) || 0}
                        />
                    ))}
                     {allGlobalTags.length === 0 && (
                        <p className="text-xs text-text-subtle italic px-2 py-1">No tags found.</p>
                    )}
                </div>
            </SidebarSection>
      </div>
    </div>
  );
};

export default ReadingSidebar;
