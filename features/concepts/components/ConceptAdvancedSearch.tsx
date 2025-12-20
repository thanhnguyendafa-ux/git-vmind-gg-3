import React, { useState, useMemo, useEffect } from 'react';
import { useConceptStore } from '../../../stores/useConceptStore';
import { Concept } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { motion } from 'framer-motion';

interface SearchFilters {
    query: string;
    folders: boolean;
    concepts: boolean;
    hasCards: boolean;
    hasLevels: boolean;
    minSuccessRate: number;
}

interface ConceptAdvancedSearchProps {
    onResultsChange: (results: Concept[]) => void;
    onClose: () => void;
}

const ConceptAdvancedSearch: React.FC<ConceptAdvancedSearchProps> = ({
    onResultsChange,
    onClose
}) => {
    const { concepts, conceptLevels, getRowsByLevel, searchConceptsByName } = useConceptStore();

    const [filters, setFilters] = useState<SearchFilters>({
        query: '',
        folders: true,
        concepts: true,
        hasCards: false,
        hasLevels: false,
        minSuccessRate: 0
    });

    const filteredResults = useMemo(() => {
        let results = concepts;

        // Text search
        if (filters.query.trim()) {
            results = searchConceptsByName(filters.query);
        }

        // Type filter
        results = results.filter(c => {
            if (c.isFolder && !filters.folders) return false;
            if (!c.isFolder && !filters.concepts) return false;
            return true;
        });

        // Has levels filter
        if (filters.hasLevels) {
            results = results.filter(c => {
                const levels = conceptLevels.filter(l => l.conceptId === c.id);
                return levels.length > 0;
            });
        }

        // Has cards filter
        if (filters.hasCards) {
            results = results.filter(c => {
                const levels = conceptLevels.filter(l => l.conceptId === c.id);
                return levels.some(level => getRowsByLevel(level.id).length > 0);
            });
        }

        // Success rate filter
        if (filters.minSuccessRate > 0) {
            results = results.filter(c => {
                const levels = conceptLevels.filter(l => l.conceptId === c.id);
                const allCards = levels.flatMap(l => getRowsByLevel(l.id));

                if (allCards.length === 0) return false;

                const totalAttempts = allCards.reduce((sum, card) =>
                    sum + card.stats.correct + card.stats.incorrect, 0
                );
                const totalCorrect = allCards.reduce((sum, card) => sum + card.stats.correct, 0);
                const rate = totalAttempts > 0 ? (totalCorrect / totalAttempts * 100) : 0;

                return rate >= filters.minSuccessRate;
            });
        }

        return results;
    }, [filters, concepts, conceptLevels, searchConceptsByName, getRowsByLevel]);

    useEffect(() => {
        onResultsChange(filteredResults);
    }, [filteredResults, onResultsChange]);

    const resetFilters = () => {
        setFilters({
            query: '',
            folders: true,
            concepts: true,
            hasCards: false,
            hasLevels: false,
            minSuccessRate: 0
        });
    };

    const hasActiveFilters =
        filters.query.trim() !== '' ||
        !filters.folders ||
        !filters.concepts ||
        filters.hasCards ||
        filters.hasLevels ||
        filters.minSuccessRate > 0;

    return (
        <div className="bg-white dark:bg-secondary-800 rounded-2xl border border-border-subtle dark:border-white/10 shadow-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon name="search" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100">
                        Advanced Search
                    </h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors"
                >
                    <Icon name="x" className="w-5 h-5 text-text-subtle" />
                </button>
            </div>

            {/* Search Input */}
            <div>
                <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                    Search Query
                </label>
                <div className="relative">
                    <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                    <input
                        type="text"
                        value={filters.query}
                        onChange={(e) => setFilters({ ...filters, query: e.target.value })}
                        placeholder="Search by concept name..."
                        className="w-full pl-10 pr-4 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {/* Type Filters */}
            <div>
                <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-3">
                    Concept Type
                </label>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.folders}
                            onChange={(e) => setFilters({ ...filters, folders: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <Icon name="folder" className="w-4 h-4 text-text-subtle" />
                        <span className="text-sm text-text-main dark:text-secondary-100">Folders</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.concepts}
                            onChange={(e) => setFilters({ ...filters, concepts: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <Icon name="hierarchy" className="w-4 h-4 text-text-subtle" />
                        <span className="text-sm text-text-main dark:text-secondary-100">Concepts</span>
                    </label>
                </div>
            </div>

            {/* Content Filters */}
            <div>
                <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-3">
                    Content Filters
                </label>
                <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.hasLevels}
                            onChange={(e) => setFilters({ ...filters, hasLevels: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <Icon name="layers" className="w-4 h-4 text-text-subtle" />
                        <span className="text-sm text-text-main dark:text-secondary-100">Has levels defined</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filters.hasCards}
                            onChange={(e) => setFilters({ ...filters, hasCards: e.target.checked })}
                            className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <Icon name="credit-card" className="w-4 h-4 text-text-subtle" />
                        <span className="text-sm text-text-main dark:text-secondary-100">Has cards assigned</span>
                    </label>
                </div>
            </div>

            {/* Success Rate Filter */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-semibold text-text-main dark:text-secondary-100">
                        Minimum Success Rate
                    </label>
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                        {filters.minSuccessRate}%
                    </span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={filters.minSuccessRate}
                    onChange={(e) => setFilters({ ...filters, minSuccessRate: parseInt(e.target.value) })}
                    className="w-full h-2 bg-secondary-200 dark:bg-secondary-600 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <div className="flex justify-between mt-1 text-xs text-text-subtle">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Results Summary */}
            <div className="pt-4 border-t border-border-subtle dark:border-white/10">
                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                            {filteredResults.length}
                        </span>
                        <span className="text-text-subtle ml-1">
                            {filteredResults.length === 1 ? 'result' : 'results'} found
                        </span>
                    </div>
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="px-3 py-1.5 text-sm font-medium text-text-subtle hover:text-text-main dark:hover:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConceptAdvancedSearch;
