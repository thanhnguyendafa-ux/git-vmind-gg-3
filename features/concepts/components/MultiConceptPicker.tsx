import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import Icon from '../../../components/ui/Icon';
import { Concept, ConceptLevel } from '../../../types';

interface MultiConceptPickerProps {
    isOpen: boolean;
    onClose: () => void;
    targetRowIds: string[]; // Support for batch linking
    targetTableId: string;
    onSuccess?: (levelIds: string[]) => void;
}

const MultiConceptPicker: React.FC<MultiConceptPickerProps> = ({
    isOpen,
    onClose,
    targetRowIds,
    targetTableId,
    onSuccess
}) => {
    const { concepts, conceptLevels, getLevelsByConcept, getChildConcepts, getRootConcepts, isHydrated } = useConceptStore();
    const { batchUpdateRows, tables } = useTableStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [selectedLevelIds, setSelectedLevelIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingConcept, setIsCreatingConcept] = useState(false);
    const [isCreatingLevel, setIsCreatingLevel] = useState<string | null>(null); // conceptId
    const [newName, setNewName] = useState('');
    const [newCode, setNewCode] = useState('');

    // Initialize selection if single row
    React.useEffect(() => {
        if (isOpen && targetRowIds.length === 1) {
            const table = tables.find(t => t.id === targetTableId);
            const row = table?.rows.find(r => r.id === targetRowIds[0]);
            if (row && row.conceptLevelIds) {
                setSelectedLevelIds(new Set(row.conceptLevelIds));
            } else if (row && row.conceptLevelId) {
                setSelectedLevelIds(new Set([row.conceptLevelId]));
            } else {
                setSelectedLevelIds(new Set());
            }
        } else if (isOpen) {
            setSelectedLevelIds(new Set());
        }
    }, [isOpen, targetRowIds, targetTableId, tables]);

    // Force re-render check on open
    React.useEffect(() => {
        if (isOpen) {
            // Just a side-effect to log or ensure strict mode doesn't swallow updates
            // Ideally simply accessing the store above is enough, but this confirms mounting.
        }
    }, [isOpen, isHydrated]);

    const toggleFolder = (id: string) => {
        const next = new Set(expandedFolders);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedFolders(next);
    };

    const toggleLevel = (id: string) => {
        const next = new Set(selectedLevelIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedLevelIds(next);
    };

    const handleSave = async () => {
        if (targetRowIds.length === 0) return;
        setIsSaving(true);
        try {
            const levelIds = Array.from(selectedLevelIds);
            const updates = targetRowIds.map(rowId => ({
                rowId,
                changes: { conceptLevelIds: levelIds }
            }));
            await batchUpdateRows(targetTableId, updates);
            onSuccess?.(levelIds);
            onClose();
        } catch (error) {
            console.error("Failed to update concept links", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreateConcept = async (parentId?: string) => {
        if (!newName.trim() || !newCode.trim()) return;
        try {
            const concept = await useConceptStore.getState().createConcept(newCode, newName, '', parentId);
            setExpandedFolders(prev => new Set(prev).add(concept.id));
            setNewName('');
            setNewCode('');
            setIsCreatingConcept(false);
        } catch (error: any) {
            console.error("Failed to create concept", error);
        }
    };

    const handleCreateLevel = async (conceptId: string) => {
        if (!newName.trim()) return;
        try {
            const levels = getLevelsByConcept(conceptId);
            const nextOrder = levels.length > 0 ? Math.max(...levels.map(l => l.order)) + 1 : 1;
            const level = await useConceptStore.getState().createLevel(conceptId, newName, nextOrder);
            toggleLevel(level.id); // Auto select
            setNewName('');
            setIsCreatingLevel(null);
        } catch (error: any) {
            console.error("Failed to create level", error);
        }
    };

    // Reactivity Fix: Calculate directly in render to ensure fresh data
    const rootList = isHydrated ? getRootConcepts() : [];

    // Filter Logic
    const filteredConcepts = (() => {
        if (!searchQuery.trim()) return rootList;
        const lower = searchQuery.toLowerCase();
        return rootList.filter(c =>
            c.name.toLowerCase().includes(lower) ||
            c.code.toLowerCase().includes(lower)
        );
    })();

    const renderConcept = (concept: Concept, depth = 0) => {
        const children = getChildConcepts(concept.id);
        const levels = getLevelsByConcept(concept.id);
        const isExpanded = expandedFolders.has(concept.id) || searchQuery.trim() !== '';
        const hasChildren = children.length > 0 || levels.length > 0;

        return (
            <div key={concept.id} className="select-none">
                <div
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${depth === 0 ? 'hover:bg-purple-500/10' : 'hover:bg-white/5'
                        }`}
                    style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                    onClick={() => toggleFolder(concept.id)}
                >
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                        <Icon name="chevron-right" className="w-4 h-4 text-text-subtle" />
                    </div>
                    <Icon
                        name={concept.isFolder ? "folder" : "book"}
                        className={`w-4 h-4 ${concept.isFolder ? 'text-amber-400' : 'text-purple-400'}`}
                    />
                    <span className="text-sm font-medium text-text-main dark:text-secondary-100 flex-1">
                        {concept.name}
                        <span className="ml-2 text-[10px] opacity-40 font-mono">{concept.code}</span>
                    </span>

                    {/* Quick Add Level Btn */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setNewName('');
                            setIsCreatingLevel(isCreatingLevel === concept.id ? null : concept.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-md text-text-subtle hover:text-purple-400 transition-colors"
                    >
                        <Icon name="plus" className="w-4 h-4" />
                    </button>
                </div>

                {/* Create Level Inline Form */}
                {isCreatingLevel === concept.id && (
                    <div className="ml-8 mr-4 my-1 p-2 bg-white/5 rounded-xl border border-white/10 flex gap-2 animate-fadeIn">
                        <input
                            type="text"
                            placeholder="Level name (e.g. Mastered)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="flex-1 bg-transparent border-none text-xs focus:ring-0"
                            autoFocus
                        />
                        <button onClick={() => handleCreateLevel(concept.id)} className="p-1 px-2 bg-purple-600 rounded-lg text-[10px] text-white font-bold">Add</button>
                    </div>
                )}

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            {/* Render Children Concepts */}
                            {children.map(child => renderConcept(child, depth + 1))}

                            {/* Render Levels */}
                            {levels.map(level => (
                                <label
                                    key={level.id}
                                    className="flex items-center gap-3 p-2 ml-8 rounded-lg cursor-pointer hover:bg-white/5 transition-colors group"
                                    style={{ paddingLeft: `${(depth + 1) * 1.5 + 0.5}rem` }}
                                >
                                    <div
                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedLevelIds.has(level.id)
                                            ? 'bg-purple-600 border-purple-600'
                                            : 'border-border-subtle group-hover:border-purple-400'
                                            }`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleLevel(level.id);
                                        }}
                                    >
                                        {selectedLevelIds.has(level.id) && <Icon name="check" className="w-3 h-3 text-white" />}
                                    </div>
                                    <span className="text-sm text-text-subtle group-hover:text-text-main transition-colors">
                                        {level.name}
                                    </span>
                                </label>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative bg-white/80 dark:bg-secondary-900/80 border border-white/20 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden backdrop-blur-2xl"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                    <div>
                        <h2 className="text-xl font-bold text-text-main dark:text-white">Link to Concept</h2>
                        <p className="text-xs text-text-subtle mt-1">
                            Assinging {targetRowIds.length} cards to knowledge nodes
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setNewName('');
                            setNewCode('');
                            setIsCreatingConcept(!isCreatingConcept);
                        }}
                        className={`p-2 rounded-full transition-colors ${isCreatingConcept ? 'bg-purple-500 text-white' : 'hover:bg-white/10 text-text-subtle'}`}
                        title="New Root Concept"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Icon name="x" className="w-5 h-5 text-text-subtle" />
                    </button>
                </div>

                {/* Create Root Concept Form */}
                {isCreatingConcept && (
                    <div className="p-4 mx-4 mb-2 bg-purple-500/10 rounded-2xl border border-purple-500/30 space-y-3 animate-slideInDown">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Code"
                                value={newCode}
                                onChange={e => setNewCode(e.target.value.toUpperCase())}
                                className="w-20 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm font-mono uppercase"
                                maxLength={8}
                            />
                            <input
                                type="text"
                                placeholder="Concept Name..."
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsCreatingConcept(false)} className="text-xs px-3 py-1.5 rounded-lg hover:bg-white/5">Cancel</button>
                            <button onClick={() => handleCreateConcept()} className="text-xs px-3 py-1.5 bg-purple-600 rounded-lg text-white font-bold">Create</button>
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="p-4">
                    <div className="relative group">
                        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle group-focus-within:text-purple-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search concepts or codes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-secondary-100/50 dark:bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                        />
                    </div>
                </div>

                {/* Tree Area */}
                <div className="max-h-[400px] overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-white/10">
                    {filteredConcepts.map(concept => renderConcept(concept))}

                    {!isHydrated && (
                        <div className="py-12 text-center flex flex-col items-center">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
                            <p className="text-sm text-text-subtle">Loading concepts...</p>
                        </div>
                    )}

                    {isHydrated && filteredConcepts.length === 0 && (
                        <div className="py-12 text-center">
                            <Icon name="search" className="w-12 h-12 text-text-subtle mx-auto opacity-20 mb-4" />
                            <p className="text-sm text-text-subtle italic">No concepts found</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white/5 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || selectedLevelIds.size === 0}
                        className="flex-[2] py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Icon name="link" className="w-4 h-4" />
                        )}
                        {isSaving ? 'Processing...' : `Apply to ${targetRowIds.length} Nodes`}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};

export default MultiConceptPicker;
