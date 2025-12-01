import * as React from 'react';
import { Note, Table, StudyMode } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import Popover from '../../../components/ui/Popover';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';

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
    const [isCreating, setIsCreating] = React.useState(false);

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
                    hint: hintType
                }
            });
            showToast('Cloze card created successfully!', 'success');
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
        <Popover isOpen={isOpen} setIsOpen={onClose} trigger={<></>} contentClassName="max-w-lg w-full">
            <div className="flex flex-col">
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-lg font-bold text-text-main dark:text-secondary-100">Create Cloze Card</h3>
                    <p className="text-sm text-text-subtle mt-1">From: <span className="font-semibold">"{selectionText}"</span></p>
                </div>
                <div className="p-4 space-y-6 flex-1 overflow-y-auto">
                    {/* Section 1: Destination */}
                    <div>
                        <label className="block text-sm font-semibold text-text-subtle mb-2">1. Destination</label>
                        <select
                            value={targetTableId}
                            onChange={e => setTargetTableId(e.target.value)}
                            className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm text-text-main dark:text-secondary-100"
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

                    {/* Section 2: Context Control */}
                    <div>
                        <label className="block text-sm font-semibold text-text-subtle mb-2">2. Context</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-text-subtle mb-1">Sentences Before</label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setContextBefore(v => Math.max(0, v - 1))}>-</Button>
                                    <span className="font-bold w-8 text-center">{contextBefore}</span>
                                    <Button size="sm" variant="secondary" onClick={() => setContextBefore(v => Math.min(3, v + 1))}>+</Button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-xs font-medium text-text-subtle mb-1">Sentences After</label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="secondary" onClick={() => setContextAfter(v => Math.max(0, v - 1))}>-</Button>
                                    <span className="font-bold w-8 text-center">{contextAfter}</span>
                                    <Button size="sm" variant="secondary" onClick={() => setContextAfter(v => Math.min(3, v + 1))}>+</Button>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-text-subtle mt-2 text-center bg-secondary-100 dark:bg-secondary-900/50 p-2 rounded">
                            Preview: +{contextBefore} (cloze) +{contextAfter}
                        </p>
                    </div>

                    {/* Section 3: Cloze Type & Hint */}
                    <div>
                        <label className="block text-sm font-semibold text-text-subtle mb-2">3. Options</label>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-text-subtle mb-1">Type</label>
                                <div className="flex rounded-md bg-secondary-100 dark:bg-secondary-700 p-1">
                                    <Button size="sm" variant={clozeType === StudyMode.ClozeTyping ? 'primary' : 'ghost'} onClick={() => setClozeType(StudyMode.ClozeTyping)} className="flex-1">Typing</Button>
                                    <Button size="sm" variant={clozeType === StudyMode.ClozeMCQ ? 'primary' : 'ghost'} onClick={() => setClozeType(StudyMode.ClozeMCQ)} className="flex-1">MCQ</Button>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-text-subtle mb-1">Hint</label>
                                <div className="flex rounded-md bg-secondary-100 dark:bg-secondary-700 p-1">
                                    <Button size="sm" variant={hintType === 'wordCount' ? 'primary' : 'ghost'} onClick={() => setHintType('wordCount')} className="flex-1">{' {5 words}'}</Button>
                                    <Button size="sm" variant={hintType === 'none' ? 'primary' : 'ghost'} onClick={() => setHintType('none')} className="flex-1">Hidden</Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 flex justify-end">
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating ? <><Icon name="spinner" className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Cloze Card'}
                    </Button>
                </div>
            </div>
        </Popover>
    );
};

export default ClozeCreationModal;
