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

const ConceptLinksScreen: React.FC = () => {
    const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());
    const [selectedCard, setSelectedCard] = useState<VocabRow | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeView, setActiveView] = useState<'kanban' | 'analytics'>('kanban');
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [filteredConcepts, setFilteredConcepts] = useState<Concept[]>([]);
    const [isLoadingExample, setIsLoadingExample] = useState(false);

    // Modal states
    const [showConceptForm, setShowConceptForm] = useState(false);
    const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
    const [deletingConcept, setDeletingConcept] = useState<Concept | null>(null);
    const [showLevelForm, setShowLevelForm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { concepts, getRootConcepts, deleteConcept } = useConceptStore();

    const handleLoadExample = async () => {
        setIsLoadingExample(true);
        try {
            const newId = await createPhotosynthesisSample();
            if (newId) {
                setSelectedConceptId(newId);
                // Also expand the parent if it's nested
                const concept = useConceptStore.getState().concepts.find(c => c.id === newId);
                if (concept?.parentId) {
                    toggleExpanded(concept.parentId);
                }
            }
        } finally {
            setIsLoadingExample(false);
        }
    };

    // Auto-select first root concept if none selected
    React.useEffect(() => {
        if (!selectedConceptId && concepts.length > 0) {
            const roots = getRootConcepts();
            if (roots.length > 0) {
                setSelectedConceptId(roots[0].id);
            }
        }
    }, [concepts, selectedConceptId, getRootConcepts]);

    const toggleExpanded = (conceptId: string) => {
        setExpandedConcepts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(conceptId)) {
                newSet.delete(conceptId);
            } else {
                newSet.add(conceptId);
            }
            return newSet;
        });
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
            await deleteConcept(deletingConcept.id);
            // If deleted concept was selected, clear selection
            if (selectedConceptId === deletingConcept.id) {
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
        return concepts.find(c => c.id === selectedConceptId);
    }, [concepts, selectedConceptId]);

    return (
        <div className="h-full flex flex-col bg-background dark:bg-secondary-900">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-border-subtle dark:border-white/10 bg-white dark:bg-secondary-800">
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="lg:hidden p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
                        >
                            <Icon name="menu" className="w-5 h-5 text-text-main dark:text-secondary-100" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Icon name="hierarchy" className="w-5 h-5 text-purple-600 dark:text-purple-400" variant="filled" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-text-main dark:text-secondary-100">
                                    Concept Links
                                </h1>
                                <p className="text-xs text-text-subtle">
                                    {selectedConcept ? selectedConcept.name : 'Select a concept to begin'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
                        <div className="relative flex-1">
                            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search concepts and cards..."
                                className="w-full pl-10 pr-4 py-2 bg-secondary-100 dark:bg-secondary-700 border border-border-subtle dark:border-white/10 rounded-lg text-sm text-text-main dark:text-secondary-100 placeholder-text-subtle focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    aria-label="Clear search"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-subtle hover:text-text-main"
                                >
                                    <Icon name="x" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                            className={`p-2 rounded-lg transition-colors ${showAdvancedSearch
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle hover:text-text-main'
                                }`}
                            title="Advanced Search"
                        >
                            <Icon name="filter" className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats & Actions */}
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        {selectedConceptId && !selectedConcept?.isFolder && (
                            <div className="flex items-center bg-secondary-100 dark:bg-secondary-700 rounded-lg p-1">
                                <button
                                    onClick={() => setActiveView('kanban')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'kanban'
                                        ? 'bg-white dark:bg-secondary-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-text-subtle hover:text-text-main'
                                        }`}
                                >
                                    Kanban
                                </button>
                                <button
                                    onClick={() => setActiveView('analytics')}
                                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeView === 'analytics'
                                        ? 'bg-white dark:bg-secondary-600 text-purple-600 dark:text-purple-400 shadow-sm'
                                        : 'text-text-subtle hover:text-text-main'
                                        }`}
                                >
                                    Analytics
                                </button>
                            </div>
                        )}

                        <div className="hidden md:flex items-center gap-1 text-sm text-text-subtle mr-2">
                            <Icon name="folder" className="w-4 h-4" />
                            <span>{concepts.length} concepts</span>
                        </div>
                        <button
                            onClick={handleLoadExample}
                            disabled={isLoadingExample}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium flex items-center gap-1.5 disabled:opacity-50"
                        >
                            <Icon name={isLoadingExample ? "loader" : "book-open"} className={`w-4 h-4 ${isLoadingExample ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Example</span>
                        </button>
                        <button
                            onClick={() => setShowConceptForm(true)}
                            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                            <Icon name="plus" className="w-4 h-4" />
                            <span className="hidden sm:inline">New Concept</span>
                        </button>
                        {selectedConceptId && !selectedConcept?.isFolder && (
                            <button
                                onClick={() => setShowLevelForm(true)}
                                className="px-3 py-1.5 bg-secondary-100 dark:bg-secondary-700 text-text-main dark:text-secondary-100 rounded-lg hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors text-sm font-medium flex items-center gap-1.5"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Level</span>
                            </button>
                        )}
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
                        <div className="p-4 bg-secondary-50 dark:bg-secondary-900">
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
                    selectedId={selectedConceptId}
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
                    {selectedConceptId ? (
                        activeView === 'kanban' ? (
                            <ConceptKanbanBoard
                                conceptId={selectedConceptId}
                                searchQuery={searchQuery}
                                onCardClick={handleCardClick}
                            />
                        ) : (
                            <ConceptAnalytics conceptId={selectedConceptId} />
                        )
                    ) : (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center max-w-md p-8">
                                <div className="w-20 h-20 mx-auto mb-4 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center">
                                    <Icon name="hierarchy" className="w-10 h-10 text-text-subtle" />
                                </div>
                                <h2 className="text-xl font-semibold text-text-main dark:text-secondary-100 mb-2">
                                    No Concept Selected
                                </h2>
                                <p className="text-text-subtle mb-4">
                                    Select a concept from the sidebar to view its organization
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
            {showLevelForm && selectedConceptId && (
                <LevelFormModal
                    conceptId={selectedConceptId}
                    onClose={() => setShowLevelForm(false)}
                    onSuccess={() => {
                        // Refresh handled by store
                    }}
                />
            )}
        </div>
    );
};

export default ConceptLinksScreen;
