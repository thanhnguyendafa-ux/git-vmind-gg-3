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
        <div className="h-full overflow-y-auto custom-scrollbar p-6 bg-background dark:bg-secondary-900">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Icon name="chart-bar" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-main dark:text-secondary-100">
                            Analytics: {analytics.concept.name}
                        </h2>
                    </div>
                    {analytics.concept.description && (
                        <p className="text-text-subtle ml-14">{analytics.concept.description}</p>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 rounded-2xl border border-blue-200 dark:border-blue-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon name="credit-card" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <div className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                Total Cards
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                            {analytics.totalCards}
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30 rounded-2xl border border-green-200 dark:border-green-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon name="check-circle" className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <div className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                Studied
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                            {analytics.studiedCards}
                        </div>
                        <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                            {analytics.totalCards > 0
                                ? `${((analytics.studiedCards / analytics.totalCards) * 100).toFixed(0)}% coverage`
                                : 'No cards yet'
                            }
                        </div>
                    </div>

                    <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 rounded-2xl border border-purple-200 dark:border-purple-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <Icon name="trophy" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <div className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                                Success Rate
                            </div>
                        </div>
                        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                            {analytics.overallSuccessRate.toFixed(1)}%
                        </div>
                        <div className="mt-2 h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 transition-all"
                                style={{ width: `${analytics.overallSuccessRate}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Level Breakdown */}
                <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-border-subtle dark:border-white/10 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-6 flex items-center gap-2">
                        <Icon name="layers" className="w-5 h-5" />
                        Level Breakdown
                    </h3>

                    {analytics.levelStats.length > 0 ? (
                        <div className="space-y-4">
                            {analytics.levelStats.map(({ level, cardCount, studiedCount, successRate }) => (
                                <div
                                    key={level.id}
                                    className="p-4 bg-secondary-50 dark:bg-secondary-700/50 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-purple-500 text-white text-sm font-bold">
                                                {level.order}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-text-main dark:text-secondary-100">
                                                    {level.name}
                                                </span>
                                                {level.description && (
                                                    <p className="text-xs text-text-subtle mt-0.5">{level.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-text-main dark:text-secondary-100">
                                                {studiedCount}/{cardCount}
                                            </div>
                                            <div className="text-xs text-text-subtle">
                                                cards studied
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-text-subtle">Success Rate</span>
                                            <span className={`font-semibold ${successRate >= 80 ? 'text-green-600 dark:text-green-400' :
                                                    successRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                                        'text-red-600 dark:text-red-400'
                                                }`}>
                                                {successRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all ${successRate >= 80 ? 'bg-green-500' :
                                                        successRate >= 50 ? 'bg-yellow-500' :
                                                            'bg-red-500'
                                                    }`}
                                                style={{ width: `${successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Icon name="layers" className="w-12 h-12 mx-auto mb-2 text-text-subtle" />
                            <p className="text-sm text-text-subtle">
                                No levels defined for this concept
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConceptAnalytics;
