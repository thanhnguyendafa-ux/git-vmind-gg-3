
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
                // 2. Invalidate the 'userData' query. 
                // This triggers the useQuery hook in AppContent.tsx to re-fetch data from Supabase.
                await queryClient.invalidateQueries({ queryKey: ['userData', session.user.id] });

                // 3. CRITICAL: Clear the Push Queue.
                // Since we just pulled the source of truth from the server, any pending local 
                // changes in the queue are likely stale or conflicting. We wipe them to start fresh.
                // This prevents the "Ghost Push" issue where old actions overwrite the pulled data.
                await engine.clearQueue();
            
            } finally {
                // 4. Unlock the Sync Engine.
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
