
import * as React from 'react';
import { Note, Table, StudyMode } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { findContextSentences } from '../../../utils/textUtils';
import ClozePreviewPane from './ClozePreviewPane';

interface ClozeCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectionText: string;
    selectionStartIndex: number;
    activeNote: Note;
}

const ClozeCreationModal: React.FC<ClozeCreationModalProps> = ({ isOpen, onClose, selectionText, selectionStartIndex, activeNote }) => {
    const { tables, createClozeCard } = useTableStore();
    const showToast = useUIStore(state => state.showToast);

    const [targetTableId, setTargetTableId] = React.useState<'new' | string>('new');
    const [contextBefore, setContextBefore] = React.useState(1);
    const [contextAfter, setContextAfter] = React.useState(1);
    const [clozeType, setClozeType] = React.useState<StudyMode.ClozeTyping | StudyMode.ClozeMCQ>(StudyMode.ClozeTyping);
    const [hintType, setHintType] = React.useState<'wordCount' | 'none'>('wordCount');
    const [extraInfo, setExtraInfo] = React.useState('');
    const [scope, setScope] = React.useState<'single' | 'all'>('single');
    const [isCreating, setIsCreating] = React.useState(false);

    // Auto-detect existing table on mount
    React.useEffect(() => {
        if (isOpen) {
            const expectedName = `Reading Notes - ${activeNote.title}`;
            const existingTable = tables.find(t => t.name === expectedName);
            if (existingTable) {
                setTargetTableId(existingTable.id);
            } else {
                setTargetTableId('new');
            }
        }
    }, [isOpen, activeNote.title, tables]);

    // Calculate occurrences
    const occurrenceCount = React.useMemo(() => {
        if (!activeNote.content || !selectionText) return 0;
        const escaped = selectionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        return (activeNote.content.match(regex) || []).length;
    }, [activeNote.content, selectionText]);

    // Dynamic Context Calculation (Preview shows current selection context)
    const { contextBefore: textBefore, contextAfter: textAfter } = React.useMemo(() => {
        return findContextSentences(
            activeNote.content || '',
            selectionStartIndex,
            selectionText.length,
            contextBefore,
            contextAfter
        );
    }, [activeNote.content, selectionStartIndex, selectionText, contextBefore, contextAfter]);

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            await createClozeCard({
                note: activeNote,
                selectionText,
                selectionStartIndex,
                clozeOptions: {
                    targetTableId,
                    contextBefore,
                    contextAfter,
                    clozeType,
                    hint: hintType,
                    extraInfo: extraInfo.trim() || undefined,
                    scope // Pass scope parameter
                }
            });
            
            const countMsg = scope === 'all' ? `Created ${occurrenceCount} cloze cards` : 'Cloze card created';
            showToast(`${countMsg} successfully!`, 'success');
            onClose();
        } catch (error) {
            console.error('Failed to create cloze card:', error);
            showToast('Failed to create cloze card.', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    const readingNotesTables = React.useMemo(() => tables.filter(t => t.name.startsWith('Reading Notes')), [tables]);
    const otherTables = React.useMemo(() => tables.filter(t => !t.name.startsWith('Reading Notes')), [tables]);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Create Cloze Card"
            containerClassName="w-screen h-screen max-w-none rounded-none flex flex-col bg-surface dark:bg-secondary-900 overflow-hidden"
        >
            <div className="flex flex-col md:flex-row h-full overflow-hidden">
                {/* LEFT PANE: Configuration - Reduced width to 4/12 (33%) */}
                <div className="w-full md:w-4/12 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-secondary-200 dark:border-secondary-700 space-y-6">
                    {/* Header Info */}
                    <div className="bg-secondary-50 dark:bg-secondary-800/50 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700/50">
                        <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">Target Phrase</span>
                        <p className="text-base font-semibold text-primary-600 dark:text-primary-400 mt-1 break-words">"{selectionText}"</p>
                    </div>

                    {/* Section 1: Destination */}
                    <div>
                        <label className="block text-xs font-bold text-text-subtle uppercase mb-2">Destination</label>
                        <select
                            value={targetTableId}
                            onChange={e => setTargetTableId(e.target.value)}
                            className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="new">Create New Table: "Reading Notes - {activeNote.title}"</option>
                            {readingNotesTables.length > 0 && <optgroup label="Reading Notes Tables">
                                {readingNotesTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </optgroup>}
                            {otherTables.length > 0 && <optgroup label="Other Tables">
                                {otherTables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </optgroup>}
                        </select>
                    </div>

                    {/* NEW Section: Target Scope */}
                    {occurrenceCount > 1 && (
                        <div className="animate-fadeIn">
                             <label className="block text-xs font-bold text-text-subtle uppercase mb-3">Target Scope</label>
                             <div className="flex flex-col gap-2">
                                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${scope === 'single' ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500 dark:bg-primary-900/20' : 'bg-surface border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800'}`}>
                                    <input type="radio" name="scope" value="single" checked={scope === 'single'} onChange={() => setScope('single')} className="mr-3 w-4 h-4 text-primary-600 focus:ring-primary-500" />
                                    <div className="flex-1">
                                        <span className="text-sm font-semibold block text-text-main dark:text-secondary-100">Selected Instance Only</span>
                                        <span className="text-xs text-text-subtle">Create 1 card for this specific highlight.</span>
                                    </div>
                                </label>
                                <label className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${scope === 'all' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500 dark:bg-purple-900/20' : 'bg-surface border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-800'}`}>
                                    <input type="radio" name="scope" value="all" checked={scope === 'all'} onChange={() => setScope('all')} className="mr-3 w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold block text-text-main dark:text-secondary-100">All Occurrences</span>
                                            <span className="text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full">Cloze++</span>
                                        </div>
                                        <span className="text-xs text-text-subtle">Auto-generate <strong>{occurrenceCount}</strong> cards from the whole note.</span>
                                    </div>
                                </label>
                             </div>
                        </div>
                    )}

                    {/* Section 2: Context Control */}
                    <div>
                        <label className="block text-xs font-bold text-text-subtle uppercase mb-3">Context Window</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-medium text-text-subtle mb-1">Sentences Before</label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setContextBefore(v => Math.max(0, v - 1))} className="h-8 w-8 p-0">-</Button>
                                    <span className="font-bold w-6 text-center text-sm">{contextBefore}</span>
                                    <Button size="sm" variant="secondary" onClick={() => setContextBefore(v => Math.min(3, v + 1))} className="h-8 w-8 p-0">+</Button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-[10px] font-medium text-text-subtle mb-1">Sentences After</label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setContextAfter(v => Math.max(0, v - 1))} className="h-8 w-8 p-0">-</Button>
                                    <span className="font-bold w-6 text-center text-sm">{contextAfter}</span>
                                    <Button size="sm" variant="secondary" onClick={() => setContextAfter(v => Math.min(3, v + 1))} className="h-8 w-8 p-0">+</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Options */}
                    <div>
                        <label className="block text-xs font-bold text-text-subtle uppercase mb-3">Options</label>
                        <div className="grid grid-cols-2 gap-3">
                             <div className="flex rounded-md bg-secondary-100 dark:bg-secondary-700 p-1">
                                <button onClick={() => setClozeType(StudyMode.ClozeTyping)} className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all ${clozeType === StudyMode.ClozeTyping ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>Typing</button>
                                <button onClick={() => setClozeType(StudyMode.ClozeMCQ)} className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all ${clozeType === StudyMode.ClozeMCQ ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>MCQ</button>
                            </div>
                            <div className="flex rounded-md bg-secondary-100 dark:bg-secondary-700 p-1">
                                <button onClick={() => setHintType('wordCount')} className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all ${hintType === 'wordCount' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>Hint</button>
                                <button onClick={() => setHintType('none')} className={`flex-1 text-xs font-semibold py-1.5 rounded transition-all ${hintType === 'none' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>None</button>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Extra Info */}
                    <div>
                        <label className="block text-xs font-bold text-text-subtle uppercase mb-2">Extra Notes (Optional)</label>
                        <textarea
                            value={extraInfo}
                            onChange={(e) => setExtraInfo(e.target.value)}
                            className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none h-20"
                            placeholder="Add grammar notes, translations, or usage tips..."
                        />
                    </div>
                </div>

                {/* RIGHT PANE: Live Preview - Increased width to 8/12 (66%) */}
                <div className="w-full md:w-8/12 bg-secondary-50 dark:bg-black/30 flex flex-col items-center justify-center p-4 md:p-8 relative">
                    <div className="absolute top-4 right-4 bg-white/80 dark:bg-secondary-800/80 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-text-subtle shadow-sm border border-secondary-200 dark:border-secondary-700 pointer-events-none z-10">
                        LIVE PREVIEW
                    </div>
                    
                    <div className="w-full h-full max-h-[600px] flex items-center justify-center">
                        <ClozePreviewPane 
                            contextBefore={textBefore}
                            contextAfter={textAfter}
                            clozeAnswer={selectionText}
                            clozeType={clozeType}
                            hintType={hintType}
                            extraInfo={extraInfo}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-3 flex-shrink-0">
                <Button variant="secondary" onClick={onClose} disabled={isCreating}>Cancel</Button>
                <Button onClick={handleCreate} disabled={isCreating} className="min-w-[140px] justify-center shadow-md">
                    {isCreating 
                        ? <><Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />Creating...</> 
                        : (scope === 'all' ? `Create ${occurrenceCount} Cards` : 'Create Card')
                    }
                </Button>
            </div>
        </Modal>
    );
};

export default ClozeCreationModal;
