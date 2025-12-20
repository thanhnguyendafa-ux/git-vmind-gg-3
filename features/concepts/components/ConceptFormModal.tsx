import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useConceptStore } from '../../../stores/useConceptStore';
import Icon from '../../../components/ui/Icon';
import { Concept } from '../../../types';

interface ConceptFormModalProps {
    concept?: Concept; // Undefined for create, defined for edit
    parentId?: string | null;
    onClose: () => void;
    onSuccess?: () => void;
}

const ConceptFormModal: React.FC<ConceptFormModalProps> = ({ concept, parentId, onClose, onSuccess }) => {
    const { createConcept, updateConcept, concepts } = useConceptStore();

    const isEditing = !!concept;

    const [formData, setFormData] = useState({
        code: concept?.code || '',
        name: concept?.name || '',
        description: concept?.description || '',
        isFolder: concept?.isFolder || false,
        parentId: concept?.parentId || parentId || null
    });

    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Generate next available code
    const generateCode = () => {
        const existingCodes = concepts.map(c => parseInt(c.code)).filter(n => !isNaN(n));
        const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 1000;
        return (maxCode + 1).toString();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            // Validation
            if (!formData.code.trim() || !formData.name.trim()) {
                throw new Error('Code and name are required');
            }

            if (isEditing && concept) {
                // Update existing concept
                await updateConcept(concept.id, {
                    code: formData.code,
                    name: formData.name,
                    description: formData.description,
                    isFolder: formData.isFolder,
                    parentId: formData.parentId || undefined
                });
            } else {
                // Create new concept
                await createConcept(
                    formData.code,
                    formData.name,
                    formData.description,
                    formData.parentId || undefined,
                    formData.isFolder
                );
            }

            onSuccess?.();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save concept');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get available parent concepts (excluding self and descendants to prevent cycles)
    const availableParents = concepts.filter(c => {
        if (!isEditing) return c.isFolder; // Only folders can be parents
        if (c.id === concept?.id) return false; // Can't be parent of itself
        // TODO: Check if c is a descendant of concept to prevent cycles
        return c.isFolder;
    });

    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm">
            <div className="bg-white dark:bg-secondary-800 rounded-2xl max-w-lg w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-subtle dark:border-white/10">
                    <h2 className="text-xl font-bold text-text-main dark:text-secondary-100">
                        {isEditing ? 'Edit Concept' : 'Create Concept'}
                    </h2>
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

                    {/* Code */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Code*
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="flex-1 px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                placeholder="e.g., 1000"
                                required
                            />
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, code: generateCode() })}
                                    className="px-3 py-2 bg-secondary-100 dark:bg-secondary-600 text-text-main dark:text-secondary-100 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-500 transition-colors text-sm font-medium"
                                >
                                    Auto
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-text-subtle">Unique identifier for this concept</p>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Name*
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            placeholder="e.g., Mathematics"
                            required
                        />
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
                            placeholder="Optional description"
                            rows={3}
                        />
                    </div>

                    {/* Is Folder */}
                    <div className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-700/50 rounded-lg">
                        <input
                            type="checkbox"
                            id="isFolder"
                            checked={formData.isFolder}
                            onChange={(e) => setFormData({ ...formData, isFolder: e.target.checked })}
                            className="w-4 h-4 text-purple-600 border-border-subtle rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <label htmlFor="isFolder" className="flex-1 text-sm text-text-main dark:text-secondary-100">
                            <span className="font-semibold">Folder</span>
                            <p className="text-xs text-text-subtle mt-0.5">
                                Folders can contain other concepts but cannot have levels
                            </p>
                        </label>
                    </div>

                    {/* Parent Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-text-main dark:text-secondary-100 mb-2">
                            Parent Folder
                        </label>
                        <select
                            value={formData.parentId || ''}
                            onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                            className="w-full px-3 py-2 bg-secondary-50 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="">None (Root Level)</option>
                            {availableParents.map(parent => (
                                <option key={parent.id} value={parent.id}>
                                    {parent.name} ({parent.code})
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-text-subtle">Place this concept inside a folder</p>
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

export default ConceptFormModal;
