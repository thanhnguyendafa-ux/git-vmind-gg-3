import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useConceptStore } from '../../stores/useConceptStore';
import { useTableStore } from '../../stores/useTableStore'; // Need store to look up row data
import { VocabRow } from '../../types';
import Icon from '../../components/ui/Icon';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelGalleryViewProps {
    currentRowId: string;
    onClose: () => void;
    onNavigateToRow: (rowId: string) => void;
}

const LevelGalleryView: React.FC<LevelGalleryViewProps> = ({ currentRowId, onClose, onNavigateToRow }) => {
    const { concepts, conceptLevels, getLevelsByConcept, getRowsByLevel } = useConceptStore();
    const { tables } = useTableStore(); // To get actual row data (front/back)

    // Find the current row's concept and level
    const contextData = useMemo(() => {
        // Need to find the row in tables to get its Link
        // Iterate all tables? Or assume currentRowId is unique enough (it is).
        let foundRow: VocabRow | undefined;
        let foundTableId: string | undefined;

        for (const t of tables) {
            const r = t.rows.find(row => row.id === currentRowId);
            if (r) {
                foundRow = r;
                foundTableId = t.id;
                break;
            }
        }

        if (!foundRow || !foundRow.conceptLevelId) return null;

        const currentLevel = conceptLevels.find(l => l.id === foundRow!.conceptLevelId);
        if (!currentLevel) return null;

        const currentConcept = concepts.find(c => c.id === currentLevel.conceptId);
        if (!currentConcept) return null;

        const allLevels = getLevelsByConcept(currentConcept.id);

        return {
            row: foundRow,
            concept: currentConcept,
            currentLevel,
            allLevels,
            foundTableId // Useful if we need table context
        };
    }, [currentRowId, tables, concepts, conceptLevels, getLevelsByConcept]);

    // Group rows by level
    const rowsByLevel = useMemo(() => {
        if (!contextData) return {};
        const map: Record<string, VocabRow[]> = {};

        contextData.allLevels.forEach(lvl => {
            map[lvl.id] = getRowsByLevel(lvl.id);
        });

        return map;
    }, [contextData, getRowsByLevel]);

    // Handle expanded states (default: only current level expanded)
    const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>(() => {
        if (!contextData) return {};
        return { [contextData.currentLevel.id]: true };
    });

    const toggleLevel = (levelId: string) => {
        setExpandedLevels(prev => ({ ...prev, [levelId]: !prev[levelId] }));
    };

    if (!contextData) {
        return createPortal(
            <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl text-center">
                    <Icon name="exclamation-circle" className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                    <p className="text-slate-700 dark:text-slate-200">This card is not linked to any concept map level.</p>
                    <button onClick={onClose} className="mt-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg">Close</button>
                </div>
            </div>,
            document.body
        );
    }

    const { concept, allLevels } = contextData;

    return createPortal(
        <div className="fixed inset-0 bg-secondary-900/95 z-[2000] flex flex-col animate-fadeIn backdrop-blur-sm">
            {/* Header */}
            <header className="flex items-center justify-between p-4 md:px-8 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-500/20 rounded-lg text-primary-400">
                        <Icon name="hierarchy" className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="text-xs font-mono text-primary-400 opacity-80">{concept.code}</div>
                        <h1 className="text-xl font-bold text-white">{concept.name}</h1>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                    <Icon name="x" className="w-8 h-8" />
                </button>
            </header>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
                {allLevels.map((level) => {
                    const isExpanded = expandedLevels[level.id];
                    const rows = rowsByLevel[level.id] || [];
                    const isCurrentLevel = level.id === contextData.currentLevel.id;

                    return (
                        <div key={level.id} className={`rounded-2xl border transition-all duration-300 ${isCurrentLevel ? 'border-primary-500/30 bg-primary-900/10' : 'border-white/5 bg-black/20'}`}>
                            {/* Level Header */}
                            <button
                                onClick={() => toggleLevel(level.id)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-t-2xl transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${isCurrentLevel ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                        {level.order}
                                    </div>
                                    <h2 className={`text-lg font-semibold ${isCurrentLevel ? 'text-primary-100' : 'text-slate-300'}`}>
                                        {level.name}
                                    </h2>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-400">
                                        {rows.length} cards
                                    </span>
                                </div>
                                <Icon name="chevron-down" className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Gallery Grid */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 pt-0 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                            {rows.map(row => {
                                                const isActive = row.id === currentRowId;
                                                // Try to find a display value (first usable column)
                                                // This is a rough heuristic since we don't know the exact "Front" column easily without relation context
                                                // Assuming 'Word' or first non-empty value
                                                const displayValue = Object.values(row.cols).find(v => v) || 'Empty Card';

                                                return (
                                                    <button
                                                        key={row.id}
                                                        onClick={() => {
                                                            onNavigateToRow(row.id);
                                                            onClose();
                                                        }}
                                                        className={`
                                                            group relative aspect-[3/4] p-3 rounded-xl flex flex-col items-center justify-center text-center gap-2
                                                            transition-all duration-200 hover:scale-105
                                                            ${isActive
                                                                ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-lg shadow-primary-900/50'
                                                                : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-white/5 hover:border-white/20'
                                                            }
                                                        `}
                                                    >
                                                        {isActive && (
                                                            <div className="absolute top-2 right-2 text-primary-200">
                                                                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                            </div>
                                                        )}
                                                        <span className="text-sm font-medium line-clamp-3 break-words">
                                                            {displayValue}
                                                        </span>
                                                        {row.stats.successRate > 0 && (
                                                            <div className="mt-auto h-1 w-12 rounded-full bg-slate-700 overflow-hidden">
                                                                <div
                                                                    className={`h-full ${row.stats.successRate > 80 ? 'bg-green-500' : row.stats.successRate > 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${row.stats.successRate}%` }}
                                                                />
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                            {rows.length === 0 && (
                                                <div className="col-span-full py-8 text-center text-slate-500 text-sm italic">
                                                    No cards in this level yet.
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>,
        document.body
    );
};

export default LevelGalleryView;
