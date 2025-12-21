import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConceptStore } from '../../stores/useConceptStore';
import Icon from '../../components/ui/Icon';
import ConceptTreeSidebar from './components/ConceptTreeSidebar';
import ConceptKanbanBoard from './components/ConceptKanbanBoard';
import { VocabRow, Concept } from '../../types';
import CardDetailModal from './components/CardDetailModal';
import ConceptFormModal from './components/ConceptFormModal';
import LevelFormModal from './components/LevelFormModal';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import ConceptAnalytics from './components/ConceptAnalytics';
import ConceptAdvancedSearch from './components/ConceptAdvancedSearch';
import { createPhotosynthesisSample } from './utils/ConceptLinksSample';
import SmartImportModal from './components/SmartImportModal';
import { useUIStore } from '../../stores/useUIStore';
import BlockingLoader from './components/BlockingLoader';
import AuroraBackground from '../../components/ui/AuroraBackground';

const ConceptLinksScreen: React.FC = () => {
    const {
        selectedConceptId: persistedSelectedId,
        setSelectedConceptId,
        expandedConceptIds,
        setExpandedConceptIds,
        toggleExpandedConceptId
    } = useUIStore();

    const [searchQuery, setSearchQuery] = useState('');
    // Convert to Set for faster lookup in children components
    const expandedConcepts = useMemo(() => new Set(expandedConceptIds), [expandedConceptIds]);
    const [selectedCard, setSelectedCard] = useState<VocabRow | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState<'kanban' | 'analytics'>('kanban');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filteredConcepts, setFilteredConcepts] = useState<Concept[]>([]);
    const [isLoadingSample, setIsLoadingSample] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Preparing sample data...');

    // Modal states
    const [showConceptForm, setShowConceptForm] = useState(false);
    const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
    const [deletingConcept, setDeletingConcept] = useState<Concept | null>(null);
    const [showLevelForm, setShowLevelForm] = useState(false);
    const [showSmartImport, setShowSmartImport] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { concepts, getRootConcepts, deleteConcept } = useConceptStore();

    const handleLoadExample = async () => {
        setIsLoadingSample(true);
        setLoadingMessage('Initializing sample seeding...');
        try {
            const newId = await createPhotosynthesisSample((msg) => {
                setLoadingMessage(msg);
            });
            if (newId) {
                // Ensure the concept exists in the local concepts list before selecting
                // to avoid "Concept not found" message in Kanban briefy
                let attempts = 0;
                while (attempts < 10) {
                    const exists = useConceptStore.getState().concepts.some(c => c.id === newId);
                    if (exists) break;
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                setSelectedConceptId(newId);
                // Also auto-expand parents
                const concept = useConceptStore.getState().concepts.find(c => c.id === newId);
                if (concept?.parentId) {
                    if (!expandedConceptIds.includes(concept.parentId)) {
                        setExpandedConceptIds([...expandedConceptIds, concept.parentId]);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to load example:', err);
            useUIStore.getState().showToast('Failed to load sample data. Please try again.', 'error');
        } finally {
            setIsLoadingSample(false);
        }
    };

    // Auto-select first root concept if none selected
    useEffect(() => {
        if (!persistedSelectedId && concepts.length > 0) {
            const roots = getRootConcepts();
            if (roots.length > 0) {
                setSelectedConceptId(roots[0].id);
            }
        }
    }, [concepts, persistedSelectedId, getRootConcepts, setSelectedConceptId]);

    // REACTIVE GUARD: If the selected concept no longer exists (e.g. deleted), clear the selection
    useEffect(() => {
        if (persistedSelectedId && concepts.length > 0) {
            const exists = concepts.some(c => c.id === persistedSelectedId);
            if (!exists) {
                console.log(`[ReactiveGuard] Selected concept ${persistedSelectedId} no longer exists. Clearing selection.`);
                setSelectedConceptId(null);
            }
        }
    }, [concepts, persistedSelectedId, setSelectedConceptId]);

    // Auto-expand parents of selected concept and implement "Auto Hiện Ra" for root folders
    useEffect(() => {
        const rootFolders = getRootConcepts().filter(c => c.isFolder);

        // If nothing expanded yet, auto-expand root folders (User request: "auto hiện ra")
        if (expandedConceptIds.length === 0 && rootFolders.length > 0) {
            setExpandedConceptIds(rootFolders.map(c => c.id));
            return;
        }

        if (persistedSelectedId) {
            const concept = concepts.find(c => c.id === persistedSelectedId);
            if (concept?.parentId) {
                // Ensure parent is expanded
                if (!expandedConceptIds.includes(concept.parentId)) {
                    setExpandedConceptIds([...expandedConceptIds, concept.parentId]);
                }
            }
        }
    }, [persistedSelectedId, concepts, getRootConcepts, expandedConceptIds, setExpandedConceptIds]);

    const toggleExpanded = (conceptId: string) => {
        toggleExpandedConceptId(conceptId);
    };

    const handleEditConcept = (concept: Concept) => {
        setEditingConcept(concept);
    };

    const handleDeleteConcept = (concept: Concept) => {
        setDeletingConcept(concept);
    };

    const confirmDelete = async () => {
        if (!deletingConcept) return;

        setIsDeleting(true);
        try {
            const idToDelete = deletingConcept.id;

            // Check if currently selected concept is the one being deleted OR a child of it
            let shouldClearSelection = false;
            if (persistedSelectedId) {
                if (persistedSelectedId === idToDelete) {
                    shouldClearSelection = true;
                } else {
                    // Check if selected concept is a descendant of the deleted concept
                    const hierarchy = useConceptStore.getState().getConceptHierarchy(persistedSelectedId);
                    if (hierarchy.some(c => c.id === idToDelete)) {
                        shouldClearSelection = true;
                    }
                }
            }

            await deleteConcept(idToDelete);

            if (shouldClearSelection) {
                setSelectedConceptId(null);
            }

            setDeletingConcept(null);
        } catch (err) {
            console.error('Failed to delete concept:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCardClick = (card: VocabRow) => {
        setSelectedCard(card);
    };

    const selectedConcept = useMemo(() => {
        return concepts.find(c => c.id === persistedSelectedId);
    }, [concepts, persistedSelectedId]);

    return (
        <div className="h-full relative flex flex-col overflow-hidden">
            {/* 1. The Atmosphere */}
            <AuroraBackground />

            {/* Organic Noise Texture Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none bg-noise mix-blend-overlay" />

            {/* Content Layer */}
            <div className="relative z-10 h-full flex flex-col overflow-hidden">
                {/* Blocking Loader for Sample Seeding */}
                <BlockingLoader isVisible={isLoadingSample} message={loadingMessage} />

                {/* Header */}
                <header className="flex-shrink-0 backdrop-blur-xl bg-white/40 dark:bg-black/20 border-b border-white/20 dark:border-white/5">
                    <div className="flex items-center justify-between p-4 px-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="lg:hidden p-2 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl transition-all active:scale-95"
                            >
                                <Icon name="menu" className="w-5 h-5 text-slate-800 dark:text-emerald-100" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-purple-500/10 dark:bg-purple-400/10 rounded-2xl">
                                    <Icon name="hierarchy" className="w-6 h-6 text-purple-600 dark:text-purple-400" variant="filled" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-2xl font-serif font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                                        Concept Links
                                    </h1>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-800/50 dark:text-emerald-400/50 mt-1.5 truncate">
                                        {selectedConcept ? selectedConcept.name : 'Select a concept to begin'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar - Optimized Density */}
                        <div className="flex items-center gap-2 flex-1 max-w-lg mx-6">
                            <div className="relative flex-1 group">
                                <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-purple-500 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search architectural seeds..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-white/30 dark:bg-white/5 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        aria-label="Clear search"
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                                    >
                                        <Icon name="x" className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                                className={`p-2.5 rounded-2xl transition-all active:scale-95 ${showAdvancedSearch
                                    ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                                    : 'bg-white/30 dark:bg-white/5 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-white/60 dark:border-white/10'
                                    }`}
                                title="Advanced Search"
                            >
                                <Icon name="filter" className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex items-center gap-3">
                            {/* View Toggle */}
                            {persistedSelectedId && !selectedConcept?.isFolder && (
                                <div className="flex items-center bg-white/30 dark:bg-white/5 backdrop-blur-md rounded-2xl p-1 border border-white/60 dark:border-white/10">
                                    <button
                                        onClick={() => setActiveView('kanban')}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'kanban'
                                            ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        Kanban
                                    </button>
                                    <button
                                        onClick={() => setActiveView('analytics')}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'analytics'
                                            ? 'bg-white dark:bg-white/10 text-purple-600 dark:text-purple-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                            }`}
                                    >
                                        Analytics
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleLoadExample}
                                disabled={isLoadingSample}
                                className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase tracking-widest disabled:opacity-50 active:scale-95 flex items-center gap-2"
                            >
                                <Icon name={isLoadingSample ? "loader" : "book-open"} className={`w-4 h-4 ${isLoadingSample ? 'animate-spin' : ''}`} />
                                <span className="hidden xl:inline">Sample</span>
                            </button>

                            <button
                                onClick={() => setShowSmartImport(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all active:scale-95 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <Icon name="wand" className="w-4 h-4" />
                                <span className="hidden xl:inline">Factory</span>
                            </button>

                            <button
                                onClick={() => setShowConceptForm(true)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all active:scale-95 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                <span className="hidden xl:inline">New Concept</span>
                            </button>
                        </div>
                    </div>
                </header>

                {/* Advanced Search Panel */}
                <AnimatePresence>
                    {showAdvancedSearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden border-b border-border-subtle dark:border-white/10"
                        >
                            <div className="p-6 backdrop-blur-3xl bg-white/40 dark:bg-black/40">
                                <ConceptAdvancedSearch
                                    onResultsChange={setFilteredConcepts}
                                    onClose={() => setShowAdvancedSearch(false)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <ConceptTreeSidebar
                        selectedId={persistedSelectedId}
                        onSelect={setSelectedConceptId}
                        expanded={expandedConcepts}
                        onToggleExpand={toggleExpanded}
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                        searchQuery={searchQuery}
                        onEdit={handleEditConcept}
                        onDelete={handleDeleteConcept}
                    />

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden">
                        {persistedSelectedId ? (
                            activeView === 'kanban' ? (
                                <ConceptKanbanBoard
                                    conceptId={persistedSelectedId}
                                    searchQuery={searchQuery}
                                    onCardClick={handleCardClick}
                                />
                            ) : (
                                <ConceptAnalytics conceptId={persistedSelectedId} />
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center max-w-md p-8">
                                    <div className="w-24 h-24 mx-auto mb-6 bg-white/30 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center border border-white/40 dark:border-white/10 shadow-xl">
                                        <Icon name="hierarchy" className="w-10 h-10 text-slate-400 dark:text-emerald-400/50" />
                                    </div>
                                    <h2 className="text-3xl font-serif font-medium text-slate-900 dark:text-white mb-3">
                                        Architecture Pending
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 dark:text-emerald-200/40 uppercase tracking-[0.15em] mb-4">
                                        Select a concept seed to begin building
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Card Detail Modal */}
                {selectedCard && (
                    <CardDetailModal
                        card={selectedCard}
                        onClose={() => setSelectedCard(null)}
                    />
                )}

                {/* Concept Form Modal - Create */}
                {showConceptForm && !editingConcept && (
                    <ConceptFormModal
                        onClose={() => setShowConceptForm(false)}
                        onSuccess={() => {
                            // Refresh handled by store
                        }}
                    />
                )}

                {/* Concept Form Modal - Edit */}
                {editingConcept && (
                    <ConceptFormModal
                        concept={editingConcept}
                        onClose={() => setEditingConcept(null)}
                        onSuccess={() => {
                            // Refresh handled by store
                        }}
                    />
                )}

                {/* Delete Confirmation Dialog */}
                {deletingConcept && (
                    <DeleteConfirmDialog
                        title="Delete Concept?"
                        message="This will permanently delete the concept and all its levels. Cards will not be deleted, but their concept level assignments will be removed."
                        itemName={`${deletingConcept.name} (${deletingConcept.code})`}
                        onConfirm={confirmDelete}
                        onCancel={() => setDeletingConcept(null)}
                        isDeleting={isDeleting}
                    />
                )}

                {/* Level Form Modal */}
                {showLevelForm && persistedSelectedId && (
                    <LevelFormModal
                        conceptId={persistedSelectedId}
                        onClose={() => setShowLevelForm(false)}
                        onSuccess={() => {
                            // Refresh handled by store
                        }}
                    />
                )}

                {/* Smart Import Modal (Factory) */}
                {showSmartImport && (
                    <SmartImportModal
                        onClose={() => setShowSmartImport(false)}
                        onSuccess={() => setShowSmartImport(false)}
                    />
                )}
            </div>
        </div>
    );
};

export default ConceptLinksScreen;
