import * as React from 'react';
import { AIPrompt, Column } from '../../../types';
import Modal from '../../../components/ui/Modal';

interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: AIPrompt) => void;
  onDelete: (promptId: string) => void;
  targetColumn: Column | null;
  tableColumns: Column[];
  promptToEdit: AIPrompt | null;
}

const AIPromptModal: React.FC<AIPromptModalProps> = ({ isOpen, onClose, onSave, onDelete, targetColumn, tableColumns, promptToEdit }) => {
    const [name, setName] = React.useState('');
    const [prompt, setPrompt] = React.useState('');
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const usedColumnNames = React.useMemo(() => {
        const matches = prompt.match(/{([^}]+)}/g) || [];
        return new Set(matches.map(m => m.substring(1, m.length - 1)));
    }, [prompt]);

    React.useEffect(() => {
        if (isOpen) {
            if (promptToEdit) {
                setName(promptToEdit.name);
                setPrompt(promptToEdit.prompt);
            } else if (targetColumn) {
                setName(`Generate ${targetColumn.name}`);
                setPrompt('');
            }
        }
    }, [isOpen, promptToEdit, targetColumn]);

    if (!isOpen || !targetColumn) return null;

    const handleSave = () => {
        const finalSourceColumnIds = tableColumns.filter(col => usedColumnNames.has(col.name)).map(col => col.id);
        onSave({
            id: promptToEdit?.id || crypto.randomUUID(),
            name: name.trim() || `Generate ${targetColumn.name}`,
            prompt,
            sourceColumnIds: finalSourceColumnIds,
            targetColumnId: targetColumn.id,
        });
        onClose();
    };
    
    const handleDelete = () => { if (promptToEdit) { onDelete(promptToEdit.id); onClose(); } };

    const handleInsertPlaceholder = (colName: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const placeholder = `{${colName}}`;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText = textarea.value.substring(0, start) + placeholder + textarea.value.substring(end);
        setPrompt(newText);
        setTimeout(() => { textarea.focus(); const newCursorPosition = start + placeholder.length; textarea.selectionStart = textarea.selectionEnd = newCursorPosition; }, 0);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`AI Prompt for "${targetColumn.name}"`}>
            <div className="p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prompt Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Prompt Template</label>
                    <textarea ref={textareaRef} value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm" placeholder="e.g., Write an example sentence for the word: {Word}" />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click a column below to insert a placeholder.</p>
                </div>
                <div>
                    <h4 className="font-medium text-slate-700 dark:text-slate-300 text-sm mb-2">Click to Insert Source Column</h4>
                    <div className="flex flex-wrap gap-2">
                        {tableColumns.filter(c => c.id !== targetColumn.id).map(col => {
                            const isUsed = usedColumnNames.has(col.name);
                            return <button key={col.id} onClick={() => handleInsertPlaceholder(col.name)} className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all duration-200 ease-out ${isUsed ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border-slate-300 dark:border-slate-600 hover:border-slate-400'}`}>{`{${col.name}}`}</button>;
                        })}
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>{promptToEdit && <button onClick={handleDelete} className="text-red-600 dark:text-red-500 font-semibold text-sm hover:underline">Delete Prompt</button>}</div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md border">Cancel</button>
                        <button onClick={handleSave} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Save Prompt</button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AIPromptModal;