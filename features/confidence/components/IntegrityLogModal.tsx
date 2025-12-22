import React from 'react';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { useUIStore } from '../../../stores/useUIStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { Screen } from '../../../types';

export interface IntegrityLogEntry {
    rowId: string;
    term: string;
    reason: string;
}

interface IntegrityLogModalProps {
    entries: IntegrityLogEntry[];
    onClose: () => void;
}

const IntegrityLogModal: React.FC<IntegrityLogModalProps> = ({ entries, onClose }) => {
    const { setIntegrityFilter } = useUIStore();
    const activeConfidenceSession = useSessionStore(state => state.activeConfidenceSession);
    const handleSelectTable = useSessionStore(state => state.handleSelectTable);

    const handleFixInTable = () => {
        if (!activeConfidenceSession || !activeConfidenceSession.tableIds[0]) return;

        // Use the first table of the session as target
        const targetTableId = activeConfidenceSession.tableIds[0];

        setIntegrityFilter({
            tableId: targetTableId,
            rowIds: entries.map(e => e.rowId)
        });

        // Navigate to Table Detail screen
        handleSelectTable(targetTableId);
        onClose();
    };

    if (entries.length === 0) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Integrity Log">
                <div className="p-6 text-center">
                    <Icon name="checkmark-circle" className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-2">
                        All Clear!
                    </h3>
                    <p className="text-text-subtle text-sm">
                        No data integrity issues found in this session.
                    </p>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={true} onClose={onClose} title="Integrity Log">
            <div className="p-6">
                <div className="mb-4 flex gap-3 items-start bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                    <Icon name="information-circle" className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            {entries.length} cards silently skipped
                        </h4>
                        <p className="text-sm text-text-subtle leading-relaxed">
                            These cards were automatically removed from your queue during pre-flight check to ensure smooth learning. Fix the data in your Table, then re-add them.
                        </p>
                    </div>
                </div>

                <div className="max-h-72 overflow-y-auto border border-secondary-200 dark:border-secondary-700 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary-50 dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700 sticky top-0">
                            <tr>
                                <th className="py-2 px-3 text-left font-medium text-text-subtle">Card</th>
                                <th className="py-2 px-3 text-left font-medium text-text-subtle">Issue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                            {entries.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors">
                                    <td className="py-2 px-3 text-text-main dark:text-secondary-100 font-medium">
                                        {entry.term}
                                    </td>
                                    <td className="py-2 px-3 text-error-500 text-xs">
                                        {entry.reason}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 flex justify-between items-center">
                    <Button onClick={handleFixInTable} variant="primary" className="flex items-center gap-2">
                        <Icon name="external-link" className="w-4 h-4" />
                        Fix all in Table
                    </Button>
                    <Button onClick={onClose} variant="secondary">
                        Close
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default IntegrityLogModal;
