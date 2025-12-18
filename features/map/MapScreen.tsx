
import React, { useState } from 'react';
import { useGraphData, GraphNode, NodeType } from './hooks/useGraphData';
import ForceGraph from './components/ForceGraph';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
// FIX: Renamed FlashcardProgress to ConfidenceProgress.
import { Screen, AnkiProgress, ConfidenceProgress, StudyProgress, Table, Note, DictationNote } from '../../types';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Popover from '../../components/ui/Popover';
import { Input } from '../../components/ui/Input';
import { useDebounce } from '../../hooks/useDebounce';
import AuroraBackground from '../../components/ui/AuroraBackground';

const NodeActionModal: React.FC<{ node: GraphNode | null; onClose: () => void }> = ({ node, onClose }) => {
    const { setCurrentScreen } = useUIStore();
    const { 
        handleStartAnkiSession, handleStartConfidenceSession, handleSelectTable,
        setReadingScreenTarget, setEditingDictationNote
    } = useSessionStore();

    if (!node) return null;

    const handleAction = () => {
        switch (node.type) {
            case 'anki': handleStartAnkiSession(node.id); break;
            // FIX: Renamed from 'flashcard' to 'confidence' and updated the handler.
            case 'confidence': handleStartConfidenceSession(node.id); break;
            case 'table': handleSelectTable(node.id); break;
            case 'queue': setCurrentScreen(Screen.StudyProgress); break;
            case 'note': setReadingScreenTarget({ noteId: node.id }); setCurrentScreen(Screen.Reading); break;
            case 'dictation': setEditingDictationNote(node.data as DictationNote); setCurrentScreen(Screen.DictationEditor); break;
        }
        onClose();
    };

    const getDescriptionAndAction = () => {
        switch (node.type) {
            case 'table': {
                const tableData = node.data as Table;
                // Safe access: Check if rows is an array before accessing length
                const rows = tableData?.rows;
                const wordCount = tableData?.rowCount ?? (Array.isArray(rows) ? rows.length : 0);
                return { description: `${wordCount} words`, actionLabel: "View Table" };
            }
            case 'anki':
                return { description: "Anki SRS Deck", actionLabel: "Start Review" };
            // FIX: Renamed from 'flashcard' to 'confidence' and updated type cast.
            case 'confidence': {
                const fcData = node.data as ConfidenceProgress;
                const queue = fcData?.queue;
                const fcCount = Array.isArray(queue) ? queue.length : 0;
                return { description: `${fcCount} cards`, actionLabel: "Start Session" };
            }
            case 'queue': {
                const queueData = node.data as StudyProgress;
                const queue = queueData?.queue;
                const qCount = Array.isArray(queue) ? queue.length : 0;
                return { description: `${qCount} questions in queue`, actionLabel: "View Progress" };
            }
            case 'note':
                return { description: "Reading Note", actionLabel: "Read Note" };
            case 'dictation':
                return { description: "Dictation Exercise", actionLabel: "Practice" };
            default:
                return { description: "", actionLabel: "View" };
        }
    };

    const { description, actionLabel } = getDescriptionAndAction();


    return (
        <Modal isOpen={!!node} onClose={onClose} title={node.label}>
            <div className="p-6">
                <p className="text-sm text-text-subtle mb-4">{description}</p>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={handleAction}>{actionLabel}</Button>
                </div>
            </div>
        </Modal>
    );
};

const filterOptions: { type: NodeType; label: string; color: string }[] = [
    { type: 'table', label: 'Tables', color: '#64748b' },
    { type: 'anki', label: 'Anki Decks', color: '#0ea5e9' },
    // FIX: Renamed from 'flashcard' to 'confidence'.
    { type: 'confidence', label: 'Confidence Sets', color: '#f59e0b' },
    { type: 'queue', label: 'Study Queues', color: '#22c55e' },
    { type: 'note', label: 'Notes', color: '#64748b' },
    { type: 'dictation', label: 'Dictations', color: '#ef4444' },
];

const ToggleSwitch: React.FC<{ label: string, isChecked: boolean, onToggle: () => void }> = ({ label, isChecked, onToggle }) => (
    <div onClick={onToggle} className="flex items-center justify-between p-1.5 rounded-md cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-700/50">
        <span className="text-sm font-medium">{label}</span>
        <div className={`w-9 h-5 flex items-center rounded-full p-1 transition-colors ${isChecked ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}>
            <span className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform ${isChecked ? 'translate-x-4' : ''}`}></span>
        </div>
    </div>
);

const MapScreen: React.FC = () => {
    const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(new Set(filterOptions.map(f => f.type)));
    const [searchQuery, setSearchQuery] = useState('');
    const [hideOrphans, setHideOrphans] = useState(false);
    const [mainLinksOnly, setMainLinksOnly] = useState(false);
    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const { nodes, links } = useGraphData({
        activeFilters,
        searchQuery: debouncedSearchQuery,
        hideOrphans,
        mainLinksOnly
    }) || { nodes: [], links: [] }; // Safety fallback
    
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [isExplorerOpen, setIsExplorerOpen] = useState(false);
    
    const toggleFilter = (type: NodeType) => {
        setActiveFilters(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type); else next.add(type);
            return next;
        });
    };

    return (
        <div className="w-full h-full relative overflow-hidden flex flex-col">
            {/* 1. The Atmosphere */}
            <AuroraBackground />

            {/* 2. The Graph Layer (with subtle contrast boost) */}
            <div className="flex-1 relative z-10 bg-white/30 dark:bg-black/20 backdrop-blur-[1px]">
                <ForceGraph nodes={nodes || []} links={links || []} onNodeClick={setSelectedNode} />
            </div>
            
             {/* 3. UI Overlays */}
             <div className="absolute top-4 right-4 z-20">
                <Popover
                    isOpen={isExplorerOpen}
                    setIsOpen={setIsExplorerOpen}
                    trigger={
                        <Button variant="secondary" size="md">
                            <Icon name="sliders" className="w-5 h-5 mr-2" />
                            Explorer
                        </Button>
                    }
                    contentClassName="w-72"
                >
                    <div className="space-y-4">
                        <div className="relative">
                            <Icon name="search" className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2"/>
                            <Input 
                                type="text"
                                placeholder="Search nodes..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-text-subtle uppercase mb-1">Node Types</h4>
                            {filterOptions.map(opt => (
                                <ToggleSwitch 
                                    key={opt.type} 
                                    label={opt.label} 
                                    isChecked={activeFilters.has(opt.type)} 
                                    onToggle={() => toggleFilter(opt.type)} 
                                />
                            ))}
                        </div>

                        <div>
                             <h4 className="text-xs font-bold text-text-subtle uppercase mb-1">Structural Filters</h4>
                             <ToggleSwitch 
                                label="Hide Orphans" 
                                isChecked={hideOrphans}
                                onToggle={() => setHideOrphans(prev => !prev)}
                             />
                             <ToggleSwitch 
                                label="Main Links Only" 
                                isChecked={mainLinksOnly}
                                onToggle={() => setMainLinksOnly(prev => !prev)}
                            />
                        </div>
                    </div>
                </Popover>
            </div>

            <NodeActionModal node={selectedNode} onClose={() => setSelectedNode(null)} />
        </div>
    );
};

export default MapScreen;
