import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTagStore } from '../../stores/useTagStore';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useDebounce } from '../../hooks/useDebounce';
import Popover from '../../components/ui/Popover';
import { gradients, getTagStyle } from '../../utils/colorUtils';
import { Screen, Tag, TagScope } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import Modal from '../../components/ui/Modal';

const scopeOptions: { id: TagScope | 'all', label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'global', label: 'Global' },
    { id: 'table', label: 'Tables' },
    { id: 'flashcard', label: 'Flashcards' },
    { id: 'anki', label: 'Anki' },
];

interface TagTreeItemProps {
  tag: Tag;
  level: number;
  allTags: Tag[];
  isExpanded: boolean;
  onToggleExpand: (tagId: string) => void;
  onDeleteRequest: (tagId: string) => void;
  onUpdateTag: (tagId: string, updates: Partial<Omit<Tag, 'id'>>) => void;
}

const TagTreeItem: React.FC<TagTreeItemProps> = ({ tag, level, allTags, isExpanded, onToggleExpand, onDeleteRequest, onUpdateTag }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedName, setEditedName] = React.useState(tag.name);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);

  const [dragOver, setDragOver] = React.useState(false);

  const children = React.useMemo(() => allTags.filter(t => t.parentId === tag.id), [allTags, tag.id]);

  const handleSaveEdit = () => {
    if (editedName.trim() && editedName.trim() !== tag.name) {
      onUpdateTag(tag.id, { name: editedName.trim() });
    }
    setIsEditing(false);
  };

  const handleColorChange = (color: string) => {
    onUpdateTag(tag.id, { color });
    setIsColorPickerOpen(false);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("tagId", tag.id);
    e.stopPropagation();
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const draggedTagId = e.dataTransfer.getData("tagId");
    // Prevent dropping a tag onto itself or one of its own children
    if (draggedTagId && draggedTagId !== tag.id && !children.some(c => c.id === draggedTagId)) {
        onUpdateTag(draggedTagId, { parentId: tag.id });
    }
  };

  return (
    <div className={`rounded-lg ${dragOver ? 'bg-primary-100 dark:bg-primary-900/20' : ''}`}>
        <div 
          className="p-2 flex items-center group" 
          style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
            {children.length > 0 ? (
                <button onClick={() => onToggleExpand(tag.id)} className="p-1 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700">
                    <Icon name="chevron-right" className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
            ) : (
                <div className="w-6 h-6"/>
            )}
            
            <div style={{ background: tag.color || '#e2e8f0' }} className="w-4 h-4 rounded-md border border-black/10 mx-2 flex-shrink-0" />

            {isEditing ? (
                <Input value={editedName} onChange={e => setEditedName(e.target.value)} onBlur={handleSaveEdit} onKeyDown={e => e.key === 'Enter' && handleSaveEdit()} autoFocus className="h-8 text-sm" />
            ) : (
                <span className="font-semibold text-sm flex-1 truncate">{tag.name}</span>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Popover
                    isOpen={isMenuOpen}
                    setIsOpen={setIsMenuOpen}
                    trigger={<Button variant="ghost" size="sm" className="px-2"><Icon name="dots-horizontal" className="w-5 h-5"/></Button>}
                 >
                    <div className="flex flex-col items-start">
                        <Button variant="ghost" onClick={() => { setIsEditing(true); setIsMenuOpen(false); }}>Rename</Button>
                        <Button variant="ghost" onClick={() => { setIsColorPickerOpen(true); setIsMenuOpen(false); }}>Change Color</Button>
                        <Button variant="ghost" className="text-error-500 hover:text-error-600" onClick={() => { onDeleteRequest(tag.id); setIsMenuOpen(false); }}>Delete</Button>
                    </div>
                </Popover>
            </div>
        </div>
        {isExpanded && children.length > 0 && (
            <div>
                {children.map(child => (
                    <TagTreeItem 
                        key={child.id}
                        tag={child}
                        level={level + 1}
                        allTags={allTags}
                        isExpanded={isExpanded}
                        onToggleExpand={onToggleExpand}
                        onDeleteRequest={onDeleteRequest}
                        onUpdateTag={onUpdateTag}
                    />
                ))}
            </div>
        )}
        <Popover isOpen={isColorPickerOpen} setIsOpen={setIsColorPickerOpen} trigger={<></>} contentClassName="w-40">
             <div className="grid grid-cols-4 gap-2">
                {gradients.map((gradient, index) => (
                    <button key={index} onClick={() => handleColorChange(gradient)} className="w-8 h-8 rounded-full border border-black/10" style={{ background: gradient }}/>
                ))}
            </div>
        </Popover>
    </div>
  );
};


const TagManagerScreen: React.FC = () => {
    const { tags, addTag, updateTag, deleteTag } = useTagStore(useShallow(state => ({
        tags: state.tags,
        addTag: state.addTag,
        updateTag: state.updateTag,
        deleteTag: state.deleteTag,
    })));
    const { setCurrentScreen } = useUIStore();
    const [searchTerm, setSearchTerm] = React.useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [newTagInput, setNewTagInput] = React.useState('');
    const [newTagScope, setNewTagScope] = React.useState<TagScope>('global');
    const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
    const [deleteConfirmation, setDeleteConfirmation] = React.useState<{ tagId: string, tagName: string, childrenCount: number } | null>(null);
    const [currentScope, setCurrentScope] = React.useState<TagScope | 'all'>('all');
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handleToggleExpand = (tagId: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) next.delete(tagId);
            else next.add(tagId);
            return next;
        });
    };
    
    const handleAddNewTag = () => {
        if (newTagInput.trim()) {
            addTag({ name: newTagInput.trim(), scope: newTagScope });
            setNewTagInput('');
        }
    };

    const handleDeleteRequest = (tagId: string) => {
        const childrenCount = tags.filter(t => t.parentId === tagId).length;
        const tag = tags.find(t => t.id === tagId);
        if (childrenCount > 0 && tag) {
            setDeleteConfirmation({ tagId, tagName: tag.name, childrenCount });
        } else {
            deleteTag(tagId);
        }
    };

    const handleDropOnRoot = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const draggedTagId = e.dataTransfer.getData("tagId");
        if (draggedTagId) {
            updateTag(draggedTagId, { parentId: undefined });
        }
    };

    const filteredByScope = React.useMemo(() => {
        if (currentScope === 'all') return tags;
        return tags.filter(tag => {
            if (currentScope === 'global') return !tag.scope || tag.scope === 'global';
            return tag.scope === currentScope;
        });
    }, [tags, currentScope]);

    const filteredTags = React.useMemo(() => {
        const lowerQuery = debouncedSearchTerm.toLowerCase();
        if (!lowerQuery) return filteredByScope;
        
        const matchingIds = new Set<string>();
        const addWithAncestors = (tagId: string) => {
            const tag = filteredByScope.find(t => t.id === tagId);
            if (tag) {
                matchingIds.add(tag.id);
                if (tag.parentId) {
                    addWithAncestors(tag.parentId);
                }
            }
        };

        filteredByScope.forEach(tag => {
            if (tag.name.toLowerCase().includes(lowerQuery)) {
                addWithAncestors(tag.id);
            }
        });
        return filteredByScope.filter(tag => matchingIds.has(tag.id));
    }, [filteredByScope, debouncedSearchTerm]);

    const topLevelTags = React.useMemo(() => {
        return filteredTags
            .filter(tag => !tag.parentId || !filteredTags.some(t => t.id === tag.parentId))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredTags]);

    const renderScopeFilter = () => {
        const currentLabel = scopeOptions.find(o => o.id === currentScope)?.label || 'All';
        
        if (isMobile) {
            return (
                <Popover isOpen={isFilterOpen} setIsOpen={setIsFilterOpen} trigger={
                    <Button variant="secondary" className="w-full justify-between">
                        <span>Scope: {currentLabel}</span>
                        <Icon name="chevron-down" className="w-4 h-4"/>
                    </Button>
                }>
                    <div className="flex flex-col items-stretch gap-1">
                        {scopeOptions.map(opt => (
                            <Button key={opt.id} variant={currentScope === opt.id ? 'primary' : 'ghost'} onClick={() => { setCurrentScope(opt.id); setIsFilterOpen(false); }}>
                                {opt.label}
                            </Button>
                        ))}
                    </div>
                </Popover>
            );
        }

        return (
             <div className="flex items-center gap-2 p-1 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                {scopeOptions.map(opt => (
                    <button 
                        key={opt.id} 
                        onClick={() => setCurrentScope(opt.id)}
                        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${currentScope === opt.id ? 'bg-white dark:bg-secondary-700 shadow' : 'text-text-subtle hover:bg-white/50 dark:hover:bg-secondary-800/50'}`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn max-w-4xl">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Settings)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Tag Manager</h1>
                    <p className="text-sm text-text-subtle">Drag and drop to organize your tags.</p>
                </div>
            </header>
            
            <div className="mb-4 space-y-4">
                 <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <Input
                        type="text"
                        placeholder="Create a new tag..."
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddNewTag()}
                        className="flex-1"
                    />
                    <div className="flex gap-2">
                         <select value={newTagScope} onChange={e => setNewTagScope(e.target.value as TagScope)} className="bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 text-sm">
                            {(scopeOptions.filter(o => o.id !== 'all') as {id: TagScope, label: string}[]).map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.label}</option>
                            ))}
                        </select>
                        <Button onClick={handleAddNewTag} disabled={!newTagInput.trim()}>Add Tag</Button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                    <div className="relative flex-1">
                        <Icon name="search" className="w-5 h-5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input 
                            type="text"
                            placeholder="Search tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    {renderScopeFilter()}
                </div>
            </div>

            <div 
                className="bg-surface dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 min-h-[300px]"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDropOnRoot}
            >
                {topLevelTags.map(tag => (
                    <TagTreeItem
                        key={tag.id}
                        tag={tag}
                        level={0}
                        allTags={filteredTags}
                        isExpanded={expandedIds.has(tag.id) || !!debouncedSearchTerm}
                        onToggleExpand={handleToggleExpand}
                        onDeleteRequest={handleDeleteRequest}
                        onUpdateTag={updateTag}
                    />
                ))}
                {tags.length > 0 && topLevelTags.length === 0 && (
                    <div className="p-8 text-center text-text-subtle">
                        <p>No tags match your search or filter.</p>
                    </div>
                )}
                {tags.length === 0 && (
                    <div className="p-8 text-center text-text-subtle">
                        <p>No tags yet. Create one above to get started.</p>
                    </div>
                )}
            </div>
            
            {deleteConfirmation && (
                <Modal isOpen={true} onClose={() => setDeleteConfirmation(null)} title={`Delete "${deleteConfirmation.tagName}"?`}>
                    <div className="p-6 space-y-4">
                        <p className="text-text-subtle">This tag has {deleteConfirmation.childrenCount} child tag(s). What would you like to do?</p>
                        <div className="bg-error-50 dark:bg-error-900/10 p-3 rounded-md border border-error-100 dark:border-error-900/20">
                            <p className="text-sm text-error-700 dark:text-error-300"><strong>Warning:</strong> This action cannot be undone.</p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button variant="secondary" onClick={() => { deleteTag(deleteConfirmation.tagId, 'orphan'); setDeleteConfirmation(null); }}>
                                Orphan Children (Keep Sub-tags)
                            </Button>
                            <Button variant="destructive" onClick={() => { deleteTag(deleteConfirmation.tagId, 'delete'); setDeleteConfirmation(null); }}>
                                Delete All (Including Sub-tags)
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TagManagerScreen;