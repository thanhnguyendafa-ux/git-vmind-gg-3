import * as React from 'react';
import { Table, Tag } from '../../../types';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';
import { useTagStore } from '../../../stores/useTagStore';
import { getTagSolidColor } from '../../../utils/colorUtils';
import Popover from '../../../components/ui/Popover';
import PublishModal from './Library/PublishModal';
import { unpublishTableByOriginalId } from '../../../services/libraryService';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useTableStore } from '../../../stores/useTableStore';
import ConfirmationModal from '../../../components/ui/ConfirmationModal';
import { useDependencyGraph } from '../../../hooks/useDependencyGraph';
import BacklinkPopover from './BacklinkPopover';

interface TableGridItemProps {
    table: Table;
    onSelect: () => void;
    onMove: () => void;
    onRename: () => void;
    onDelete: () => void;
    onStudy: () => void;
    theme: 'light' | 'dark' | 'pastel';
    customTagColors: Record<string, string>;
}

const TableGridItem: React.FC<TableGridItemProps> = ({ table, onSelect, onMove, onRename, onDelete, onStudy, theme, customTagColors }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const [isPublishModalOpen, setIsPublishModalOpen] = React.useState(false);
    const [isUnpublishConfirmOpen, setIsUnpublishConfirmOpen] = React.useState(false);
    
    const { tags: allTags } = useTagStore();
    const { session } = useUserStore();
    const { showToast } = useUIStore();
    const { setTablePublicStatus } = useTableStore();
    
    // Dependency Graph for Backlinks
    const { usedBy } = useDependencyGraph();
    const linkedSets = usedBy[table.id] || [];

    const displayTags = React.useMemo(() => {
        const tagMap = new Map(allTags.map(t => [t.id, t]));
        return (table.tagIds || []).map(id => tagMap.get(id)).filter((t): t is Tag => !!t).slice(0, 2);
    }, [table.tagIds, allTags]);

    // Metadata First: Check if we have a count but no rows loaded
    const rowCount = table.rowCount ?? table.rows.length;
    const isMetadataOnly = rowCount > 0 && table.rows.length === 0;

    // Use primary tag for color accent strip
    const accentColor = displayTags.length > 0 
        ? getTagSolidColor(displayTags[0].name, theme === 'dark' ? 'dark' : 'light', customTagColors) 
        : (theme === 'dark' ? '#334155' : '#e2e8f0');
    
    const handleUnpublish = async () => {
        if (!session?.user) return;
        try {
            await unpublishTableByOriginalId(table.id, session.user.id);
            setTablePublicStatus(table.id, false);
            showToast("Table is now private.", "success");
        } catch (error) {
            console.error(error);
            showToast("Failed to unpublish table.", "error");
        } finally {
            setIsUnpublishConfirmOpen(false);
        }
    };

    return (
        <>
            <div 
                onClick={onSelect}
                className="group relative flex flex-col h-32 bg-white/80 dark:bg-[#0F1A17]/90 backdrop-blur-md rounded-xl border border-white/50 dark:border-white/10 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
            >
                {/* Color Strip */}
                <div 
                    className="h-1.5 w-full transition-colors duration-300" 
                    style={{ background: accentColor }}
                />

                {/* Main Content */}
                <div className="flex-1 p-3 flex flex-col min-h-0">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                            <div className="p-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-md text-primary-500 mt-0.5 flex-shrink-0 relative">
                                <TableIcon className="w-4 h-4" />
                                {table.isPublic && (
                                     <div className="absolute -top-1 -right-1 bg-info-500 text-white rounded-full p-[2px] border border-surface dark:border-secondary-800" title="Published">
                                        <Icon name="globe" className="w-2 h-2" variant="filled" />
                                     </div>
                                )}
                            </div>
                            <h3 className="font-bold text-sm text-text-main dark:text-secondary-100 line-clamp-2 leading-tight" title={table.name}>
                                {table.name}
                            </h3>
                        </div>
                        
                        {/* Menu Button */}
                        <div className="flex-shrink-0 -mt-1 -mr-1" onClick={e => e.stopPropagation()}>
                            <Popover
                                isOpen={isMenuOpen}
                                setIsOpen={setIsMenuOpen}
                                trigger={
                                    <button className="p-1.5 rounded-full text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 opacity-50 group-hover:opacity-100 transition-all">
                                        <Icon name="dots-horizontal" className="w-4 h-4" />
                                    </button>
                                }
                                contentClassName="w-44"
                            >
                                <div className="py-1">
                                    <button onClick={() => { onStudy(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                        <Icon name="brain" className="w-4 h-4 text-primary-500" /> Study Now
                                    </button>
                                    <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1 mx-2"></div>
                                    
                                    {table.isPublic ? (
                                        <button onClick={() => { setIsUnpublishConfirmOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                            <Icon name="globe" className="w-4 h-4" /> Unpublish
                                        </button>
                                    ) : (
                                        <button onClick={() => { setIsPublishModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                            <Icon name="arrow-up-tray" className="w-4 h-4 text-info-500" /> Publish
                                        </button>
                                    )}
                                    
                                    <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1 mx-2"></div>
                                    <button onClick={() => { onRename(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                        <Icon name="pencil" className="w-4 h-4" /> Rename
                                    </button>
                                    <button onClick={() => { onMove(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                        <Icon name="folder" className="w-4 h-4" /> Move
                                    </button>
                                    <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                        <Icon name="trash" className="w-4 h-4" /> Delete
                                    </button>
                                </div>
                            </Popover>
                        </div>
                    </div>

                    <div className="mt-auto pt-2 flex items-end justify-between">
                        <div className="flex items-center gap-1 min-w-0 pr-2">
                             {/* Backlink Badge */}
                             <BacklinkPopover usedBy={linkedSets} />
                             
                             {/* Tags */}
                            {displayTags.map(tag => (
                                <span 
                                    key={tag.id}
                                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-text-subtle truncate max-w-[60px]"
                                >
                                    {tag.name}
                                </span>
                            ))}
                        </div>
                        <span className="text-[10px] font-mono font-medium text-text-subtle flex-shrink-0 bg-secondary-50 dark:bg-secondary-800/50 px-1.5 py-0.5 rounded border border-secondary-100 dark:border-secondary-700 flex items-center gap-1">
                            {isMetadataOnly && <Icon name="cloud-rain" className="w-3 h-3 text-sky-500" />}
                            {rowCount}
                        </span>
                    </div>
                </div>
            </div>

            <PublishModal 
                isOpen={isPublishModalOpen} 
                onClose={() => setIsPublishModalOpen(false)} 
                table={table} 
            />

            <ConfirmationModal
                isOpen={isUnpublishConfirmOpen}
                onClose={() => setIsUnpublishConfirmOpen(false)}
                onConfirm={handleUnpublish}
                title="Unpublish Table?"
                message="Stop sharing this table? It will be removed from the Community Library. Your local copy remains safe."
                confirmText="Unpublish"
            />
        </>
    );
};

export default TableGridItem;