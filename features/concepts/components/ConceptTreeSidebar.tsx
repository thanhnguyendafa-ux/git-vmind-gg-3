import React from 'react';
import { useConceptStore } from '../../../stores/useConceptStore';
import Icon from '../../../components/ui/Icon';
import { Concept } from '../../../types';
import { AnimatePresence, motion } from 'framer-motion';

interface ConceptTreeSidebarProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
    expanded: Set<string>;
    onToggleExpand: (id: string) => void;
    isOpen: boolean;
    onClose: () => void;
    searchQuery: string;
    onEdit?: (concept: Concept) => void;
    onDelete?: (concept: Concept) => void;
}

const ConceptTreeSidebar: React.FC<ConceptTreeSidebarProps> = ({
    selectedId,
    onSelect,
    expanded,
    onToggleExpand,
    isOpen,
    onClose,
    searchQuery,
    onEdit,
    onDelete
}) => {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);
    const { concepts, getRootConcepts, getChildConcepts, searchConceptsByName } = useConceptStore();

    // Filter concepts by search
    const filteredConcepts = searchQuery ? searchConceptsByName(searchQuery) : concepts;
    const filteredIds = new Set(filteredConcepts.map(c => c.id));

    const renderConcept = (concept: Concept, depth: number = 0) => {
        const isExpanded = expanded.has(concept.id);
        const isSelected = selectedId === concept.id;
        const children = getChildConcepts(concept.id);
        const hasChildren = children.length > 0;

        // Hide if filtered out
        if (searchQuery && !filteredIds.has(concept.id)) {
            return null;
        }

        return (
            <div key={concept.id} className="select-none">
                <div
                    className="relative group"
                    onMouseEnter={() => setHoveredId(concept.id)}
                    onMouseLeave={() => setHoveredId(null)}
                >
                    <button
                        onClick={() => {
                            if (hasChildren) {
                                onToggleExpand(concept.id);
                            }
                            if (!concept.isFolder) {
                                onSelect(concept.id);
                            }
                        }}
                        className={`
                            w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-300 active:scale-[0.98] group/item
                            ${isSelected
                                ? 'bg-purple-500/10 dark:bg-purple-400/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 shadow-sm shadow-purple-500/5'
                                : 'hover:bg-white/40 dark:hover:bg-white/5 text-slate-600 dark:text-emerald-100/60 hover:text-slate-900 dark:hover:text-emerald-100'
                            }
                        `}
                        style={{ paddingLeft: `${depth * 16 + 12}px` }}
                    >
                        {/* Expand/Collapse Icon */}
                        {hasChildren && (
                            <Icon
                                name="chevron-right"
                                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            />
                        )}
                        {!hasChildren && <div className="w-4" />}

                        {/* Folder/Concept Icon */}
                        <Icon
                            name={concept.isFolder ? 'folder' : 'hierarchy'}
                            className="w-4 h-4 flex-shrink-0"
                            variant={isSelected ? 'filled' : undefined}
                        />

                        {/* Name */}
                        <span className="flex-1 text-left text-sm font-medium truncate">
                            {concept.name}
                        </span>

                        {/* Code Badge */}
                        {concept.code && hoveredId !== concept.id && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 text-slate-400 dark:text-emerald-400/40">
                                {concept.code}
                            </span>
                        )}
                    </button>

                    {/* Action Buttons (appear on hover) */}
                    {hoveredId === concept.id && (onEdit || onDelete) && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-white/60 dark:bg-black/40 backdrop-blur-xl rounded-xl border border-white/60 dark:border-white/10 p-1 shadow-xl">
                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(concept);
                                    }}
                                    className="p-1.5 hover:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                                    title="Edit concept"
                                >
                                    <Icon name="edit" className="w-4 h-4" />
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(concept);
                                    }}
                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                                    title="Delete concept"
                                >
                                    <Icon name="trash" className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Children */}
                <AnimatePresence>
                    {isExpanded && hasChildren && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="space-y-0.5 mt-0.5">
                                {children.map(child => renderConcept(child, depth + 1))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <div
                className={`
                    flex-shrink-0 w-80 border-r border-white/20 dark:border-white/5
                    bg-white/40 dark:bg-black/20 backdrop-blur-3xl overflow-y-auto custom-scrollbar
                    transition-transform duration-300
                    lg:relative lg:translate-x-0
                    fixed inset-y-0 left-0 z-50
                    ${isOpen ? 'translate-x-0 shadow-2xl shadow-black/20' : '-translate-x-full'}
                `}
            >
                <div className="p-4">
                    {/* Sidebar Header */}
                    <div className="flex items-center justify-between mb-6 px-2">
                        <h2 className="text-[10px] font-bold text-emerald-800/50 dark:text-emerald-400/50 uppercase tracking-[0.2em]">
                            Concept Architecture
                        </h2>
                        <button
                            onClick={onClose}
                            className="lg:hidden p-1 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"
                        >
                            <Icon name="x" className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Concept Tree */}
                    <div className="space-y-0.5">
                        {getRootConcepts().map(concept => renderConcept(concept))}
                    </div>

                    {/* Empty State */}
                    {concepts.length === 0 && (
                        <div className="text-center py-8">
                            <Icon name="folder" className="w-12 h-12 mx-auto mb-2 text-text-subtle" />
                            <p className="text-sm text-text-subtle">
                                No concepts yet
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ConceptTreeSidebar;
