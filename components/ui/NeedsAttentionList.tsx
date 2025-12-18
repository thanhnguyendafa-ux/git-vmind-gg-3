import * as React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { VmindSyncEngine, getSyncActionDetails } from '../../services/VmindSyncEngine';
import Icon from './Icon';
import { Button } from './Button';
import { SyncAction, VocabRow, Table, SyncLogEntry } from '../../types';
import WordDetailModal from '../../features/tables/WordDetailModal';

const ActionItem: React.FC<{ 
    action: SyncAction; 
    onEdit?: (action: SyncAction) => void;
}> = ({ action, onEdit }) => {
    const engine = VmindSyncEngine.getInstance();
    const [isProcessing, setIsProcessing] = React.useState(false);

    const handleRetry = async () => {
        setIsProcessing(true);
        await engine.retryItem(action.id);
        // State will update via store broadcast, no need to setIsProcessing(false)
    };

    const handleDiscard = async () => {
        setIsProcessing(true);
        await engine.discardItem(action.id);
    };

    const description = getSyncActionDetails(action);
    const canEdit = action.type === 'UPSERT_ROW';
    const isFailed = action.status === 'failed';
    
    return (
        <div className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${isFailed ? 'bg-error-50 border-error-200 dark:bg-error-900/10 dark:border-error-800' : 'bg-secondary-50 border-secondary-200 dark:bg-secondary-800 dark:border-secondary-700'}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-text-main dark:text-secondary-100 truncate" title={description}>{description}</span>
                    {action.retries > 0 && !isFailed && <span className="text-xs bg-warning-100 text-warning-700 px-1.5 rounded">Retry {action.retries}</span>}
                </div>
                {action.lastError ? (
                    <p className="text-xs text-error-600 dark:text-error-400 mt-0.5 truncate" title={action.lastError}>{action.lastError}</p>
                ) : (
                    <p className="text-xs text-text-subtle mt-0.5 capitalize">{action.status}</p>
                )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {canEdit && isFailed && onEdit && (
                    <Button size="sm" variant="secondary" onClick={() => onEdit(action)} disabled={isProcessing} className="text-xs flex items-center gap-1">
                        <Icon name="pencil" className="w-3 h-3" /> Edit
                    </Button>
                )}
                {isFailed && (
                    <Button size="sm" onClick={handleRetry} disabled={isProcessing} className="text-xs">
                        Retry
                    </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isProcessing} className="text-secondary-400 hover:text-error-500" title="Discard changes">
                    <Icon name="trash" className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};

const LogItem: React.FC<{ log: SyncLogEntry }> = ({ log }) => {
    const isSuccess = log.status === 'success';
    const timeString = new Date(log.timestamp).toLocaleTimeString();

    return (
        <div className={`p-2 rounded-md flex items-start gap-3 text-sm border-b border-secondary-100 dark:border-secondary-700/50 last:border-0`}>
            <div className={`mt-0.5 ${isSuccess ? 'text-success-500' : 'text-error-500'}`}>
                <Icon name={isSuccess ? 'check-circle' : 'error-circle'} className="w-4 h-4" />
            </div>
            <div className="flex-1">
                 <div className="flex justify-between">
                    <span className="font-semibold text-text-main dark:text-secondary-200 text-xs">{log.actionType}</span>
                    <span className="text-xs text-text-subtle font-mono">{timeString}</span>
                </div>
                <p className="text-xs text-text-subtle break-words">{log.details}</p>
            </div>
        </div>
    );
};

export const NeedsAttentionList: React.FC = () => {
    const { syncQueue, syncLogs } = useUIStore(state => ({ syncQueue: state.syncQueue, syncLogs: state.syncLogs }));
    const { tables } = useTableStore();
    
    const [activeTab, setActiveTab] = React.useState<'queue' | 'history'>('queue');
    const [editingAction, setEditingAction] = React.useState<SyncAction | null>(null);
    const [editingTable, setEditingTable] = React.useState<Table | null>(null);

    const sortedQueue = React.useMemo(() => {
        return [...syncQueue].sort((a, b) => {
            if (a.status === 'failed' && b.status !== 'failed') return -1;
            if (a.status !== 'failed' && b.status === 'failed') return 1;
            return b.timestamp - a.timestamp;
        });
    }, [syncQueue]);

    const handleEditClick = (action: SyncAction) => {
        if (action.type === 'UPSERT_ROW' && action.payload?.tableId) {
            const table = tables.find(t => t.id === action.payload.tableId);
            if (table) {
                setEditingTable(table);
                setEditingAction(action);
            }
        }
    };

    const handleSaveEdit = async (updatedRow: VocabRow) => {
        if (!editingAction) return false;
        
        const engine = VmindSyncEngine.getInstance();
        
        const newPayload = { ...editingAction.payload, row: updatedRow };

        await engine.updatePendingAction(editingAction.id, newPayload);
        
        setEditingAction(null);
        setEditingTable(null);
        return true;
    };

    return (
        <>
            <div className="flex space-x-4 border-b border-secondary-200 dark:border-secondary-700 mb-4">
                <button 
                    onClick={() => setActiveTab('queue')}
                    className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'queue' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                >
                    Queue ({sortedQueue.length})
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-2 text-sm font-semibold transition-colors ${activeTab === 'history' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                >
                    History
                </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeTab === 'queue' ? (
                    sortedQueue.length === 0 ? (
                        <div className="text-center py-8 text-text-subtle">
                            <Icon name="check-circle" className="w-12 h-12 mx-auto mb-2 text-success-500" />
                            <p>All changes synced.</p>
                        </div>
                    ) : (
                        sortedQueue.map(action => (
                            <ActionItem key={action.id} action={action} onEdit={handleEditClick} />
                        ))
                    )
                ) : (
                    syncLogs.length === 0 ? (
                        <div className="text-center py-8 text-text-subtle">
                             <p>No sync history yet.</p>
                        </div>
                    ) : (
                        syncLogs.map(log => <LogItem key={log.id} log={log} />)
                    )
                )}
            </div>

            {editingAction && editingTable && (
                <WordDetailModal
                    isOpen={true}
                    row={editingAction.payload.row}
                    table={editingTable}
                    columns={editingTable.columns}
                    aiPrompts={editingTable.aiPrompts}
                    imageConfig={editingTable.imageConfig}
                    audioConfig={editingTable.audioConfig}
                    onClose={() => { setEditingAction(null); setEditingTable(null); }}
                    onSave={handleSaveEdit}
                    onDelete={() => {}}
                    onConfigureAI={() => {}}
                />
            )}
        </>
    );
};
