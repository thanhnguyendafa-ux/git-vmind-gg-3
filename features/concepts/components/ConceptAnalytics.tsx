import React, { useMemo } from 'react';
import { useConceptStore } from '../../../stores/useConceptStore';
import Icon from '../../../components/ui/Icon';

interface ConceptAnalyticsProps {
    conceptId: string;
}

const ConceptAnalytics: React.FC<ConceptAnalyticsProps> = ({ conceptId }) => {
    const { getLevelsByConcept, getRowsByLevel, concepts } = useConceptStore();

    const analytics = useMemo(() => {
        const concept = concepts.find(c => c.id === conceptId);
        const levels = getLevelsByConcept(conceptId);

        let totalCards = 0;
        let studiedCards = 0;
        let totalCorrect = 0;
        let totalAttempts = 0;

        const levelStats = levels.map(level => {
            const cards = getRowsByLevel(level.id);
            const levelStudied = cards.filter(c => c.stats.lastStudied).length;
            const levelCorrect = cards.reduce((sum, c) => sum + c.stats.correct, 0);
            const levelTotal = cards.reduce((sum, c) =>
                sum + c.stats.correct + c.stats.incorrect, 0
            );

            totalCards += cards.length;
            studiedCards += levelStudied;
            totalCorrect += levelCorrect;
            totalAttempts += levelTotal;

            return {
                level,
                cardCount: cards.length,
                studiedCount: levelStudied,
                successRate: levelTotal > 0 ? (levelCorrect / levelTotal * 100) : 0
            };
        });

        return {
            concept,
            totalCards,
            studiedCards,
            overallSuccessRate: totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0,
            levelStats
        };
    }, [conceptId, concepts, getLevelsByConcept, getRowsByLevel]);

    if (!analytics.concept) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-text-subtle">Concept not found</p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-transparent">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-purple-500/10 dark:bg-purple-400/10 rounded-2xl">
                            <Icon name="chart-bar" className="w-7 h-7 text-purple-600 dark:text-purple-400" variant="filled" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                                Analytics: {analytics.concept.name}
                            </h2>
                            {analytics.concept.description && (
                                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-800/40 dark:text-emerald-400/30 mt-1 italic">
                                    {analytics.concept.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
                    <div className="p-8 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl shadow-black/5 hover:scale-[1.02] transition-all duration-500 group">
                        <div className="flex items-center gap-3 mb-4">
                            <Icon name="credit-card" className="w-4 h-4 text-blue-500/50 dark:text-blue-400/30" />
                            <div className="text-[10px] font-bold text-blue-600/60 dark:text-blue-400/40 uppercase tracking-[0.2em]">
                                Total Cards
                            </div>
                        </div>
                        <div className="text-5xl font-serif font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {analytics.totalCards}
                        </div>
                    </div>

                    <div className="p-8 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl shadow-black/5 hover:scale-[1.02] transition-all duration-500 group">
                        <div className="flex items-center gap-3 mb-4">
                            <Icon name="check-circle" className="w-4 h-4 text-emerald-500/50 dark:text-emerald-400/30" />
                            <div className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/40 uppercase tracking-[0.2em]">
                                Studied
                            </div>
                        </div>
                        <div className="text-5xl font-serif font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {analytics.studiedCards}
                        </div>
                        <div className="mt-2 text-[10px] font-bold text-emerald-600/40 dark:text-emerald-400/20 uppercase tracking-widest">
                            {analytics.totalCards > 0
                                ? `${((analytics.studiedCards / analytics.totalCards) * 100).toFixed(0)}% coverage`
                                : 'No cards yet'
                            }
                        </div>
                    </div>

                    <div className="p-8 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-xl shadow-black/5 hover:scale-[1.02] transition-all duration-500 group">
                        <div className="flex items-center gap-3 mb-4">
                            <Icon name="trophy" className="w-4 h-4 text-purple-500/50 dark:text-purple-400/30" />
                            <div className="text-[10px] font-bold text-purple-600/60 dark:text-purple-400/40 uppercase tracking-[0.2em]">
                                Success Rate
                            </div>
                        </div>
                        <div className="text-5xl font-serif font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {analytics.overallSuccessRate.toFixed(1)}<span className="text-2xl ml-1 opacity-40">%</span>
                        </div>
                        <div className="mt-4 h-1.5 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all duration-1000"
                                style={{ width: `${analytics.overallSuccessRate}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Level Breakdown */}
                <div className="bg-white/30 dark:bg-black/20 backdrop-blur-3xl rounded-[2.5rem] border border-white/40 dark:border-white/5 p-8 shadow-xl shadow-black/5">
                    <h3 className="text-sm font-bold text-emerald-800/50 dark:text-emerald-400/40 uppercase tracking-[0.25em] mb-8 flex items-center gap-3">
                        <Icon name="layers" className="w-5 h-5" />
                        Level Breakdown
                    </h3>

                    {analytics.levelStats.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {analytics.levelStats.map(({ level, cardCount, studiedCount, successRate }) => (
                                <div
                                    key={level.id}
                                    className="p-5 bg-white/40 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-white/60 dark:border-white/10 hover:border-purple-500/30 transition-all duration-300 group/item"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-serif font-bold text-lg group-hover/item:rotate-12 transition-transform">
                                                {level.order}
                                            </div>
                                            <div>
                                                <span className="text-base font-serif font-bold text-slate-900 dark:text-white leading-tight">
                                                    {level.name}
                                                </span>
                                                {level.description && (
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/30 dark:text-emerald-400/20 mt-0.5 truncate max-w-[150px]">
                                                        {level.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs font-serif font-bold text-slate-900 dark:text-white">
                                                {studiedCount}<span className="opacity-40 mx-1">/</span>{cardCount}
                                            </div>
                                            <div className="text-[9px] font-bold uppercase tracking-tight text-slate-400 dark:text-emerald-400/20">
                                                seeded cards
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Tool */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400/60 dark:text-emerald-400/20">Success</span>
                                            <span className={`text-[10px] font-bold font-serif ${successRate >= 80 ? 'text-emerald-500' :
                                                successRate >= 50 ? 'text-amber-500' :
                                                    'text-rose-500'
                                                }`}>
                                                {successRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-1 bg-slate-200/30 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${successRate >= 80 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                                                    successRate >= 50 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                                                        'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                                                    }`}
                                                style={{ width: `${successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white/20 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-white/40 dark:border-white/10">
                            <Icon name="layers" className="w-12 h-12 mx-auto mb-3 text-slate-400/30" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400/50">
                                Architectural levels pending
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConceptAnalytics;
