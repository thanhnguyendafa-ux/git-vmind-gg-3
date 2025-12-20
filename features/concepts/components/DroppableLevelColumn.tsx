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
            className={`flex flex-col min-w-[280px] max-w-[320px] h-full rounded-2xl border shadow-lg transition-all duration-200 ${isOver
                    ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 scale-105'
                    : 'bg-white/70 dark:bg-black/20 backdrop-blur-lg border-white/40 dark:border-white/5'
                }`}
        >
            {/* Column Header */}
            <button
                onClick={onToggle}
                className="flex-shrink-0 p-4 flex items-center justify-between hover:bg-white/50 dark:hover:bg-white/5 rounded-t-2xl transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white text-sm font-bold">
                        {level.order}
                    </div>
                    <div className="text-left">
                        <h3 className="text-sm font-semibold text-text-main dark:text-secondary-100">
                            {level.name}
                        </h3>
                        {level.description && (
                            <p className="text-xs text-text-subtle line-clamp-1">
                                {level.description}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-200 dark:bg-secondary-600 text-text-subtle font-medium">
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
