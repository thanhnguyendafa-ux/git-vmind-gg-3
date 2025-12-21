import React, { useState } from 'react';
import { VocabRow } from '../../../types';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import Icon from '../../../components/ui/Icon';

interface KnowledgeSidebarProps {
    row: VocabRow;
    tableId: string;
}

const KnowledgeSidebar: React.FC<KnowledgeSidebarProps> = ({ row, tableId }) => {
    const { concepts, conceptLevels } = useConceptStore();
    const { upsertRow } = useTableStore();
    const { closeKnowledgeSidebar } = useUIStore();
    const [editingNoteForLevel, setEditingNoteForLevel] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    // Get all linked concepts and levels
    const linkedLevels = (row.conceptLevelIds || (row.conceptLevelId ? [row.conceptLevelId] : []))
        .map(levelId => {
            const level = conceptLevels.find(l => l.id === levelId);
            if (!level) return null;
            const concept = concepts.find(c => c.id === level.conceptId);
            return concept ? { level, concept } : null;
        })
        .filter(Boolean) as { level: typeof conceptLevels[0], concept: typeof concepts[0] }[];

    const handleRemoveLink = (levelId: string) => {
        const updatedLevelIds = (row.conceptLevelIds || []).filter(id => id !== levelId);
        upsertRow(tableId, {
            ...row,
            conceptLevelIds: updatedLevelIds.length > 0 ? updatedLevelIds : undefined,
            conceptLevelId: undefined // Clear deprecated field
        });
    };

    const handleSaveNote = (levelId: string) => {
        const updatedNotes = { ...(row.conceptNotes || {}), [levelId]: noteText };
        upsertRow(tableId, { ...row, conceptNotes: updatedNotes });
        setEditingNoteForLevel(null);
        setNoteText('');
    };

    const handleEditNote = (levelId: string) => {
        setEditingNoteForLevel(levelId);
        setNoteText(row.conceptNotes?.[levelId] || '');
    };

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-surface dark:bg-secondary-900 border-l border-border dark:border-secondary-700 shadow-2xl flex flex-col z-40 animate-slideInRight">
            {/* Header */}
            <div className="p-6 border-b border-border dark:border-secondary-700 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main dark:text-white">Knowledge Links</h2>
                    <p className="text-sm text-text-subtle mt-1">Concept connections for this card</p>
                </div>
                <button
                    onClick={closeKnowledgeSidebar}
                    className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors"
                >
                    <Icon name="x" className="w-5 h-5 text-text-subtle" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {linkedLevels.length === 0 ? (
                    <div className="flex  flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center mb-4">
                            <Icon name="link-slash" className="w-8 h-8 text-text-subtle" />
                        </div>
                        <h3 className="text-lg font-semibold text-text-main dark:text-white mb-2">No Concept Links</h3>
                        <p className="text-sm text-text-subtle max-w-xs">
                            This card hasn't been linked to any concepts yet. Navigate to the Concept Factory to add links.
                        </p>
                    </div>
                ) : (
                    linkedLevels.map(({ level, concept }) => (
                        <div
                            key={level.id}
                            className="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-4 border border-border dark:border-secondary-700"
                        >
                            {/* Concept Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: concept.color || 'hsl(240, 70%, 60%)' }}
                                        />
                                        <h3 className="font-bold text-text-main dark:text-white">{concept.name}</h3>
                                    </div>
                                    <p className="text-sm text-primary-600 dark:text-primary-400">
                                        {level.name}
                                        {level.order && <span className="ml-2 text-xs text-text-subtle">#{level.order}</span>}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleRemoveLink(level.id)}
                                    className="p-1.5 hover:bg-error-100 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                                    title="Remove link"
                                >
                                    <Icon name="trash" className="w-4 h-4 text-error-600 dark:text-error-400" />
                                </button>
                            </div>

                            {/* Level Description */}
                            {level.description && (
                                <p className="text-xs text-text-subtle mb-3 italic">{level.description}</p>
                            )}

                            {/* Justification Note */}
                            <div className="mt-3 pt-3 border-t border-border/50 dark:border-secondary-700/50">
                                {editingNoteForLevel === level.id ? (
                                    <div className="space-y-2">
                                        <label className="text-xs font-semibold text-text-subtle uppercase tracking-wide">
                                            Why this level?
                                        </label>
                                        <textarea
                                            value={noteText}
                                            onChange={(e) => setNoteText(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-surface dark:bg-secondary-900 border border-border dark:border-secondary-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                            rows={3}
                                            placeholder="Add your justification..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSaveNote(level.id)}
                                                className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingNoteForLevel(null);
                                                    setNoteText('');
                                                }}
                                                className="px-3 py-1.5 bg-secondary-200 dark:bg-secondary-700 text-text-main dark:text-white rounded-lg text-sm font-medium hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-semibold text-text-subtle uppercase tracking-wide">
                                                Why this level?
                                            </span>
                                            <button
                                                onClick={() => handleEditNote(level.id)}
                                                className="p-1 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded transition-colors"
                                            >
                                                <Icon name="pencil" className="w-3 h-3 text-text-subtle" />
                                            </button>
                                        </div>
                                        {row.conceptNotes?.[level.id] ? (
                                            <p className="text-sm text-text-main dark:text-secondary-100">
                                                {row.conceptNotes[level.id]}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-text-subtle italic">No justification added yet</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800">
                <button
                    onClick={() => {
                        closeKnowledgeSidebar();
                        useUIStore.getState().setCurrentScreen(9); // Screen.ConceptLinks
                    }}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2"
                >
                    <Icon name="plus" className="w-5 h-5" />
                    Add Concept Link
                </button>
            </div>
        </div>
    );
};

export default KnowledgeSidebar;
