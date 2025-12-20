import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { VocabRow } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import Icon from '../../../components/ui/Icon';

interface CardDetailModalProps {
    card: VocabRow;
    onClose: () => void;
}

const CardDetailModal: React.FC<CardDetailModalProps> = ({ card, onClose }) => {
    const { tables } = useTableStore();

    // Find the table this card belongs to
    const tableInfo = useMemo(() => {
        const table = tables.find(t => t.rows.some(r => r.id === card.id));
        return table;
    }, [tables, card.id]);

    // Calculate success rate
    const successRate = useMemo(() => {
        const total = card.stats.correct + card.stats.incorrect;
        if (total === 0) return 0;
        return Math.round((card.stats.correct / total) * 100);
    }, [card.stats]);

    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-subtle dark:border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-text-main dark:text-secondary-100">
                            Card Details
                        </h2>
                        {tableInfo && (
                            <p className="text-sm text-text-subtle mt-1">
                                From: {tableInfo.name}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors"
                    >
                        <Icon name="x" className="w-6 h-6 text-text-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-180px)] custom-scrollbar">
                    <div className="p-6 space-y-6">
                        {/* Card Data */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">
                                Card Content
                            </h3>
                            <div className="space-y-3">
                                {tableInfo?.columns.map(column => {
                                    const value = card.cols[column.id];
                                    if (!value || !value.trim()) return null;

                                    return (
                                        <div
                                            key={column.id}
                                            className="p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg"
                                        >
                                            <div className="text-xs font-semibold text-text-subtle uppercase mb-1">
                                                {column.name}
                                            </div>
                                            <div className="text-sm text-text-main dark:text-secondary-100">
                                                {value}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Study Statistics */}
                        <div>
                            <h3 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">
                                Study Statistics
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-xs text-text-subtle mb-1">Correct</div>
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {card.stats.correct}
                                    </div>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-xs text-text-subtle mb-1">Incorrect</div>
                                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {card.stats.incorrect}
                                    </div>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                    <div className="text-xs text-text-subtle mb-1">Success Rate</div>
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {successRate}%
                                    </div>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="text-xs text-text-subtle mb-1">Encounters</div>
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {card.stats.flashcardEncounters || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Last Studied */}
                            {card.stats.lastStudied && (
                                <div className="mt-3 p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                                    <div className="text-xs text-text-subtle mb-1">Last Studied</div>
                                    <div className="text-sm text-text-main dark:text-secondary-100">
                                        {new Date(card.stats.lastStudied).toLocaleString()}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Flashcard Status */}
                        {card.stats.flashcardStatus && (
                            <div>
                                <h3 className="text-sm font-semibold text-text-subtle uppercase tracking-wider mb-3">
                                    Confidence Status
                                </h3>
                                <div className="p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${card.stats.flashcardStatus === 'Superb' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                                            card.stats.flashcardStatus === 'Perfect' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                card.stats.flashcardStatus === 'Easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                                    card.stats.flashcardStatus === 'Good' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                                        card.stats.flashcardStatus === 'Hard' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                        {card.stats.flashcardStatus}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-border-subtle dark:border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 bg-secondary-100 dark:bg-secondary-700 text-text-main dark:text-secondary-100 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CardDetailModal;
