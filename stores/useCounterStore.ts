
import { create } from 'zustand';
import { Counter, CounterTargetType } from '../types';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useUserStore } from './useUserStore';

interface CounterState {
  counters: Counter[];
  
  /**
   * Creates a new counter for a specific target.
   * @param targetId The ID of the object being tracked.
   * @param targetType The type of object.
   * @param name Display name for the counter.
   * @param thresholdDays Optional custom threshold for inactivity warning. Defaults to 3.
   */
  addCounter: (targetId: string, targetType: CounterTargetType, name: string, thresholdDays?: number) => void;
  
  /**
   * Increments the count and updates the last interaction timestamp.
   * Only works if the counter exists and is active.
   * @param targetId The ID of the tracked object.
   */
  increment: (targetId: string) => void;
  
  /**
   * Toggles the active status of a counter.
   * Paused counters do not increment but retain their history.
   * @param targetId The ID of the tracked object.
   */
  toggleTracking: (targetId: string) => void;
  
  /**
   * Permanently removes a counter.
   * @param id The unique ID of the counter (not targetId).
   */
  removeCounter: (id: string) => void;
  
  /**
   * Retrieves a counter by its target ID.
   * @param targetId The ID of the tracked object.
   */
  getCounter: (targetId: string) => Counter | undefined;

  /**
   * Bulk set counters (useful for hydration or sync).
   */
  setCounters: (counters: Counter[]) => void;
}

export const useCounterStore = create<CounterState>()((set, get) => ({
  counters: [],

  addCounter: (targetId, targetType, name, thresholdDays = 3) => {
    const { counters } = get();
    // Prevent duplicates for the same target
    if (counters.some((c) => c.targetId === targetId)) {
        return; 
    }
    
    const newCounter: Counter = {
      id: crypto.randomUUID(),
      targetId,
      targetType,
      name,
      count: 0,
      lastInteraction: Date.now(),
      thresholdDays,
      isActive: true,
    };
    
    set({ counters: [...counters, newCounter] });

    const { session, isGuest } = useUserStore.getState();
    if (!isGuest && session) {
        VmindSyncEngine.getInstance().push('UPSERT_COUNTER', { counter: newCounter }, session.user.id);
    }
  },

  increment: (targetId) => {
    const { counters } = get();
    let updatedCounter: Counter | null = null;

    const newCounters = counters.map((c) => {
        if (c.targetId === targetId && c.isActive) {
            updatedCounter = { 
                ...c, 
                count: c.count + 1, 
                lastInteraction: Date.now() 
            };
            return updatedCounter;
        }
        return c;
    });
    
    if (updatedCounter) {
        set({ counters: newCounters });
        
        const { session, isGuest } = useUserStore.getState();
        if (!isGuest && session) {
            // In a production app we might debounce this, but for this phase direct push is acceptable
            VmindSyncEngine.getInstance().push('UPSERT_COUNTER', { counter: updatedCounter }, session.user.id);
        }
    }
  },

  toggleTracking: (targetId) => {
    const { counters } = get();
    let updatedCounter: Counter | null = null;

    const newCounters = counters.map((c) => {
        if (c.targetId === targetId) {
            updatedCounter = { ...c, isActive: !c.isActive };
            return updatedCounter;
        }
        return c;
    });

    if (updatedCounter) {
        set({ counters: newCounters });

        const { session, isGuest } = useUserStore.getState();
        if (!isGuest && session) {
             VmindSyncEngine.getInstance().push('UPSERT_COUNTER', { counter: updatedCounter }, session.user.id);
        }
    }
  },

  removeCounter: (id) => {
    set((state) => ({
      counters: state.counters.filter((c) => c.id !== id),
    }));

    const { session, isGuest } = useUserStore.getState();
    if (!isGuest && session) {
        VmindSyncEngine.getInstance().push('DELETE_COUNTER', { counterId: id }, session.user.id);
    }
  },

  getCounter: (targetId) => {
    return get().counters.find((c) => c.targetId === targetId);
  },

  setCounters: (counters) => set({ counters }),
}));
