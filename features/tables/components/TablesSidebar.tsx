
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Table, Folder, Tag, Screen } from '../../../types';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useTagStore } from '../../../stores/useTagStore';
import Icon from '../../../components/ui/Icon';
import TagFilterItem from './TagFilterItem';
import FileTree from './FileTree';
import { Button } from '../../../components/ui/Button';

interface TablesSidebarProps {
  folders: Folder[];
  tables: (Partial<Table> & { id: string; name: string; rowCount: number; tagIds?: string[] })[];
  tablesWithoutFolder: any[]; // Not strictly needed for FileTree logic as it calculates orphans, but good for props consistency
  allGlobalTags: Tag[];
  onMoveTable: (table: Partial<Table>) => void; // Kept for API consistency
  onRenameTable: (table: Partial<Table>) => void;
  onDeleteTable: (table: Partial<Table>) => void;
  onSelectTable: (tableId: string) => void;
  // New Props for Tree Navigation
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

const SidebarSection: React.FC<{ 
    title: string; 
    icon: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    action?: React.ReactNode;
}> = ({ title, icon, isOpen, onToggle, children, action }) => (
    <div className="flex flex-col border-b border-secondary-200/50 dark:border-secondary-700/50 last:border-0">
        <button 
            onClick={onToggle}
            className="flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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

const TablesSidebar: React.FC<TablesSidebarProps> = ({ 
    folders, 
    tables, 
    allGlobalTags, 
    onSelectTable,
    currentFolderId,
    onSelectFolder
}) => {
    const { settings, setTagColor } = useUserStore(useShallow(state => ({
        settings: state.settings,
        setTagColor: state.setTagColor,
    })));
    const { toggleDesktopSidebar, triggerGlobalAction, setCurrentScreen } = useUIStore();

    const [isExplorerOpen, setIsExplorerOpen] = React.useState(true);
    const [isTagsOpen, setIsTagsOpen] = React.useState(true);
    const [selectedTagIds, setSelectedTagIds] = React.useState<Set<string>>(new Set());

    // Tag Counts
    const tagCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        tables.forEach(table => {
            (table.tagIds || []).forEach(tagId => {
                counts.set(tagId, (counts.get(tagId) || 0) + 1);
            });
        });
        return counts;
    }, [tables]);

    const handleToggleTag = (tagId: string) => {
        setSelectedTagIds(prev => {
            const next = new Set(prev);
            if (next.has(tagId)) next.delete(tagId);
            else next.add(tagId);
            return next;
        });
    };
    
    // Guarded Selection Handlers
    const handleSelectFolderGuarded = (folderId: string | null) => {
        triggerGlobalAction(() => {
            // If switching folders, we assume we might be leaving Detail view to List view
            setCurrentScreen(Screen.Tables); 
            onSelectFolder(folderId);
            onSelectTable(''); // Clear table selection to show folder view
        });
    };

    const handleSelectTableGuarded = (tableId: string) => {
        triggerGlobalAction(() => {
            onSelectTable(tableId);
        });
    };

    return (
        <div className="flex flex-col h-full bg-surface/80 dark:bg-secondary-900/80 backdrop-blur-xl border-r border-white/20 dark:border-white/10 overflow-y-auto custom-scrollbar relative z-20 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            
            {/* Sidebar Header with Collapse Button */}
            <div className="flex items-center justify-between p-2 border-b border-secondary-200/50 dark:border-secondary-700/50">
                <span className="text-xs font-bold text-text-subtle uppercase px-2">Navigation</span>
                <Button variant="ghost" size="sm" onClick={toggleDesktopSidebar} className="hidden md:flex h-8 w-8 p-0" title="Collapse Sidebar">
                    <Icon name="sidebar" className="w-4 h-4" />
                </Button>
            </div>

            {/* 1. Explorer Section (Tree View) */}
            <SidebarSection 
                title="Explorer" 
                icon="folder" 
                isOpen={isExplorerOpen} 
                onToggle={() => setIsExplorerOpen(!isExplorerOpen)}
            >
                <FileTree
                    folders={folders}
                    tables={tables}
                    currentFolderId={currentFolderId}
                    onSelectFolder={handleSelectFolderGuarded}
                    onSelectTable={handleSelectTableGuarded}
                />
            </SidebarSection>

            {/* 2. Tags Section (Filter) */}
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
                            onColorChange={(tagName, color) => setTagColor(tagName, color)}
                            customColors={settings.tagColors || {}}
                            count={tagCounts.get(tag.id) || 0}
                        />
                    ))}
                    {allGlobalTags.length === 0 && (
                        <p className="text-xs text-text-subtle italic px-2 py-1">No tags found.</p>
                    )}
                </div>
            </SidebarSection>

            {/* Bottom padding for scroll */}
            <div className="h-4 flex-shrink-0" />
        </div>
    );
};

export default TablesSidebar;
