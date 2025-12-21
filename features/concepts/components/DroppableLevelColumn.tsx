import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ConceptLevel, VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';
import DraggableCard from './DraggableCard';
import { AnimatePresence, motion } from 'framer-motion';

interface DroppableLevelColumnProps {
    level: ConceptLevel;
    cards: VocabRow[];
    isExpanded: boolean;
    onToggle: () => void;
    onCardClick: (card: VocabRow) => void;
    searchQuery: string;
}

const DroppableLevelColumn: React.FC<DroppableLevelColumnProps> = ({
    level,
    cards,
    isExpanded,
    onToggle,
    onCardClick,
    searchQuery
}) => {
    const { setNodeRef, isOver } = useDroppable({
        id: level.id
    });

    return (
        <div
            className={`flex flex-col min-w-[300px] max-w-[340px] h-full rounded-[2.5rem] border transition-all duration-500 ${isOver
                ? 'bg-purple-500/10 border-purple-400/50 scale-[1.02] shadow-2xl shadow-purple-500/10'
                : 'bg-white/40 dark:bg-black/20 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-xl shadow-black/5'
                }`}
        >
            {/* Column Header */}
            <button
                onClick={onToggle}
                className="flex-shrink-0 p-6 flex items-center justify-between hover:bg-white/20 dark:hover:bg-white/5 rounded-t-[2.5rem] transition-all group/header"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-serif font-bold text-lg group-hover/header:rotate-12 transition-transform">
                        {level.order}
                    </div>
                    <div className="text-left min-w-0">
                        <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white leading-tight">
                            {level.name}
                        </h3>
                        {level.description && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/40 dark:text-emerald-400/30 mt-0.5 truncate">
                                {level.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 text-slate-400 dark:text-emerald-400/40">
                        {cards.length}
                    </span>
                    <Icon
                        name="chevron-down"
                        className={`w-5 h-5 text-text-subtle transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Column Body - Droppable Area */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: '100%', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-hidden"
                    >
                        <div
                            ref={setNodeRef}
                            className={`h-full overflow-y-auto p-3 space-y-2 custom-scrollbar ${isOver ? 'bg-purple-50/20 dark:bg-purple-900/10' : ''
                                }`}
                        >
                            {cards.map(card => (
                                <DraggableCard
                                    key={card.id}
                                    card={card}
                                    onClick={() => onCardClick(card)}
                                />
                            ))}
                            {cards.length === 0 && (
                                <div className="py-8 text-center">
                                    <Icon
                                        name={isOver ? "download" : "credit-card"}
                                        className={`w-8 h-8 mx-auto mb-2 ${isOver
                                            ? 'text-purple-500 dark:text-purple-400'
                                            : 'text-text-subtle'
                                            }`}
                                    />
                                    <p className="text-text-subtle text-sm">
                                        {isOver
                                            ? 'Drop card here'
                                            : searchQuery
                                                ? 'No matches'
                                                : 'No cards'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DroppableLevelColumn;
