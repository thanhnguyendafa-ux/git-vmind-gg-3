

// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
import { useUIStore } from '../../stores/useUIStore';
import { supabase } from '../../services/supabaseClient';
import { SyncAction } from '../../types';

// Mock test globals
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var afterEach: (fn: () => void) => void;
declare var vi: any;

// --- Mocks ---

// Mock Supabase client
vi.mock('../../services/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(),
      delete: vi.fn(() => ({
        in: vi.fn(),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
            select: vi.fn(() => ({
                single: vi.fn()
            }))
        }))
      })),
    })),
    rpc: vi.fn(),
  },
}));

// Mock Zustand UI store
const setSyncStatusMock = vi.fn();
const setSyncQueueMock = vi.fn();
const showToastMock = vi.fn();
vi.mock('../../stores/useUIStore', () => ({
  useUIStore: {
    getState: () => ({
      setSyncStatus: setSyncStatusMock,
      setSyncQueue: setSyncQueueMock,
      showToast: showToastMock,
    }),
  },
}));

// In-memory IndexedDB mock
const dbStore: { [key: string]: SyncAction } = {};
const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request: any = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
      result: {
        transaction: () => ({
          objectStore: () => ({
            put: (item: SyncAction) => { dbStore[item.id] = item; },
            delete: (id: string) => { delete dbStore[id]; },
            getAll: () => ({
              onsuccess: null,
              result: Object.values(dbStore),
            }),
            count: () => ({
              onsuccess: null,
              result: Object.keys(dbStore).length,
            })
          }),
          oncomplete: null,
        }),
      },
    };
    // Simulate async behavior
    setTimeout(() => request.onsuccess && request.onsuccess({ target: request }), 0);
    return request;
  }),
};
(globalThis as any).indexedDB = mockIndexedDB;


describe('VmindSyncEngine', () => {

  beforeEach(() => {
    // Reset engine instance to get a fresh one for each test
    (VmindSyncEngine as any).instance = undefined;
    
    // Clear mocks
    vi.clearAllMocks();
    Object.keys(dbStore).forEach(key => delete dbStore[key]);
    
    // Use fake timers to control retry logic
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('TC_SYNC_01: should add an action to the queue and process it successfully', async () => {
    // Arrange
    vi.mocked(supabase.from('vocab_rows').upsert).mockResolvedValueOnce({ error: null } as any);
    const engine = VmindSyncEngine.getInstance();
    
    // Act
    await act(async () => {
      engine.push('UPSERT_ROW', { tableId: 't1', row: { id: 'r1', cols: {}, stats: {} } }, 'user1');
      await vi.runAllTimersAsync();
    });

    // Assert
    expect(supabase.from('vocab_rows').upsert).toHaveBeenCalledTimes(1);
    expect(Object.keys(dbStore).length).toBe(0); // Queue should be empty
    expect(setSyncStatusMock).toHaveBeenCalledWith('saving');
    expect(setSyncStatusMock).toHaveBeenCalledWith('saved');
    expect(setSyncStatusMock).toHaveBeenCalledWith('idle');
  });

  it('TC_SYNC_02: should retry a failed action with exponential backoff', async () => {
    // Arrange
    vi.mocked(supabase.from('vocab_rows').upsert)
      .mockRejectedValueOnce(new Error('Network Error')) // First call fails
      .mockResolvedValueOnce({ error: null } as any);    // Second call succeeds
    const engine = VmindSyncEngine.getInstance();

    // Act
    await act(async () => {
      engine.push('UPSERT_ROW', { tableId: 't1', row: { id: 'r1', cols: {}, stats: {} } }, 'user1');
      await vi.advanceTimersByTimeAsync(100); // Allow initial process
    });
    
    // Assert after first failure
    expect(supabase.from('vocab_rows').upsert).toHaveBeenCalledTimes(1);
    const actionInDB = Object.values(dbStore)[0];
    expect(actionInDB.retries).toBe(1);

    // Act: Advance time past the first retry delay (2^1 * 1000 = 2s)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });

    // Assert after successful retry
    expect(supabase.from('vocab_rows').upsert).toHaveBeenCalledTimes(2);
    expect(Object.keys(dbStore).length).toBe(0);
  });

  it('TC_SYNC_03: should mark an action as "failed" and pause after max retries', async () => {
    // Arrange
    vi.mocked(supabase.from('vocab_rows').upsert).mockRejectedValue(new Error('Persistent Error'));
    const engine = VmindSyncEngine.getInstance();
    
    // Act
    await act(async () => {
      engine.push('UPSERT_ROW', { tableId: 't1', row: { id: 'r1-fail', cols: {}, stats: {} } }, 'user1');
      // Run through all retries
      for(let i = 0; i < 5; i++) {
        // Advance timers just enough for the next retry attempt
        await vi.advanceTimersByTimeAsync(100); // initial process
        const delay = Math.pow(2, i + 1) * 1000;
        await vi.advanceTimersByTimeAsync(delay);
      }
    });
  
    // Assert
    expect(supabase.from('vocab_rows').upsert).toHaveBeenCalledTimes(5); // 1 initial + 4 retries... wait, it's 5 retries. So 6 calls? The code says action.retries < maxRetries (5). So 0, 1, 2, 3, 4. That's 5 calls.
    const failedAction = Object.values(dbStore)[0];
    expect(failedAction.status).toBe('failed');
    expect(failedAction.retries).toBe(5);
    expect(setSyncStatusMock).toHaveBeenCalledWith('error');
// FIX: Replaced `expect.stringMatching` with a direct string comparison to resolve the type error. The mapped error message is now explicitly checked.
    expect(showToastMock).toHaveBeenCalledWith('Sync Failed: An unexpected error occurred. We will keep trying.', 'error');
  });

  it('TC_SYNC_04: should allow manually retrying a failed item', async () => {
     // Arrange: Create a failed item
    const failedAction: SyncAction = {
      id: 'failed-1', type: 'UPSERT_ROW', payload: { tableId: 't1', row: { id: 'r-fail', cols: {}, stats: {} } },
      userId: 'user1', retries: 5, timestamp: Date.now(), status: 'failed', lastError: 'Max retries exceeded'
    };
    dbStore['failed-1'] = failedAction;
    
    vi.mocked(supabase.from('vocab_rows').upsert).mockResolvedValueOnce({ error: null } as any);
    const engine = VmindSyncEngine.getInstance();
    await act(async () => {
        // Load the failed item into the engine's queue
        await (engine as any).loadQueue();
    });
    
    // Act
    await act(async () => {
      await engine.retryItem('failed-1');
      await vi.runAllTimersAsync();
    });

    // Assert
    expect(supabase.from('vocab_rows').upsert).toHaveBeenCalledTimes(1);
    expect(Object.keys(dbStore).length).toBe(0); // Item should be processed and removed
    const lastStatusCall = setSyncStatusMock.mock.calls.slice(-1)[0][0];
    expect(['saved', 'idle']).toContain(lastStatusCall);
  });

  it('TC_SYNC_05: should allow discarding a failed item from the queue', async () => {
    // Arrange
    const failedAction: SyncAction = {
      id: 'discard-1', type: 'UPSERT_ROW', payload: { tableId: 't1', row: { id: 'r-discard', cols: {}, stats: {} } },
      userId: 'user1', retries: 5, timestamp: Date.now(), status: 'failed', lastError: 'Error'
    };
    dbStore['discard-1'] = failedAction;
    const engine = VmindSyncEngine.getInstance();
    await act(async () => {
        await (engine as any).loadQueue();
    });

    // Act
    await act(async () => {
      await engine.discardItem('discard-1');
    });

    // Assert
    expect(Object.keys(dbStore).length).toBe(0);
    expect(supabase.from('vocab_rows').upsert).not.toHaveBeenCalled();
    expect(setSyncStatusMock).toHaveBeenCalledWith('idle');
  });
});