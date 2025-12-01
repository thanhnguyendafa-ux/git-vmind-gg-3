import * as React from 'react';
import { AIPrompt, Column } from '../../../types';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';

interface BatchAiModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (selectedPromptIds: Set<string>) => void;
    fillablePrompts: { prompt: AIPrompt; fillableCells: { rowId: string; columnId: string; }[] }[];
    columns: Column[];
}
const BatchAiModal: React.FC<BatchAiModalProps> = ({ isOpen, onClose, onGenerate, fillablePrompts, columns }) => {
    const [selectedPromptIds, setSelectedPromptIds] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (isOpen) {
            setSelectedPromptIds(new Set(fillablePrompts.map(p => p.prompt.id)));
        }
    }, [isOpen, fillablePrompts]);
    
    const handleToggle = (promptId: string) => {
        const newSet = new Set(selectedPromptIds);
        if (newSet.has(promptId)) newSet.delete(promptId);
        else newSet.add(promptId);
        setSelectedPromptIds(newSet);
    };

    const totalSelectedToFill = fillablePrompts
        .filter(p => selectedPromptIds.has(p.prompt.id))
        .reduce((sum, p) => sum + p.fillableCells.length, 0);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Batch AI Generation">
            <div className="p-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Review the available AI actions below. Select which ones you'd like to run. This will process up to 5 empty cells per generation.</p>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                    {fillablePrompts.map(({ prompt, fillableCells }) => {
                        const targetColumnName = columns.find(c => c.id === prompt.targetColumnId)?.name || '...';
                        const isSelected = selectedPromptIds.has(prompt.id);
                        return (
                            <div key={prompt.id} onClick={() => handleToggle(prompt.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50'}`}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-4">
                                        <p className="font-semibold text-slate-800 dark:text-white">{prompt.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            Fills the <strong className="font-medium text-slate-600 dark:text-slate-300">{targetColumnName}</strong> column for <strong className="font-medium text-slate-600 dark:text-slate-300">{fillableCells.length}</strong> empty cells.
                                        </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-1 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                        {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md border">Cancel</button>
                    <button onClick={() => onGenerate(selectedPromptIds)} disabled={totalSelectedToFill === 0} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50">
                        Generate ({Math.min(5, totalSelectedToFill)} cells)
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default BatchAiModal;