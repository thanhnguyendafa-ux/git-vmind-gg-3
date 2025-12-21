import React, { useMemo, useState } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners
} from '@dnd-kit/core';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { ConceptLevel, VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';
import CardPreview from './CardPreview';
import DroppableLevelColumn from './DroppableLevelColumn';
import { AnimatePresence, motion } from 'framer-motion';

interface ConceptKanbanBoardProps {
    conceptId: string;
    searchQuery: string;
    onCardClick: (card: VocabRow) => void;
}

const ConceptKanbanBoard: React.FC<ConceptKanbanBoardProps> = ({
    conceptId,
    searchQuery,
    onCardClick
}) => {
    const { getLevelsByConcept, getRowsByLevel, searchCardsByConceptLevel, concepts } = useConceptStore();
    const { tables, upsertRow } = useTableStore();
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
    const [activeCard, setActiveCard] = useState<VocabRow | null>(null);

    const concept = useMemo(() => {
        return concepts.find(c => c.id === conceptId);
    }, [concepts, conceptId]);

    const levels = useMemo(() => {
        return getLevelsByConcept(conceptId);
    }, [conceptId, getLevelsByConcept]);

    // Auto-expand all levels on mount
    React.useEffect(() => {
        if (levels.length > 0 && expandedLevels.size === 0) {
            setExpandedLevels(new Set(levels.map(l => l.id)));
        }
    }, [levels]);

    const toggleLevel = (levelId: string) => {
        setExpandedLevels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(levelId)) {
                newSet.delete(levelId);
            } else {
                newSet.add(levelId);
            }
            return newSet;
        });
    };

    // Drag and Drop Setup
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const cardId = event.active.id as string;
        // Find the card across all levels
        for (const level of levels) {
            const cards = getRowsByLevel(level.id);
            const card = cards.find(c => c.id === cardId);
            if (card) {
                setActiveCard(card);
                break;
            }
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveCard(null);

        if (!over) return;

        const cardId = active.id as string;
        const targetLevelId = over.id as string;

        // Find the card and its table
        for (const table of tables) {
            const card = table.rows.find(r => r.id === cardId);
            if (card) {
                // Only update if level changed
                if (card.conceptLevelId !== targetLevelId) {
                    try {
                        await upsertRow(table.id, {
                            ...card,
                            conceptLevelId: targetLevelId
                        });
                    } catch (err) {
                        console.error('Failed to move card:', err);
                    }
                }
                break;
            }
        }
    };

    if (!concept) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center">
                        <Icon name="search" className="w-8 h-8 text-text-subtle" />
                    </div>
                    <p className="text-text-subtle">Concept not found or has been deleted.</p>
                </div>
            </div>
        );
    }

    if (levels.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md p-8 animate-fadeIn">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/30 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/40 dark:border-white/10 shadow-xl">
                        <Icon name="layers" className="w-10 h-10 text-slate-400 dark:text-emerald-400/50" />
                    </div>
                    <h2 className="text-3xl font-serif font-medium text-slate-900 dark:text-white mb-2">
                        Levels Required
                    </h2>
                    <p className="text-sm font-medium text-slate-500 dark:text-emerald-200/40 uppercase tracking-[0.15em]">
                        Create structural levels to begin organizing cards
                    </p>
                </div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="h-full overflow-x-auto overflow-y-hidden custom-scrollbar">
                <div className="h-full flex gap-4 p-6">
                    {levels.map((level) => {
                        const allCards = getRowsByLevel(level.id);
                        const cards = searchQuery
                            ? searchCardsByConceptLevel(level.id, searchQuery)
                            : allCards;
                        const isExpanded = expandedLevels.has(level.id);

                        return (
                            <DroppableLevelColumn
                                key={level.id}
                                level={level}
                                cards={cards}
                                isExpanded={isExpanded}
                                onToggle={() => toggleLevel(level.id)}
                                onCardClick={onCardClick}
                                searchQuery={searchQuery}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activeCard ? (
                    <div className="opacity-90 scale-105 rotate-3">
                        <CardPreview card={activeCard} onClick={() => { }} />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default ConceptKanbanBoard;
