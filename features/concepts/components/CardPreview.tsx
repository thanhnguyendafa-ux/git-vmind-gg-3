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
            className="w-full p-2.5 rounded-[1.25rem] bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 hover:border-purple-500/50 hover:bg-white/60 dark:hover:bg-white/10 transition-all duration-300 group text-left active:scale-[0.97]"
        >
            {/* Card Content */}
            <div className="flex flex-col gap-2">
                {/* Display Text */}
                <p className="text-xs font-medium text-slate-800 dark:text-emerald-50/90 line-clamp-3 break-words group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-relaxed">
                    {displayValue}
                </p>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-xs">
                    {/* Success Rate Bar */}
                    {(card.stats.correct + card.stats.incorrect) > 0 && (
                        <div className="flex-1 mr-3">
                            <div className="h-1 w-full rounded-full bg-slate-200/50 dark:bg-white/10 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${successRate >= 80
                                        ? 'bg-emerald-500'
                                        : successRate >= 50
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                    style={{ width: `${successRate}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats Badge */}
                    <span className="text-[10px] font-bold text-slate-400 dark:text-emerald-400/30 uppercase tracking-tighter">
                        {card.stats.correct + card.stats.incorrect > 0
                            ? `${successRate}%`
                            : 'New Seed'
                        }
                    </span>
                </div>

                {/* Last Studied */}
                {card.stats.lastStudied && (
                    <div className="text-[9px] font-bold uppercase tracking-tight text-slate-300 dark:text-emerald-400/20">
                        Soil Check: {new Date(card.stats.lastStudied).toLocaleDateString()}
                    </div>
                )}
            </div>
        </button>
    );
};

export default CardPreview;
