
import * as React from 'react';
import { Table, Relation, StudyMode, RelationDesign, TypographyDesign, Theme, TextBox, VocabRow } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import { DEFAULT_RELATION_DESIGN, DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../designConstants';
import { Button } from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';

// New Subcomponents
import AnswerDefinitionPanel from './RelationSettings/AnswerDefinitionPanel'; 
import UnifiedDesigner from './RelationSettings/UnifiedDesigner';

function generateDefaultLayout(relation: Relation, table: Table, theme: Theme): RelationDesign {
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
    const newDesign = JSON.parse(JSON.stringify(DEFAULT_RELATION_DESIGN));
    
    // Initialize visually empty for "Blueprint Mode"
    newDesign.front.backgroundType = 'solid';
    newDesign.front.backgroundValue = theme === 'dark' ? '#0f172a' : '#f8fafc'; 
    
    const frontElements: string[] = [];
    const frontTextBoxes: TextBox[] = [];
    
    // --- Smart Prompt Header Logic ---
    if (relation.answerColumnIds.length > 0) {
        const firstAnswerColId = relation.answerColumnIds[0];
        const answerCol = table.columns.find(c => c.id === firstAnswerColId);
        
        if (answerCol) {
            const promptId = `txt-${crypto.randomUUID()}`;
            frontTextBoxes.push({
                id: promptId,
                text: `What is the ${answerCol.name}?`,
                typography: {
                    ...defaultTypo,
                    fontSize: '0.875rem',
                    fontWeight: 'normal',
                    fontStyle: 'italic',
                    opacity: 0.7
                }
            });
            frontElements.push(promptId);
        }
    }
    
    newDesign.front.textBoxes = frontTextBoxes;
    newDesign.front.elementOrder = frontElements;
    newDesign.front.layout = 'vertical';

    newDesign.back.textBoxes = [];
    relation.answerColumnIds.forEach(id => { newDesign.back.typography[id] = { ...defaultTypo }; });
    newDesign.back.elementOrder = [...relation.answerColumnIds];
    
    newDesign.designLinked = true;
    newDesign.isRandom = true;
    return newDesign;
}

const availableInteractionModes = [
    { mode: StudyMode.Flashcards, label: 'Flashcard (Reveal)' },
    { mode: StudyMode.MultipleChoice, label: 'Multiple Choice' },
    { mode: StudyMode.TrueFalse, label: 'True / False' },
    { mode: StudyMode.Typing, label: 'Typing' },
    { mode: StudyMode.Scrambled, label: 'Scramble' },
    { mode: StudyMode.Stroke, label: 'Stroke (Writing)' }, // New
];

const RelationSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (relation: Relation) => void; relation: Relation | null; table: Table; initialTab?: 'setup' | 'design'; }> = ({ isOpen, onClose, onSave, relation, table, initialTab = 'setup' }) => {
    const { theme } = useUIStore();
    const [editedRelation, setEditedRelation] = React.useState<Relation | null>(null);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
    const [activeTab, setActiveTab] = React.useState<'logic' | 'design'>('logic');
    
    // Learning Systems State
    const [enableQueue, setEnableQueue] = React.useState(false);
    const [enableConfidence, setEnableConfidence] = React.useState(false);
    const [enableAnki, setEnableAnki] = React.useState(false);
    const [enableTheater, setEnableTheater] = React.useState(false);

    const [forcedPreviewMode, setForcedPreviewMode] = React.useState<StudyMode | null>(null);
    
    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    React.useEffect(() => {
        if (isOpen && relation) {
            const newRel = JSON.parse(JSON.stringify(relation));
            if (!newRel.design || Object.keys(newRel.design).length === 0) {
                newRel.design = generateDefaultLayout(newRel, table, theme);
            }
            if (!newRel.design.front.elementOrder) newRel.design.front.elementOrder = [];
            if (!newRel.design.back.elementOrder) newRel.design.back.elementOrder = [...newRel.answerColumnIds];
            if (!newRel.design.front.typography) newRel.design.front.typography = {};
            if (!newRel.design.back.typography) newRel.design.back.typography = {};
            
            if (!newRel.interactionModes) {
                 if (newRel.interactionType) {
                     newRel.interactionModes = [newRel.interactionType];
                 } else if (newRel.compatibleModes && newRel.compatibleModes.length > 0) {
                     newRel.interactionModes = [...newRel.compatibleModes];
                 } else {
                     newRel.interactionModes = [StudyMode.Flashcards];
                 }
            }

            setEditedRelation(newRel);
            
            const currentTags = newRel.tags || [];
            setEnableQueue(currentTags.includes('StudySession'));
            setEnableConfidence(currentTags.includes('Flashcard'));
            setEnableAnki(currentTags.includes('Anki'));
            setEnableTheater(currentTags.includes('Theater'));

            setForcedPreviewMode(null);
            setActiveTab(initialTab === 'setup' ? 'logic' : 'design');
        }
    }, [isOpen, relation, table, theme, initialTab]);

    const handleUpdate = (updater: (draft: Relation) => void) => {
        setEditedRelation(prev => {
            if (!prev) return null;
            const next = JSON.parse(JSON.stringify(prev));
            updater(next);
            return next;
        });
    };

    const handleToggleMode = (mode: StudyMode) => {
        handleUpdate(draft => {
            const modes = new Set(draft.interactionModes || []);
            if (modes.has(mode)) {
                modes.delete(mode);
                if (forcedPreviewMode === mode) setForcedPreviewMode(null);
            } else {
                modes.add(mode);
                setForcedPreviewMode(mode);
            }
            draft.interactionModes = Array.from(modes);
            draft.compatibleModes = draft.interactionModes;
        });
    };

    const handleSaveInternal = () => {
        if (!editedRelation) return;

        const currentTags = new Set(editedRelation.tags || []);
        const modes = editedRelation.interactionModes || [];

        if (enableQueue) currentTags.add('StudySession'); else currentTags.delete('StudySession');
        if (enableConfidence) currentTags.add('Flashcard'); else currentTags.delete('Flashcard');
        if (enableAnki) currentTags.add('Anki'); else currentTags.delete('Anki');
        if (enableTheater) currentTags.add('Theater'); else currentTags.delete('Theater');

        if (modes.includes(StudyMode.MultipleChoice)) currentTags.add('MCQ');
        if (modes.includes(StudyMode.TrueFalse)) currentTags.add('TF');
        if (modes.includes(StudyMode.Scrambled)) currentTags.add('Scramble');
        if (modes.includes(StudyMode.Typing)) currentTags.add('Typing');
        if (modes.includes(StudyMode.Stroke)) currentTags.add('Stroke');
        
        const finalRelation: Relation = {
            ...editedRelation,
            tags: Array.from(currentTags),
            compatibleModes: modes,
        };

        onSave(finalRelation);
        onClose();
    };

    if (!isOpen || !editedRelation) return null;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isMobile ? (activeTab === 'logic' ? 'Settings' : 'Design') : 'Relation Editor'} 
            fullScreen={isMobile}
            containerClassName="bg-background dark:bg-secondary-900 w-full h-full md:w-[95vw] md:h-[90vh] md:max-w-[1600px] md:rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 flex flex-col overflow-hidden"
        >
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                {/* Mobile Tab Switcher */}
                {isMobile && (
                    <div className="flex border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0 bg-surface dark:bg-secondary-800">
                        <button onClick={() => setActiveTab('logic')} className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'logic' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-subtle'}`}>Logic & Settings</button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 py-3 text-sm font-semibold ${activeTab === 'design' ? 'text-primary-600 border-b-2 border-primary-600' : 'text-text-subtle'}`}>Card Design</button>
                    </div>
                )}

                {/* Left Sidebar: Logic & Settings */}
                {/* On desktop, this is a fixed sidebar. On mobile, it's a tab content. */}
                <div 
                    className={`
                        flex-col bg-surface dark:bg-secondary-800 border-r border-border dark:border-secondary-700 overflow-y-auto z-20
                        ${isMobile ? (activeTab === 'logic' ? 'flex w-full flex-1 min-h-0' : 'hidden') : 'flex w-[400px] flex-shrink-0'}
                    `}
                >
                    {/* Sidebar Header - Hidden on Mobile since Modal header handles it */}
                    <div className="p-4 border-b border-border dark:border-secondary-700 hidden md:flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <button onClick={onClose} className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"><Icon name="arrowLeft" className="w-5 h-5"/></button>
                             <h2 className="font-bold text-lg">Relation Editor</h2>
                         </div>
                    </div>

                    <div className="p-4 space-y-6 flex-1">
                        <div>
                            <label className="block text-xs font-bold text-text-subtle mb-1 uppercase">Relation Name</label>
                            <input 
                                type="text" 
                                value={editedRelation.name} 
                                onChange={(e) => handleUpdate(draft => { draft.name = e.target.value; })} 
                                className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500" 
                            />
                        </div>

                         <AnswerDefinitionPanel 
                            table={table}
                            relation={editedRelation}
                            onChange={(updated) => setEditedRelation(updated)}
                            sampleRow={table.rows[0]}
                         />

                         {/* Learning Systems */}
                         <Card>
                             <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Enabled Systems</CardTitle></CardHeader>
                             <CardContent className="p-4 pt-2">
                                 <div className="flex flex-col gap-2">
                                     <label className="flex items-center gap-3 cursor-pointer p-1 rounded hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                                         <input type="checkbox" checked={enableQueue} onChange={e => setEnableQueue(e.target.checked)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                                         <div>
                                             <span className="text-sm font-semibold">Queue</span>
                                             <span className="text-xs text-text-subtle block">Standard study progression</span>
                                         </div>
                                     </label>
                                     <label className="flex items-center gap-3 cursor-pointer p-1 rounded hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                                         <input type="checkbox" checked={enableConfidence} onChange={e => setEnableConfidence(e.target.checked)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                                         <div>
                                             <span className="text-sm font-semibold">Confidence</span>
                                             <span className="text-xs text-text-subtle block">Short-term mastery loop</span>
                                         </div>
                                     </label>
                                     <label className="flex items-center gap-3 cursor-pointer p-1 rounded hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                                         <input type="checkbox" checked={enableAnki} onChange={e => setEnableAnki(e.target.checked)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                                         <div>
                                             <span className="text-sm font-semibold">Anki SRS</span>
                                             <span className="text-xs text-text-subtle block">Long-term retention decks</span>
                                         </div>
                                     </label>
                                 </div>
                             </CardContent>
                         </Card>

                         <Card>
                            <CardHeader className="p-4 pb-2"><CardTitle className="text-sm">Interaction Modes</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-2">
                                 <div className="flex flex-col gap-1">
                                    {availableInteractionModes.map((item) => (
                                        <label key={item.mode} className={`flex items-center gap-3 p-2 rounded-md border cursor-pointer transition-colors ${(editedRelation.interactionModes || []).includes(item.mode) ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' : 'bg-secondary-50 border-transparent dark:bg-secondary-800/50 hover:bg-secondary-100'}`}>
                                             <input 
                                                type="checkbox" 
                                                checked={(editedRelation.interactionModes || []).includes(item.mode)} 
                                                onChange={() => handleToggleMode(item.mode)} 
                                                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-text-main dark:text-secondary-200">{item.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    
                    {/* Sidebar Footer */}
                    <div className="p-4 bg-secondary-50 dark:bg-secondary-800/80 border-t border-border dark:border-secondary-700 flex justify-end gap-2 sticky bottom-0">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSaveInternal}>Save Changes</Button>
                    </div>
                </div>

                {/* Right Column: Visual Designer (Infinite Canvas) */}
                <div 
                    className={`
                        flex-1 flex flex-col relative bg-secondary-50 dark:bg-black/40
                        ${isMobile 
                            ? (activeTab !== 'design' ? 'hidden' : 'flex w-full overflow-y-auto overflow-x-hidden') 
                            : 'flex overflow-hidden'}
                    `}
                >
                    <UnifiedDesigner 
                        table={table} 
                        relation={editedRelation} 
                        onChange={handleUpdate} 
                        forcedMode={forcedPreviewMode}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default RelationSettingsModal;
