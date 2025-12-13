
import * as React from 'react';
import { ConfidenceProgress, FlashcardStatus } from '../../../types';
import Modal from '../../../components/ui/Modal';
import PieChart from '../../../components/ui/PieChart';

interface ConfidenceProgressStatsModalProps {
    progress: ConfidenceProgress;
    onClose: () => void;
}

const ConfidenceProgressStatsModal: React.FC<ConfidenceProgressStatsModalProps> = ({ progress, onClose }) => {
    
    // Calculate stats dynamically based on the LOCAL STATE of the progress (cardStates).
    // This ensures the chart reflects this specific session's history, not the global card status.
    const stats = React.useMemo(() => {
        const counts = {
            [FlashcardStatus.New]: 0,
            [FlashcardStatus.Again]: 0,
            [FlashcardStatus.Hard]: 0,
            [FlashcardStatus.Good]: 0,
            [FlashcardStatus.Easy]: 0,
            [FlashcardStatus.Perfect]: 0,
            [FlashcardStatus.Superb]: 0,
        };

        // Use the queue to determine which cards are in this session
        progress.queue.forEach(rowId => {
            // PRIORITY: Look at the persisted state for THIS progress.
            // If the card hasn't been touched in this progress yet, it is 'New',
            // regardless of its status in other sessions or the global table.
            const localStatus = progress.cardStates?.[rowId] as FlashcardStatus | undefined;
            const status = localStatus || FlashcardStatus.New;
            
            counts[status] = (counts[status] || 0) + 1;
        });
        return counts;
    }, [progress]);

    const pieData = [
        { label: 'New', value: stats[FlashcardStatus.New], color: '#9ca3af' }, // gray-400
        { label: 'Again', value: stats[FlashcardStatus.Again], color: '#ef4444' }, // Red-500
        { label: 'Hard', value: stats[FlashcardStatus.Hard], color: '#f97316' }, // Orange-500
        { label: 'Good', value: stats[FlashcardStatus.Good], color: '#eab308' }, // Yellow-500 (Fixed color match)
        { label: 'Easy', value: stats[FlashcardStatus.Easy], color: '#22c55e' }, // Green-500
        { label: 'Perfect', value: stats[FlashcardStatus.Perfect], color: '#06b6d4' }, // Cyan-500 (Fixed color match)
        { label: 'Superb', value: stats[FlashcardStatus.Superb], color: '#a855f7' }, // Purple-500 (Fixed color match)
    ];

    return (
        <Modal isOpen={true} onClose={onClose} title={`Stats: ${progress.name}`}>
            <div className="p-6 flex flex-col items-center">
                <PieChart 
                    data={pieData} 
                    total={progress.queue.length} 
                    centerValue={progress.queue.length.toString()} 
                    centerLabel="Total Cards" 
                    isDonut={true}
                />
                
                <div className="w-full mt-8 grid grid-cols-2 gap-4">
                     {pieData.map(item => (
                        <div key={item.label} className="flex items-center justify-between p-2 rounded-md bg-secondary-50 dark:bg-secondary-800/50">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                <span className="text-sm font-medium text-text-main dark:text-secondary-200">{item.label}</span>
                            </div>
                            <span className="font-bold text-text-main dark:text-secondary-100">{item.value}</span>
                        </div>
                     ))}
                </div>
            </div>
        </Modal>
    );
};

export default ConfidenceProgressStatsModal;
