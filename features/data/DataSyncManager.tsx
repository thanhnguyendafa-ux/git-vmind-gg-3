
import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../../stores/useUIStore';
import { useUserStore } from '../../stores/useUserStore';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

const DataSyncManager: React.FC = () => {
    const { setPullData } = useUIStore();
    const { session } = useUserStore();
    const queryClient = useQueryClient();

    useEffect(() => {
        // Define the pull function
        const pullData = async () => {
            if (!session?.user.id) return;
            
            const engine = VmindSyncEngine.getInstance();
            
            // 1. Lock the Sync Engine.
            // This prevents any new Push actions from being added to the queue
            // while we are fetching fresh data. This prevents "Sync Race" conditions.
            engine.suspend();
            
            try {
                // PHASE 3 FIX: Clear Queue before Pulling
                // This ensures we don't have stale pending actions conflicting with fresh server data.
                // Since this is a "Pull" or "Force Sync" action, the user intends to align with the server.
                await engine.clearQueue();

                // 2. Invalidate the 'userData' query. 
                // This triggers the useQuery hook in AppContent.tsx to re-fetch data from Supabase.
                await queryClient.invalidateQueries({ queryKey: ['userData', session.user.id] });

            } finally {
                // 3. Unlock the Sync Engine.
                engine.unsuspend();
            }
        };

        // Register the function in the UI store so the Header button can use it
        setPullData(pullData);

        // Cleanup: Remove the function when this component unmounts (e.g. logout)
        return () => {
            setPullData(async () => {}); 
        };
    }, [session, queryClient, setPullData]);

    return null; // This component has no UI, it just runs logic
};

export default DataSyncManager;
