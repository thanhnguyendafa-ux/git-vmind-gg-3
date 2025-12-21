import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/useUIStore';

export const SyncGuard: React.FC = () => {
    const {
        isBlockingOverlayVisible,
        resolveGlobalAction,
        pendingAction,
        syncStatus,
        syncQueue
    } = useUIStore();

    // --- Global Sync Completion Listener ---
    useEffect(() => {
        // If there is a pending action (like navigation) and the sync queue has cleared
        // and status is idle/saved, execute the action.
        if (pendingAction && isBlockingOverlayVisible) {
            const isQueueEmpty = syncQueue.length === 0;
            const isIdle = syncStatus === 'idle' || syncStatus === 'saved';

            if (isQueueEmpty && isIdle) {
                resolveGlobalAction();
            }
        }
    }, [syncStatus, syncQueue, pendingAction, isBlockingOverlayVisible, resolveGlobalAction]);

    return null; // This component renders nothing, just handles side effects
};
