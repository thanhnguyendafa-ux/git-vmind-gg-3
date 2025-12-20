import React, { useMemo } from 'react';
import { VocabRow } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';

interface CardPreviewProps {
    card: VocabRow;
    onClick: () => void;
}

const CardPreview: React.FC<CardPreviewProps> = ({ card, onClick }) => {
    const { tables } = useTableStore();

    // Find the table this card belongs to
    const table = useMemo(() => {
        return tables.find(t => t.rows.some(r => r.id === card.id));
    }, [tables, card.id]);

    // Get display value (first non-empty column)
    const displayValue = useMemo(() => {
        const values = Object.values(card.cols);
        return values.find(v => v && typeof v === 'string' && v.trim()) || 'Empty Card';
    }, [card.cols]);

    // Calculate success rate
    const successRate = useMemo(() => {
        const total = card.stats.correct + card.stats.incorrect;
        if (total === 0) return 0;
        return Math.round((card.stats.correct / total) * 100);
    }, [card.stats]);

    return (
        <button
            onClick={onClick}
            className="w-full p-3 rounded-xl bg-gradient-to-br from-white/90 to-white/60 dark:from-secondary-700/90 dark:to-secondary-700/60 border border-border-subtle dark:border-white/10 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-md transition-all duration-200 group text-left"
        >
            {/* Card Content */}
            <div className="flex flex-col gap-2">
                {/* Display Text */}
                <p className="text-sm font-medium text-text-main dark:text-secondary-100 line-clamp-3 break-words group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                    {displayValue}
                </p>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-xs">
                    {/* Success Rate Bar */}
                    {(card.stats.correct + card.stats.incorrect) > 0 && (
                        <div className="flex-1 mr-2">
                            <div className="h-1.5 w-full rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${successRate >= 80
                                        ? 'bg-green-500'
                                        : successRate >= 50
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}
                                    style={{ width: `${successRate}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats Badge */}
                    <span className="text-text-subtle font-mono">
                        {card.stats.correct + card.stats.incorrect > 0
                            ? `${successRate}%`
                            : 'New'
                        }
                    </span>
                </div>

                {/* Last Studied */}
                {card.stats.lastStudied && (
                    <div className="text-xs text-text-subtle">
                        Last: {new Date(card.stats.lastStudied).toLocaleDateString()}
                    </div>
                )}
            </div>
        </button>
    );
};

export default CardPreview;
