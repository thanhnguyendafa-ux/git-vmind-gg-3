
import React, { useMemo } from 'react';
import { ConfidenceProgress } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

interface NewArrivalsModalProps {
    progress: ConfidenceProgress;
    onClose: () => void;
}

const NewArrivalsModal: React.FC<NewArrivalsModalProps> = ({ progress, onClose }) => {
    const tables = useTableStore(state => state.tables);
    const clearNewWordCount = useSessionDataStore(state => state.clearNewWordCount);

    const newWords = useMemo(() => {
        const count = progress.newWordCount || 0;
        if (count === 0) return [];
        
        // New words are appended to the end of the queue
        const newIds = progress.queue.slice(-count);
        const words: { id: string; term: string; tableName: string }[] = [];

        // Get tables relevant to this progress to optimize lookup
        const relevantTables = tables.filter(t => progress.tableIds.includes(t.id));
        
        // Iterate in reverse to show newest first
        [...newIds].reverse().forEach(id => {
             for (const table of relevantTables) {
                 const row = table.rows.find(r => r.id === id);
                 if (row) {
                     // Use the first column value as a representative term
                     const term = (Object.values(row.cols)[0] as string) || 'Unknown';
                     words.push({ id, term, tableName: table.name });
                     break;
                 }
             }
        });
        
        return words;
    }, [progress, tables]);

    const handleClose = () => {
        clearNewWordCount(progress.id);
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={handleClose} title="New Arrivals">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-4 text-sm text-text-subtle">
                    <Icon name="sparkles" className="w-4 h-4 text-warning-500" />
                    <p>These {newWords.length} cards have been added to your queue.</p>
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2 mb-6 bg-secondary-100 dark:bg-secondary-900/50 p-2 rounded-md border border-secondary-200 dark:border-secondary-700 custom-scrollbar">
                    {newWords.map(word => (
                        <div key={word.id} className="p-2 bg-surface dark:bg-secondary-800 rounded shadow-sm border border-secondary-200/50 dark:border-secondary-700 flex justify-between items-center">
                            <span className="font-medium text-text-main dark:text-secondary-100 truncate flex-1 pr-4">{word.term}</span>
                            <span className="text-xs text-text-subtle truncate max-w-[40%]">{word.tableName}</span>
                        </div>
                    ))}
                    {newWords.length === 0 && (
                         <p className="text-center text-text-subtle text-xs py-4">No details found for these items.</p>
                    )}
                </div>
                
                <div className="flex justify-end">
                    <Button onClick={handleClose}>Got it</Button>
                </div>
            </div>
        </Modal>
    );
};

export default NewArrivalsModal;
