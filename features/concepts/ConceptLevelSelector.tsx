import React, { useState, useEffect } from 'react';
import { useConceptStore } from '../../stores/useConceptStore'; // Using mocked store for now
import { Concept, ConceptLevel } from '../../types';
import Icon from '../../components/ui/Icon';

interface ConceptLevelSelectorProps {
    selectedLevelId?: string;
    onChange: (levelId: string | undefined) => void;
}

const ConceptLevelSelector: React.FC<ConceptLevelSelectorProps> = ({ selectedLevelId, onChange }) => {
    const { concepts, conceptLevels, createConcept, createLevel } = useConceptStore();

    const [selectedConceptId, setSelectedConceptId] = useState<string>("");
    const [isCreatingConcept, setIsCreatingConcept] = useState(false);
    const [newConceptCode, setNewConceptCode] = useState("");
    const [newConceptName, setNewConceptName] = useState("");

    const [newLevelName, setNewLevelName] = useState("");
    const [isCreatingLevel, setIsCreatingLevel] = useState(false);

    // Initialize selected concept based on level
    useEffect(() => {
        if (selectedLevelId) {
            const level = conceptLevels.find(l => l.id === selectedLevelId);
            if (level) {
                setSelectedConceptId(level.conceptId);
            }
        }
    }, [selectedLevelId, conceptLevels]);

    const activeLevels = conceptLevels
        .filter(l => l.conceptId === selectedConceptId)
        .sort((a, b) => a.order - b.order);

    const handleCreateConcept = async () => {
        if (!newConceptCode || !newConceptName) return;
        try {
            const newConcept = await createConcept(newConceptCode, newConceptName);
            setSelectedConceptId(newConcept.id);
            setIsCreatingConcept(false);
            setNewConceptCode("");
            setNewConceptName("");

            // Auto-create basic levels?
            await createLevel(newConcept.id, "Level 1", 1);
        } catch (error) {
            alert("Error creating concept: " + (error as any).message);
        }
    };

    const handleCreateLevel = async () => {
        if (!newLevelName || !selectedConceptId) return;
        const nextOrder = activeLevels.length > 0 ? Math.max(...activeLevels.map(l => l.order)) + 1 : 1;
        await createLevel(selectedConceptId, newLevelName, nextOrder);
        setNewLevelName("");
        setIsCreatingLevel(false);
    };

    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            {/* Concept Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Concept</label>
                {!isCreatingConcept ? (
                    <div className="flex gap-2">
                        <select
                            value={selectedConceptId}
                            onChange={(e) => {
                                setSelectedConceptId(e.target.value);
                                onChange(undefined); // Reset level when concept changes
                            }}
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">-- Select Concept --</option>
                            {concepts.map(c => (
                                <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setIsCreatingConcept(true)}
                            className="p-2 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 transition-colors"
                            title="Create New Concept"
                        >
                            <Icon name="plus" className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2 p-3 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 animate-fadeIn">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Code (e.g. 9980)"
                                value={newConceptCode}
                                onChange={e => setNewConceptCode(e.target.value)}
                                className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm font-mono"
                                maxLength={4}
                            />
                            <input
                                type="text"
                                placeholder="Concept Name"
                                value={newConceptName}
                                onChange={e => setNewConceptName(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setIsCreatingConcept(false)} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1">Cancel</button>
                            <button
                                type="button"
                                onClick={handleCreateConcept}
                                disabled={!newConceptCode || !newConceptName}
                                className="text-xs bg-primary-500 text-white px-3 py-1 rounded hover:bg-primary-600 disabled:opacity-50"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Level Selection */}
            {selectedConceptId && (
                <div className="space-y-2 animate-fadeIn">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Level</label>
                    {!isCreatingLevel ? (
                        <div className="flex gap-2">
                            <div className="flex-1 flex gap-2 flex-wrap">
                                {activeLevels.map(lvl => (
                                    <button
                                        key={lvl.id}
                                        type="button"
                                        onClick={() => onChange(lvl.id === selectedLevelId ? undefined : lvl.id)}
                                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${lvl.id === selectedLevelId
                                                ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-500 text-primary-700 dark:text-primary-300 font-medium shadow-sm'
                                                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-primary-400'
                                            }`}
                                    >
                                        {lvl.name}
                                    </button>
                                ))}
                                {activeLevels.length === 0 && <span className="text-sm text-slate-400 italic py-1.5">No levels defined.</span>}
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreatingLevel(true)}
                                className="p-1.5 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-primary-100 dark:hover:bg-primary-900/30 text-primary-600 transition-colors h-fit"
                                title="Add Level"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-centeranimate-fadeIn">
                            <input
                                type="text"
                                placeholder="Level Name"
                                value={newLevelName}
                                onChange={e => setNewLevelName(e.target.value)}
                                className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-sm"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleCreateLevel()}
                            />
                            <button type="button" onClick={() => setIsCreatingLevel(false)} className="p-1 text-slate-500 hover:text-slate-700"><Icon name="x" className="w-4 h-4" /></button>
                            <button type="button" onClick={handleCreateLevel} className="p-1 text-primary-500 hover:text-primary-600"><Icon name="check" className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConceptLevelSelector;
