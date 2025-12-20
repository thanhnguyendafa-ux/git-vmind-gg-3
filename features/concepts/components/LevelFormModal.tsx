import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useConceptStore } from '../../../stores/useConceptStore';
import Icon from '../../../components/ui/Icon';
import { ConceptLevel } from '../../../types';

interface LevelFormModalProps {
    conceptId: string;
    level?: ConceptLevel; // Undefined for create, defined for edit
    onClose: () => void;
    onSuccess?: () => void;
}

const LevelFormModal: React.FC<LevelFormModalProps> = ({ conceptId, level, onClose, onSuccess }) => {
    const { createLevel, updateLevel, getLevelsByConcept, concepts } = useConceptStore();

    const isEditing = !!level;
    const concept = concepts.find(c => c.id === conceptId);
    const existingLevels = getLevelsByConcept(conceptId);

    const [formData, setFormData] = useState({
        name: level?.name || '',
        description: level?.description || '',
        order: level?.order || (existingLevels.length + 1)
    });

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Validation
            if (!formData.name.trim()) {
                throw new Error('Name is required');
            }

            if (formData.order < 1) {
                throw new Error('Order must be at least 1');
            }

            if (isEditing && level) {
                // Update existing level
                await updateLevel(level.id, {
                    name: formData.name,
                    description: formData.description,
                    order: formData.order
                });
            } else {
                // Create new level
                await createLevel(
                    conceptId,
                    formData.name,
                    formData.order,
                    formData.description
                );
            }

            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save level');
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
                            {isEditing ? 'Edit Level' : 'Create Level'}
                        </h2>
                        {concept && (
                            <p className="text-sm text-text-subtle mt-1">
                                For concept: {concept.name}
                            </p>
                        )}
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
                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Level Name*
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., Beginner, Intermediate, Advanced"
                            required
                        />
                    </div>

                    {/* Order */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Order*
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.order}
                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            required
                        />
                        <p className="mt-1 text-xs text-text-subtle">
                            Display order in Kanban board (lower numbers appear first)
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            placeholder="Optional description for this level"
                            rows={3}
                        />
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
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default LevelFormModal;
