
import * as React from 'react';
import { Note, Tag } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useTagStore } from '../../../stores/useTagStore';
import { getTagSolidColor } from '../../../utils/colorUtils';
import Popover from '../../../components/ui/Popover';

interface NoteGridItemProps {
    note: Note;
    onSelect: () => void;
    onMove: () => void;
    onRename: () => void;
    onDelete: () => void;
    theme: 'light' | 'dark' | 'pastel';
    customTagColors: Record<string, string>;
}

const NoteGridItem: React.FC<NoteGridItemProps> = ({ note, onSelect, onMove, onRename, onDelete, theme, customTagColors }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const { tags: allTags } = useTagStore();

    const displayTags = React.useMemo(() => {
        const tagMap = new Map(allTags.map(t => [t.id, t]));
        return (note.tagIds || []).map(id => tagMap.get(id)).filter((t): t is Tag => !!t).slice(0, 2);
    }, [note.tagIds, allTags]);

    // Calculate approximate reading time (200 words per minute)
    const readTime = React.useMemo(() => {
        if (!note.content) return '0m';
        const wordCount = note.content.split(/\s+/).length;
        const minutes = Math.max(1, Math.ceil(wordCount / 200));
        return `${minutes}m read`;
    }, [note.content]);

    // Detect Note Type
    const isJournal = /^\[\d{2}-\d{2}-\d{2} Journal\]/.test(note.title);
    
    // VISUAL SYSTEM: Reading Notes (Cyan) vs Journals (Purple)
    const visualConfig = isJournal ? {
        icon: 'pencil',
        iconBg: 'bg-purple-100 dark:bg-purple-900/30',
        iconColor: 'text-purple-600 dark:text-purple-400',
        accentDefault: theme === 'dark' ? '#a855f7' : '#d8b4fe', // Purple
        borderHover: 'hover:border-purple-300 dark:hover:border-purple-700',
        bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/10'
    } : {
        icon: 'reading-person',
        iconBg: 'bg-info-100 dark:bg-info-900/30',
        iconColor: 'text-info-600 dark:text-info-400',
        accentDefault: '#06b6d4', // Info/Cyan-500
        borderHover: 'hover:border-info-300 dark:hover:border-info-700',
        bgHover: 'hover:bg-info-50 dark:hover:bg-info-900/10'
    };

    // Use primary tag for color accent strip if available, else default based on type
    const accentColor = displayTags.length > 0 
        ? getTagSolidColor(displayTags[0].name, theme === 'dark' ? 'dark' : 'light', customTagColors) 
        : visualConfig.accentDefault;

    return (
        <div 
            onClick={onSelect}
            className={`group relative flex flex-col h-36 bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden ${visualConfig.borderHover} ${visualConfig.bgHover}`}
        >
            {/* Color Strip */}
            <div 
                className="h-1.5 w-full transition-colors duration-300" 
                style={{ background: accentColor }}
            />
            
            {/* Background Watermark Icon for instant recognition */}
            <div className={`absolute -bottom-4 -right-4 opacity-[0.05] pointer-events-none transition-opacity group-hover:opacity-[0.1] ${visualConfig.iconColor}`}>
                <Icon name={visualConfig.icon} className="w-24 h-24" variant="filled" />
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 flex flex-col min-h-0 relative z-10">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg mt-0.5 flex-shrink-0 ${visualConfig.iconBg} ${visualConfig.iconColor}`}>
                            <Icon name={visualConfig.icon} className="w-5 h-5" variant="filled" />
                        </div>
                        <div className="min-w-0">
                             <h3 className="font-bold text-sm text-text-main dark:text-secondary-100 line-clamp-2 leading-snug" title={note.title}>
                                {note.title}
                            </h3>
                            {isJournal && <span className="text-[10px] text-purple-500 font-medium uppercase tracking-wide">Journal Entry</span>}
                        </div>
                    </div>
                    
                    {/* Menu Button */}
                    <div className="flex-shrink-0 -mt-1 -mr-2" onClick={e => e.stopPropagation()}>
                        <Popover
                            isOpen={isMenuOpen}
                            setIsOpen={setIsMenuOpen}
                            trigger={
                                <button className="p-1.5 rounded-full text-text-subtle hover:text-text-main hover:bg-secondary-100 dark:hover:bg-secondary-700 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100">
                                    <Icon name="dots-horizontal" className="w-4 h-4" />
                                </button>
                            }
                            contentClassName="w-40"
                        >
                             <div className="py-1">
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
                    <div className="flex items-center gap-1 min-w-0">
                        {displayTags.map(tag => (
                            <span 
                                key={tag.id}
                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-text-subtle truncate max-w-[70px]"
                            >
                                {tag.name}
                            </span>
                        ))}
                    </div>
                    <span className="text-[10px] font-mono font-medium text-text-subtle flex-shrink-0 bg-secondary-50 dark:bg-secondary-800/50 px-1.5 py-0.5 rounded border border-secondary-100 dark:border-secondary-700/50">
                        {readTime}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default NoteGridItem;
