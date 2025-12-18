
import { useEffect, useMemo } from 'react';
import { VmindSyncEngine } from '../../../services/VmindSyncEngine';
import { useUIStore } from '../../../stores/useUIStore';

export const useTableTransaction = (tableId: string) => {
    const syncQueue = useUIStore(state => state.syncQueue);

    useEffect(() => {
        // Start Batch Mode on mount
        VmindSyncEngine.getInstance().startBatchMode();
        
        return () => {
            // End Batch Mode on unmount (failsafe flush)
            VmindSyncEngine.getInstance().endBatchMode();
        };
    }, []);

    const handleManualSave = () => {
         // Flush current batch to server
         VmindSyncEngine.getInstance().endBatchMode();
    };

    const pendingChangeCount = useMemo(() => {
        return syncQueue.filter(action => {
            const isRowAction = (action.type === 'UPSERT_ROW' || action.type === 'DELETE_ROWS') && action.payload?.tableId === tableId;
            const isTableAction = action.type === 'UPSERT_TABLE' && action.payload?.tableData?.id === tableId;
            return isRowAction || isTableAction;
        }).length;
    }, [syncQueue, tableId]);

    return {
        handleManualSave,
        pendingChangeCount
    };
};
