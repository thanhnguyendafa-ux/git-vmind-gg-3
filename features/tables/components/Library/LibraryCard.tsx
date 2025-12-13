
import * as React from 'react';
import { LibraryItem } from '../../../../types';
import Icon from '../../../../components/ui/Icon';
import { Button } from '../../../../components/ui/Button';
import Popover from '../../../../components/ui/Popover';

interface LibraryCardProps {
    item: LibraryItem;
    onDownload: (item: LibraryItem) => void;
    isOwner?: boolean;
    onEdit?: (item: LibraryItem) => void;
    onDelete?: (item: LibraryItem) => void;
}

const LibraryCard: React.FC<LibraryCardProps> = ({ item, onDownload, isOwner, onEdit, onDelete }) => {
    // Extract row count from payload safely
    const rowCount = item.payload?.rowCount ?? item.payload?.rows?.length ?? 0;
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    
    return (
        <div className="flex flex-col bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden h-full relative group">
            <div className="p-4 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-text-main dark:text-secondary-100 text-lg line-clamp-1 flex-1 pr-2" title={item.title}>
                        {item.title}
                    </h3>
                     
                     <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-secondary-100 dark:bg-secondary-700 text-text-subtle px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Icon name="arrow-down-tray" className="w-3 h-3" />
                            {item.stats?.downloads || 0}
                        </span>
                        
                        {isOwner && (
                            <div className="relative z-20" onClick={(e) => e.preventDefault()}>
                                <Popover
                                    isOpen={isMenuOpen}
                                    setIsOpen={setIsMenuOpen}
                                    trigger={
                                        <button 
                                            className="p-1 rounded-full text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors" 
                                            onClick={e => e.preventDefault()}
                                        >
                                            <Icon name="dots-horizontal" className="w-4 h-4" />
                                        </button>
                                    }
                                    contentClassName="w-36"
                                >
                                    <div className="py-1">
                                        <button onClick={() => { onEdit?.(item); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700">
                                            <Icon name="pencil" className="w-4 h-4" /> Edit Details
                                        </button>
                                        <button onClick={() => { onDelete?.(item); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20">
                                            <Icon name="trash" className="w-4 h-4" /> Unpublish
                                        </button>
                                    </div>
                                </Popover>
                            </div>
                        )}
                    </div>
                </div>
                
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mb-3">
                    by {item.author_name || 'Anonymous'} {isOwner && '(You)'}
                </p>
                
                <p className="text-sm text-text-subtle line-clamp-3 mb-4 h-[4.5em]">
                    {item.description || "No description provided."}
                </p>

                <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags?.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-text-subtle rounded-md">
                            {tag}
                        </span>
                    ))}
                    {(item.tags?.length || 0) > 3 && (
                        <span className="text-[10px] px-1 text-text-subtle">+{item.tags!.length - 3}</span>
                    )}
                </div>
            </div>

            <div className="p-3 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
                <span className="text-xs text-text-subtle font-mono">
                    {rowCount} words
                </span>
                <Button size="sm" onClick={() => onDownload(item)} className="h-8 px-3 text-xs">
                    <Icon name="arrow-down-tray" className="w-3.5 h-3.5 mr-1.5" />
                    Get
                </Button>
            </div>
        </div>
    );
};

export default LibraryCard;
