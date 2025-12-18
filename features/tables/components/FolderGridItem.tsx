import * as React from 'react';
import { Folder } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';

interface FolderGridItemProps {
    folder: Folder;
    onSelect: () => void;
    onDelete: () => void;
    onRename: () => void;
    onColorChange: (color: string) => void;
    theme: 'light' | 'dark' | 'pastel';
    variant?: 'table' | 'note'; // New prop to determine visual context
}

const FOLDER_COLORS = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#a855f7', // Purple
    '#64748b', // Slate
    '#ec4899', // Pink
    '#06b6d4', // Cyan
];

const FolderGridItem: React.FC<FolderGridItemProps> = ({ folder, onSelect, onDelete, onRename, onColorChange, theme, variant = 'table' }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    
    // Default folder color based on variant and theme
    // Reading folders default to Cyan (Info), Tables default to Slate/Default
    const defaultColor = variant === 'note' 
        ? '#06b6d4' 
        : (theme === 'dark' ? '#475569' : '#cbd5e1');
        
    const activeColor = folder.color || defaultColor;
    
    // Icon Configuration based on variant
    const iconConfig = variant === 'note' ? {
        bg: 'bg-info-100 dark:bg-info-900/30',
        text: 'text-info-600 dark:text-info-400',
    } : {
        bg: 'bg-secondary-100 dark:bg-secondary-700',
        text: 'text-text-subtle',
    };

    return (
        <div 
            onClick={onSelect}
            className="group relative flex flex-col h-32 bg-white/80 dark:bg-[#0F1A17]/90 backdrop-blur-md rounded-xl border border-white/50 dark:border-white/10 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Color Strip */}
            <div 
                className="h-1.5 w-full transition-colors duration-300" 
                style={{ background: activeColor }}
            />

            {/* Main Content */}
            <div className="flex-1 p-3 flex flex-col relative">
                {/* Watermark Icon */}
                <div className="absolute -bottom-4 -left-4 opacity-[0.07] pointer-events-none transition-opacity group-hover:opacity-[0.12]">
                    <Icon name="folder" className="w-24 h-24" variant="filled" />
                </div>

                <div className="flex items-start justify-between gap-2 relative z-10">
                    <div className="flex items-start gap-2 min-w-0">
                         <div className={`p-1.5 rounded-md mt-0.5 flex-shrink-0 ${iconConfig.bg}`} style={{ color: folder.color ? folder.color : undefined }}>
                            <Icon name="folder" className={`w-4 h-4 ${!folder.color ? iconConfig.text : ''}`} variant="filled" />
                        </div>
                        <h3 className="font-bold text-sm text-text-main dark:text-secondary-100 line-clamp-2 leading-tight pt-0.5" title={folder.name}>
                            {folder.name}
                        </h3>
                    </div>
                    
                    {/* Menu Button */}
                    <div className="flex-shrink-0 -mt-1 -mr-1" onClick={e => e.stopPropagation()}>
                        <Popover
                            isOpen={isMenuOpen}
                            setIsOpen={setIsMenuOpen}
                            trigger={
                                <button className="p-1.5 rounded-full text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 opacity-50 group-hover:opacity-100 transition-all focus:opacity-100">
                                    <Icon name="dots-horizontal" className="w-4 h-4" />
                                </button>
                            }
                            contentClassName="w-44"
                        >
                            <div className="p-2 space-y-2">
                                <div>
                                    <p className="text-[10px] font-bold text-text-subtle uppercase mb-1.5 px-1">Color</p>
                                    <div className="grid grid-cols-4 gap-1.5">
                                        {FOLDER_COLORS.map(c => (
                                            <button
                                                key={c}
                                                onClick={() => { onColorChange(c); }}
                                                className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${activeColor === c ? 'ring-2 ring-offset-1 ring-primary-500' : ''}`}
                                                style={{ background: c }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="h-px bg-secondary-200 dark:bg-secondary-700" />
                                <div>
                                     <button onClick={() => { onRename(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md">
                                        <Icon name="pencil" className="w-4 h-4 text-text-subtle"/> Rename
                                    </button>
                                    <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md">
                                        <Icon name="trash" className="w-4 h-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        </Popover>
                    </div>
                </div>
                
                <div className="mt-auto pt-2 flex items-center justify-between relative z-10">
                    <span className="text-xs text-text-subtle font-medium">
                        {variant === 'note' ? `${folder.noteIds?.length || 0} notes` : `${folder.tableIds?.length || 0} tables`}
                    </span>
                    <Icon name="chevron-right" className="w-4 h-4 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>
        </div>
    );
};

export default FolderGridItem;