import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';

interface CardAssignmentModalProps {
    cards: VocabRow[];
    onClose: () => void;
    onSuccess?: () => void;
}

const CardAssignmentModal: React.FC<CardAssignmentModalProps> = ({ cards, onClose, onSuccess }) => {
    const { concepts, conceptLevels, getLevelsByConcept } = useConceptStore();
    const { updateRow } = useTableStore();

    const [selectedConceptId, setSelectedConceptId] = useState<string>('');
    const [selectedLevelId, setSelectedLevelId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableConcepts = useMemo(() => {
        return concepts.filter(c => !c.isFolder); // Only non-folder concepts can have levels
    }, [concepts]);

    const availableLevels = useMemo(() => {
        if (!selectedConceptId) return [];
        return getLevelsByConcept(selectedConceptId);
    }, [selectedConceptId, getLevelsByConcept]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Assign all selected cards to the chosen level
            for (const card of cards) {
                const table = useTableStore.getState().tables.find(t =>
                    t.rows.some(r => r.id === card.id)
                );

                if (table) {
                    await updateRow(table.id, card.id, {
                        ...card,
                        conceptLevelId: selectedLevelId
                    });
                }
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Failed to assign cards:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-subtle dark:border-white/10">
                    <div>
                        <h2 className="text-xl font-bold text-text-main dark:text-secondary-100">
                            Assign to Concept Level
                        </h2>
                        <p className="text-sm text-text-subtle mt-1">
                            {cards.length} card{cards.length !== 1 ? 's' : ''} selected
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-full transition-colors"
                    >
                        <Icon name="x" className="w-5 h-5 text-text-subtle" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Concept Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Select Concept*
                        </label>
                        <select
                            value={selectedConceptId}
                            onChange={(e) => {
                                setSelectedConceptId(e.target.value);
                                setSelectedLevelId(''); // Reset level when concept changes
                            }}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        >
                            <option value="">Choose a concept...</option>
                            {availableConcepts.map(concept => (
                                <option key={concept.id} value={concept.id}>
                                    {concept.name} ({concept.code})
                                </option>
                            ))}
                        </select>
                        {availableConcepts.length === 0 && (
                            <p className="mt-2 text-xs text-text-subtle">
                                No concepts available. Create a concept first.
                            </p>
                        )}
                    </div>

                    {/* Level Selector */}
                    {selectedConceptId && (
                        <div>
                            <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                                Select Level*
                            </label>
                            <select
                                value={selectedLevelId}
                                onChange={(e) => setSelectedLevelId(e.target.value)}
                                className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                required
                            >
                                <option value="">Choose a level...</option>
                                {availableLevels.map(level => (
                                    <option key={level.id} value={level.id}>
                                        {level.name} (Order: {level.order})
                                    </option>
                                ))}
                            </select>
                            {availableLevels.length === 0 && (
                                <p className="mt-2 text-xs text-text-subtle">
                                    No levels for this concept. Create levels first.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Info Message */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <Icon name="info-circle" className="w-4 h-4 inline mr-1" />
                            These cards will appear in the selected level's Kanban column
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-secondary-100 dark:bg-secondary-700 text-text-main dark:text-secondary-100 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedLevelId}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Assigning...' : 'Assign Cards'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default CardAssignmentModal;
