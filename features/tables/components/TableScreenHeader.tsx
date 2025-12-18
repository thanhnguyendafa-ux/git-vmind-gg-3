
import * as React from 'react';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';
import { getTagStyle } from '../../../utils/colorUtils';
import { useTagStore } from '../../../stores/useTagStore';
import { Tag } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import { useCounterStore } from '../../../stores/useCounterStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../../components/ui/Button';
import { useDependencyGraph } from '../../../hooks/useDependencyGraph';
import BacklinkPopover from './BacklinkPopover';

// FIX: Removed 'Scramble' as it is an obsolete navigation mode.
type StudyNavigationMode = 'StudySession' | 'Confidence' | 'Theater';

interface TableScreenHeaderProps {
  tableId: string;
  tableName: string;
  shortCode?: string; // New prop for namespaced ID prefix
  isGuest: boolean;
  isPublic?: boolean;
  tagIds: string[];
  tagColors: Record<string, string>;
  onBack: () => void;
  backLabel?: string;
  onUpdateName: (newName: string) => void;
  onPublishClick: () => void;
  onStudyClick: (mode: StudyNavigationMode) => void;
  onUpdateTagIds: (tagIds: string[]) => void;
  // New props for integrated navigation
  activeTab: 'view' | 'relations' | 'settings';
  onTabChange: (tab: 'view' | 'relations' | 'settings') => void;
  // Transactional Save Props
  pendingChanges?: number;
  onManualSave?: () => void;
}

const TableScreenHeader: React.FC<TableScreenHeaderProps> = ({
  tableId,
  tableName,
  shortCode,
  isGuest,
  isPublic,
  tagIds,
  tagColors,
  onBack,
  backLabel = "Back",
  onUpdateName,
  onPublishClick,
  onStudyClick,
  onUpdateTagIds,
  activeTab,
  onTabChange,
  pendingChanges = 0,
  onManualSave
}) => {
    const [isStudyOptionsOpen, setIsStudyOptionsOpen] = React.useState(false);
    const [isMoreOptionsOpen, setIsMoreOptionsOpen] = React.useState(false);
    const [tagInput, setTagInput] = React.useState('');
    const [isTagPopoverOpen, setIsTagPopoverOpen] = React.useState(false);
    
    const { tags: allTags, findOrCreateTagsByName } = useTagStore();
    const { setIsTablesSidebarOpen, isDesktopSidebarOpen, toggleDesktopSidebar } = useUIStore();

    // Dependency Graph
    const { usedBy } = useDependencyGraph();
    const linkedSets = usedBy[tableId] || [];

    const { addCounter, toggleTracking } = useCounterStore();
    const counter = useCounterStore(useShallow(state => state.counters.find(c => c.targetId === tableId)));
    const isTracking = counter?.isActive ?? false;

    const handleTrackingToggle = () => {
        if (!counter) {
            addCounter(tableId, 'table', tableName);
        } else {
            toggleTracking(tableId);
        }
    };

    const displayTags = React.useMemo(() => {
        const tagMap = new Map(allTags.map(t => [t.id, t]));
        return (tagIds || []).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [tagIds, allTags]);

    const handleAddTag = () => {
        const newTags = findOrCreateTagsByName([tagInput.trim()]);
        if (newTags.length > 0) {
            const newTagId = newTags[0].id;
            if (!tagIds.includes(newTagId)) {
                onUpdateTagIds([...tagIds, newTagId]);
            }
        }
        setTagInput('');
    };
    
    const handleRemoveTag = (tagToRemove: Tag) => {
        onUpdateTagIds(tagIds.filter(id => id !== tagToRemove.id));
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const studyOptions = [
        { label: 'Confidence', mode: 'Confidence' as StudyNavigationMode, icon: 'flashcards' },
        { label: 'Theater', mode: 'Theater' as StudyNavigationMode, icon: 'film' },
    ];

    // --- Sub-components for cleaner render ---

    const Tabs = () => (
        <div className="flex bg-secondary-100 dark:bg-secondary-800 p-0.5 rounded-lg flex-shrink-0">
            {(['view', 'relations', 'settings'] as const).map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`
                        px-3 py-1 text-xs font-semibold rounded-md transition-all capitalize
                        ${activeTab === tab 
                            ? 'bg-white dark:bg-secondary-600 shadow-sm text-text-main dark:text-white' 
                            : 'text-text-subtle hover:text-text-main hover:bg-secondary-200/50 dark:hover:bg-secondary-700/50'
                        }
                    `}
                >
                    {tab}
                </button>
            ))}
        </div>
    );

    const TagEditorContent = (
        <div className="p-3 w-64">
            <p className="text-xs font-bold text-text-subtle uppercase mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
                {displayTags.map(tag => (
                    <span
                        key={tag.id}
                        style={getTagStyle(tag.name, tagColors)}
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                    >
                        {tag.name}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                            className="hover:text-error-600 ml-0.5"
                        >
                            <Icon name="x" className="w-3 h-3"/>
                        </button>
                    </span>
                ))}
                {displayTags.length === 0 && <span className="text-xs text-text-subtle italic">No tags</span>}
            </div>
            <div className="flex gap-1">
                <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="flex-1 text-xs bg-secondary-100 dark:bg-secondary-700 border border-secondary-200 dark:border-secondary-600 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500 outline-none"
                    placeholder="Add tag..."
                />
                <button onClick={handleAddTag} disabled={!tagInput.trim()} className="bg-primary-500 text-white rounded p-1 hover:bg-primary-600 disabled:opacity-50">
                    <Icon name="plus" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    const SaveIndicator = () => {
        if (pendingChanges > 0) {
            return (
                <button 
                    onClick={onManualSave}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-warning-500 hover:bg-warning-600 text-white text-xs font-bold rounded-full transition-colors shadow-sm animate-pulse-slow"
                    title="Click to save changes now"
                >
                    <Icon name="cloud-rain" className="w-3.5 h-3.5" variant="filled" />
                    <span>Save ({pendingChanges})</span>
                </button>
            );
        }
        return (
             <div className="flex items-center gap-1 px-2 text-xs text-text-subtle opacity-60 cursor-default">
                 <Icon name="check" className="w-3.5 h-3.5" />
                 <span>Saved</span>
             </div>
        );
    };

    // --- Desktop Layout (Unified Single Row) ---
    const DesktopLayout = (
        <div className="hidden md:flex items-center justify-between w-full h-12 gap-4">
             {/* Left: Nav & Title */}
             <div className="flex items-center gap-3 flex-1 min-w-0">
                {!isDesktopSidebarOpen && (
                    <Button variant="ghost" size="sm" onClick={toggleDesktopSidebar} className="h-8 w-8 p-0 flex-shrink-0 text-text-subtle" title="Expand Sidebar">
                        <Icon name="sidebar" className="w-4 h-4" />
                    </Button>
                )}
                <div className="group relative flex items-center">
                     <button onClick={onBack} className="p-1.5 rounded-full text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors" title={backLabel}>
                        <Icon name="arrowLeft" className="w-5 h-5" />
                     </button>
                </div>
                
                <div className="flex items-baseline gap-3 min-w-0">
                    <div className="flex items-center gap-2">
                        {shortCode && (
                            <span className="text-xs font-mono font-bold text-text-subtle bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded border border-secondary-200 dark:border-secondary-700">
                                {shortCode}
                            </span>
                        )}
                        <input
                            type="text"
                            value={tableName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateName(e.target.value)}
                            className="text-lg font-bold bg-transparent focus:outline-none focus:bg-secondary-100 dark:focus:bg-secondary-800 rounded px-2 -ml-2 text-text-main dark:text-secondary-100 truncate max-w-[300px] transition-colors"
                        />
                        {/* New Backlink Indicator */}
                        <BacklinkPopover usedBy={linkedSets} />
                    </div>
                    
                    {/* Compact Tags Trigger */}
                    <Popover
                        isOpen={isTagPopoverOpen}
                        setIsOpen={setIsTagPopoverOpen}
                        trigger={
                            <button className="flex items-center gap-1 text-xs font-medium text-text-subtle hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 px-2 py-1 rounded-full transition-colors">
                                <span className="opacity-70">#</span>
                                <span>{displayTags.length > 0 ? `${displayTags.length} tags` : 'Add tags'}</span>
                            </button>
                        }
                        contentClassName="z-50"
                    >
                        {TagEditorContent}
                    </Popover>
                </div>

                <div className="h-4 w-px bg-secondary-200 dark:bg-secondary-700 mx-1"></div>
                <Tabs />
             </div>

             {/* Right: Condensed Actions */}
             <div className="flex items-center gap-2">
                 {/* Save Status Indicator */}
                 <SaveIndicator />

                 <Button variant="ghost" size="sm" onClick={handleTrackingToggle} className={`h-8 px-2 ${isTracking ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'text-text-subtle'}`} title="Track Activity">
                    <Icon name="chart-bar" variant={isTracking ? 'filled' : 'outline'} className="w-4 h-4" />
                 </Button>

                 {!isGuest && (
                     <>
                        <Popover
                            isOpen={isMoreOptionsOpen}
                            setIsOpen={setIsMoreOptionsOpen}
                            trigger={
                                <Button variant="ghost" size="sm" className="h-8 px-2 text-text-subtle" title="More Options">
                                    <Icon name="dots-horizontal" className="w-4 h-4" />
                                </Button>
                            }
                        >
                            <div className="py-1 w-40">
                                <button onClick={() => { setIsMoreOptionsOpen(false); onPublishClick(); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                    <Icon name="globe" className="w-4 h-4" /> Publish
                                </button>
                            </div>
                        </Popover>
                     </>
                 )}

                 <div className="flex items-center ml-2">
                     <button 
                        onClick={() => onStudyClick('StudySession')}
                        className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold h-8 px-4 rounded-l-md transition-colors flex items-center gap-2"
                    >
                        <Icon name="brain" className="w-4 h-4" /> Study
                    </button>
                    <Popover
                        isOpen={isStudyOptionsOpen}
                        setIsOpen={setIsStudyOptionsOpen}
                        trigger={
                            <button className="bg-primary-600 hover:bg-primary-700 text-white h-8 px-1.5 rounded-r-md border-l border-primary-700 transition-colors">
                                <Icon name="chevron-down" className="w-4 h-4" />
                            </button>
                        }
                        contentClassName="w-40 right-0"
                    >
                         <div className="py-1">
                            {studyOptions.map((option) => (
                                <button
                                    key={option.mode}
                                    onClick={() => { onStudyClick(option.mode); setIsStudyOptionsOpen(false); }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700"
                                >
                                    <Icon name={option.icon} className="w-4 h-4 text-text-subtle"/> {option.label}
                                </button>
                            ))}
                        </div>
                    </Popover>
                 </div>
             </div>
        </div>
    );

    // --- Mobile Layout (Stacked but clean) ---
    const MobileLayout = (
        <div className="md:hidden flex flex-col gap-3 pb-2">
            <div className="flex items-start justify-between gap-2">
                <button onClick={() => setIsTablesSidebarOpen(true)} className="p-2 -ml-2 rounded-full text-text-subtle">
                    <Icon name="list-bullet" className="w-6 h-6" />
                </button>
                
                <div className="flex-1 min-w-0 pt-1 flex flex-col items-center">
                     <input
                        type="text"
                        value={tableName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateName(e.target.value)}
                        className="text-xl font-bold bg-transparent w-full text-center text-text-main dark:text-secondary-100 truncate focus:outline-none"
                    />
                    <div className="flex items-center gap-2 mt-1">
                        {shortCode && (
                            <span className="text-[10px] font-mono font-bold text-text-subtle bg-secondary-100 dark:bg-secondary-800 px-1.5 py-0.5 rounded border border-secondary-200 dark:border-secondary-700">
                                {shortCode}
                            </span>
                        )}
                        <BacklinkPopover usedBy={linkedSets} />
                        <Popover
                            isOpen={isTagPopoverOpen}
                            setIsOpen={setIsTagPopoverOpen}
                            trigger={
                                <button className="flex items-center gap-1 text-[10px] uppercase font-bold text-text-subtle bg-secondary-100 dark:bg-secondary-800 px-2 py-0.5 rounded-full">
                                    <Icon name="tag" className="w-3 h-3" />
                                    <span>{displayTags.length} Tags</span>
                                </button>
                            }
                        >
                            {TagEditorContent}
                        </Popover>
                    </div>
                </div>

                <button onClick={onBack} className="p-2 -mr-2 rounded-full text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
            </div>

            <div className="flex items-center justify-between gap-2">
                <Tabs />
                <div className="flex gap-2 items-center">
                     <SaveIndicator />
                     <Button variant="ghost" size="sm" onClick={handleTrackingToggle} className={`h-8 w-8 p-0 rounded-full ${isTracking ? 'bg-primary-100 text-primary-600' : ''}`}>
                         <Icon name="chart-bar" className="w-4 h-4" variant={isTracking ? 'filled' : 'outline'}/>
                     </Button>
                     <Button size="sm" onClick={() => onStudyClick('StudySession')} className="h-8 text-xs">
                         Study
                     </Button>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="w-full">
            {DesktopLayout}
            {MobileLayout}
        </div>
    );
};

export default TableScreenHeader;
