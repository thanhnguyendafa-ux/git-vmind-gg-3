
import React from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { HealthCheckIssue } from '../utils/sessionHealthCheck';

interface ConfidenceHealthReportModalProps {
    issues: HealthCheckIssue[];
    onAutoSkip: () => void;
    onClose: () => void; // Usually "Go Back" to menu
}

const ConfidenceHealthReportModal: React.FC<ConfidenceHealthReportModalProps> = ({
    issues,
    onAutoSkip,
    onClose
}) => {
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Pre-Flight Check: Issues Found"
        >
            <div className="p-6">
                <div className="mb-6 flex gap-4 items-start bg-orange-500/10 p-4 rounded-lg border border-orange-500/20">
                    <Icon name="exclamation-circle" className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1">
                            Missing Data Detected
                        </h4>
                        <p className="text-sm text-text-subtle leading-relaxed">
                            We found <b>{issues.length}</b> cards in your queue that are missing required answers or configurations.
                            These will cause the session to stall if not skipped.
                        </p>
                    </div>
                </div>

                <div className="max-h-60 overflow-y-auto mb-6 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-surface dark:bg-secondary-800">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary-50 dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700 sticky top-0">
                            <tr>
                                <th className="py-2 px-3 font-medium text-text-subtle">Row ID</th>
                                <th className="py-2 px-3 font-medium text-text-subtle">Term / Content</th>
                                <th className="py-2 px-3 font-medium text-text-subtle">Issue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                            {issues.map(issue => (
                                <tr key={issue.rowId}>
                                    <td className="py-2 px-3 font-mono text-xs text-text-subtle">
                                        #{issue.rowId.slice(0, 4)}
                                    </td>
                                    <td className="py-2 px-3 text-text-main dark:text-secondary-100 font-medium truncate max-w-[150px]" title={issue.term}>
                                        {issue.term}
                                    </td>
                                    <td className="py-2 px-3 text-error-500 text-xs">
                                        {issue.reason === 'missing_answer' ? 'Missing Answer' : 'Unknown Error'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        onClick={onAutoSkip}
                        className="w-full justify-center bg-orange-600 hover:bg-orange-700 text-white"
                        size="lg"
                    >
                        <Icon name="trash" className="w-4 h-4 mr-2" />
                        Auto-Skip {issues.length} Cards & Start
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="w-full justify-center"
                    >
                        Go Back to Menu
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfidenceHealthReportModal;
