
import { SyncAction, SyncActionType, SyncLogEntry, ConfidenceProgress } from '../types';
import { supabase } from './supabaseClient';
import { useUIStore } from '../stores/useUIStore';
import { mapErrorToUserMessage } from './errorMapper';

// FIX: Define constants for IndexedDB name and store name.
const DB_NAME = 'VmindSyncDB';
const STORE_NAME = 'sync_queue';

/**
 * Extracts human-readable details from a SyncAction payload.
 * Shared between the SyncEngine (for logs) and the UI (for the queue list).
 */
export const getSyncActionDetails = (action: SyncAction): string => {
    const { type, payload } = action;
    if (!payload) return type;

    try {
        switch (type) {
            case 'UPSERT_ROW':
                // Try to get the first column value as a representative "name" for the row
                const firstColValue = payload.row?.cols ? Object.values(payload.row.cols)[0] : '';
                return firstColValue ? `Word: "${firstColValue}"` : 'New Row';
            case 'UPDATE_TABLE':
                return `Table: "${payload.tableData?.name || 'Unknown'}"`;
            case 'DELETE_TABLE':
                return `Delete Table: ${payload.tableId}`;
            case 'DELETE_ROWS':
                return `Delete ${payload.rowIds?.length || 0} Rows`;
            case 'UPSERT_PROFILE':
                return 'User Profile Update';
            case 'UPSERT_NOTE':
                return `Note: "${payload.note?.title || 'Untitled'}"`;
            case 'DELETE_NOTE':
                return 'Delete Note';
            case 'UPSERT_DICTATION':
                return `Dictation: "${payload.note?.title || 'Untitled'}"`;
            case 'DELETE_DICTATION':
                return 'Delete Dictation';
            case 'DELETE_STUDY_SET':
                return `Delete Set`;
            case 'UPSERT_STUDY_SET':
                return `Set: "${payload.progress?.name || 'Untitled'}"`;
            default:
                return type;
        }
    } catch (e) {
        return type;
    }
};

/**
 * VmindSyncEngine - The Anti-Fragile Core (v2.6)
 * Handles queueing, persistence (IndexedDB), retries with exponential backoff,
 * and "battery-saver" logic. Now supports manual Push/Pull model.
 */
export class VmindSyncEngine {
  private static instance: VmindSyncEngine;
  private queue: SyncAction[] = [];
  private isProcessing = false;
  private isPaused = false;
  private isLocked = false; // New: For pull operations
  private maxRetries = 5; // Battery Saver cap
  private retryTimeoutId: number | null = null; // Track the backoff timer

  private constructor() {
    this.initDB().then(() => this.loadQueue());
    
    // Network Listeners for Battery Saver/Resilience
    window.addEventListener('online', () => this.resume());
    window.addEventListener('offline', () => this.pause());
  }

  public static getInstance(): VmindSyncEngine {
    if (!VmindSyncEngine.instance) {
      VmindSyncEngine.instance = new VmindSyncEngine();
    }
    return VmindSyncEngine.instance;
  }

  // --- IDB Helpers (Minimal Wrapper) ---
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToDB(action: SyncAction): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(action);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  }

  private async removeFromDB(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      };
    });
  }

  private async loadQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          this.queue = (getAll.result as SyncAction[]).sort((a, b) => a.timestamp - b.timestamp);
          this.broadcastQueueState();
          
          // Manual Mode Fix: Do not set 'saving' status just because queue has items.
          // The UI will see queue.length > 0 and enable the Push button.
          resolve();
        };
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
  }
  
  public async clearQueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => {
          this.queue = [];
          this.broadcastQueueState();
          resolve();
        };
        
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // --- The State Broadcaster ---
  private broadcastQueueState() {
      useUIStore.getState().setSyncQueue([...this.queue]);
  }
  
  private logAction(id: string, actionType: SyncActionType, status: 'success' | 'failed', details: string) {
      useUIStore.getState().addSyncLog({
          id,
          actionType,
          timestamp: Date.now(),
          status,
          details
      });
  }
  
  // --- Reactive Helpers ---
  private interruptBackoff() {
      if (this.retryTimeoutId) {
          clearTimeout(this.retryTimeoutId);
          this.retryTimeoutId = null;
          this.isProcessing = false;
      }
  }
  
  // --- Public Maintenance API ---
  public suspend() {
      this.isLocked = true;
      this.interruptBackoff();
      this.isProcessing = false;
  }
  
  public unsuspend() {
      this.isLocked = false;
  }

  // --- Public API ---
  public async getQueueStatus(): Promise<{ isEmpty: boolean }> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const countRequest = store.count();
        countRequest.onsuccess = () => {
          resolve({ isEmpty: countRequest.result === 0 });
        };
        countRequest.onerror = () => reject(countRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  }

  public async push(type: SyncActionType, payload: any, userId: string): Promise<void> {
    if (this.isLocked) {
        console.warn("SyncEngine locked. Cannot push.");
        return;
    }

    const action: SyncAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      userId,
      retries: 0,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.queue.push(action);
    await this.saveToDB(action);
    this.broadcastQueueState();
    
    // Manual Mode Fix: Do not set 'saving' here.
    // We want the user to click "Push" to start the process.
    // The button will become enabled because queue length > 0.
  }

  public triggerSync() {
    this.isPaused = false;
    if (this.isLocked) return;

    if (this.queue.length > 0) {
      // Only set saving status when explicitly triggered by user
      useUIStore.getState().setSyncStatus('saving');
      this._processQueue();
    }
  }

  private pause() {
    this.isPaused = true;
    this.interruptBackoff();
    useUIStore.getState().setSyncStatus(navigator.onLine ? 'paused' : 'offline');
  }

  private resume() {
    this.isPaused = false;
    // Manual Mode Fix: Don't auto-set 'saving' on resume.
    // Just reset to idle if not processing.
    if (!this.isProcessing) {
        useUIStore.getState().setSyncStatus('idle');
    }
  }

  public async retryItem(id: string) {
      if (this.isLocked) return;
      const itemIndex = this.queue.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
          this.queue[itemIndex].retries = 0;
          this.queue[itemIndex].status = 'pending';
          this.queue[itemIndex].lastError = undefined;
          await this.saveToDB(this.queue[itemIndex]);
          this.broadcastQueueState();
          this.interruptBackoff();
          // For retry, we DO want to trigger sync immediately for UX
          this.triggerSync(); 
      }
  }

  public async updatePendingAction(id: string, newPayload: any) {
      if (this.isLocked) return;
      const itemIndex = this.queue.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
          this.queue[itemIndex].payload = newPayload;
          this.queue[itemIndex].status = 'pending';
          this.queue[itemIndex].retries = 0;
          this.queue[itemIndex].lastError = undefined;

          await this.saveToDB(this.queue[itemIndex]);
          this.broadcastQueueState();
          this.interruptBackoff();
          // For update, we wait for user to push again
      }
  }

  public async discardItem(id: string) {
      if (this.isLocked) return;
      const itemIndex = this.queue.findIndex(i => i.id === id);
      if (itemIndex !== -1) {
          if (itemIndex === 0) {
              this.interruptBackoff();
          }
          this.queue.splice(itemIndex, 1);
          await this.removeFromDB(id);
          this.broadcastQueueState();
          if (this.queue.length === 0) {
              useUIStore.getState().setSyncStatus('idle');
          } else if (!this.isProcessing && !this.isPaused) {
              this.isProcessing = false;
              useUIStore.getState().setSyncStatus('idle');
          }
      }
  }

  // --- Processing Logic ---

  private async _processQueue() {
    if (this.retryTimeoutId) {
        clearTimeout(this.retryTimeoutId);
        this.retryTimeoutId = null;
    }

    if (this.isProcessing || this.isPaused || this.isLocked || this.queue.length === 0) return;

    this.isProcessing = true;
    const action = this.queue[0];
    
    if (action.status !== 'processing') {
        action.status = 'processing';
        this.broadcastQueueState();
    }

    // Generate specific details for logging BEFORE execution
    const itemDetails = getSyncActionDetails(action);

    try {
      await this.executeAction(action);
      
      // Log Success with details
      this.logAction(action.id, action.type, 'success', `Synced: ${itemDetails}`);

      this.queue.shift();
      await this.removeFromDB(action.id);
      this.broadcastQueueState();
      
      if (this.queue.length === 0) {
        useUIStore.getState().setSyncStatus('saved');
        setTimeout(() => useUIStore.getState().setSyncStatus('idle'), 2000);
        this.isProcessing = false;
      } else {
        this.isProcessing = false;
        this._processQueue();
      }

    } catch (error: any) {
      console.error(`Sync Error (Action ${action.type}):`, JSON.stringify(error, null, 2));
      
      const userError = mapErrorToUserMessage(error);
      action.lastError = userError;
      
      if (action.retries < this.maxRetries) {
        action.retries++;
        action.status = 'pending';
        const delay = Math.pow(2, action.retries) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        
        await this.saveToDB(action);
        this.broadcastQueueState();
        
        this.retryTimeoutId = window.setTimeout(() => {
            this.retryTimeoutId = null;
            this.isProcessing = false; 
            this._processQueue();
        }, delay);
        
      } else {
        action.status = 'failed';
        await this.saveToDB(action);
        
        // Log Failure with specific details
        this.logAction(action.id, action.type, 'failed', `Failed: ${itemDetails} - ${userError}`);
        
        this.broadcastQueueState();
        useUIStore.getState().showToast(`Sync Failed: ${itemDetails}`, 'error');
        useUIStore.getState().setSyncStatus('error');
        this.pause();
        this.isProcessing = false;
      }
    }
  }

  private async executeAction(action: SyncAction) {
     const { type, payload, userId } = action;

     switch (type) {
        case 'UPSERT_ROW': {
            const { row, tableId } = payload;
            const { stats, ...rest } = row;
            const statsForDb = { ...stats, last_studied: stats.lastStudied, flashcard_status: stats.flashcardStatus, flashcard_encounters: stats.flashcardEncounters, is_flashcard_reviewed: stats.isFlashcardReviewed, last_practice_date: stats.lastPracticeDate, scramble_encounters: stats.scrambleEncounters, scramble_ratings: stats.scrambleRatings, theater_encounters: stats.theaterEncounters, anki_repetitions: stats.ankiRepetitions, anki_ease_factor: stats.ankiEaseFactor, anki_interval: stats.ankiInterval, anki_due_date: stats.ankiDueDate, };
            delete statsForDb.lastStudied; delete statsForDb.flashcardStatus; delete statsForDb.flashcardEncounters; delete statsForDb.isFlashcardReviewed; delete statsForDb.lastPracticeDate; delete statsForDb.scrambleEncounters; delete statsForDb.scrambleRatings; delete statsForDb.theaterEncounters; delete statsForDb.ankiRepetitions; delete statsForDb.ankiEaseFactor; delete statsForDb.ankiInterval; delete statsForDb.ankiDueDate;
            const dbRow = { ...rest, stats: statsForDb, table_id: tableId, user_id: userId };
            const { error: upsertError } = await supabase.from('vocab_rows').upsert(dbRow);
            if (upsertError) throw upsertError;
            break;
        }
        case 'UPDATE_TABLE': {
            const { tableData } = payload;
            const dataForDb: any = { ...tableData };
            if (dataForDb.createdAt) dataForDb.created_at = new Date(dataForDb.createdAt).toISOString();
            delete dataForDb.modifiedAt; delete dataForDb.createdAt; delete dataForDb.rows; delete dataForDb.rowCount;
            if (dataForDb.imageConfig) { dataForDb.image_config = dataForDb.imageConfig; delete dataForDb.imageConfig; }
            if (dataForDb.audioConfig) { dataForDb.audio_config = dataForDb.audioConfig; delete dataForDb.audioConfig; }
            if (dataForDb.columnAudioConfig) { dataForDb.column_audio_config = dataForDb.columnAudioConfig; delete dataForDb.columnAudioConfig; }
            if (dataForDb.aiPrompts) { dataForDb.ai_prompts = dataForDb.aiPrompts; delete dataForDb.aiPrompts; }
            if (dataForDb.isPublic !== undefined) { dataForDb.is_public = dataForDb.isPublic; delete dataForDb.isPublic; }
            if (dataForDb.ankiConfig) { dataForDb.anki_config = dataForDb.ankiConfig; delete dataForDb.ankiConfig; }
            if (dataForDb.tagIds) { dataForDb.tag_ids = dataForDb.tagIds; delete dataForDb.tagIds; }
            delete dataForDb.tags;
            const { data: retData, error: tableError } = await supabase.from('tables').update(dataForDb).eq('id', tableData.id).select('modified_at').single();
            if (tableError) throw tableError;
            break;
        }
        case 'DELETE_ROWS': {
            const { tableId: tid, rowIds } = payload;
            const { error: delRowError } = await supabase.from('vocab_rows').delete().in('id', rowIds);
            if (delRowError) throw delRowError;
            break;
        }
        case 'DELETE_TABLE': {
            const { tableId: delTableId } = payload;
            if (typeof delTableId === 'string' && delTableId.startsWith('default-')) {
                break;
            }
            const { error: delTableError } = await supabase.from('tables').delete().eq('id', delTableId);
            if (delTableError) throw delTableError;
            break;
        }
        case 'UPSERT_PROFILE': {
            const { user_profile } = payload;
            const { error } = await supabase.from('profiles').upsert({ id: userId, user_profile });
            if (error) throw error;
            break;
        }
        case 'UPSERT_NOTE': {
            const { note } = payload;
            const { createdAt, ...restOfNote } = note;
            const noteForDb = {
                ...restOfNote,
                created_at: new Date(createdAt).toISOString(),
                user_id: userId
            };
            // Use upsert to handle both create and update
            const { error } = await supabase.from('notes').upsert(noteForDb);
            if (error) throw error;
            break;
        }
        case 'DELETE_NOTE': {
            const { noteId } = payload;
            const { error } = await supabase.from('notes').delete().eq('id', noteId);
            if (error) throw error;
            break;
        }
        case 'UPSERT_DICTATION': {
            const { note } = payload;
            const { youtubeUrl, practiceHistory, ...rest } = note;
             // Dictation notes don't usually store createdAt in the main object in the same way as notes,
             // but if we added it, we'd convert it here. Assuming structure matches DB.
            const noteForDb = { 
                ...rest, 
                youtube_url: youtubeUrl, 
                practice_history: practiceHistory, 
                user_id: userId 
            };
            const { error } = await supabase.from('dictation_notes').upsert(noteForDb);
            if (error) throw error;
            break;
        }
        case 'DELETE_DICTATION': {
             const { noteId } = payload;
             const { error } = await supabase.from('dictation_notes').delete().eq('id', noteId);
             if (error) throw error;
             break;
        }
        case 'DELETE_STUDY_SET': {
            const { setId } = payload;
            const { error } = await supabase.from('study_sets').delete().eq('id', setId);
            if (error) throw error;
            break;
        }
        case 'UPSERT_STUDY_SET': {
            const { progress } = payload;
            const p = progress as ConfidenceProgress;
            
            // 1. Insert/Update the Set Metadata
            const { data: set, error: setError } = await supabase.from('study_sets').upsert({
                id: p.id,
                user_id: userId,
                name: p.name,
                type: 'confidence',
                settings: {
                    tableIds: p.tableIds,
                    relationIds: p.relationIds,
                    tags: p.tagIds || p.tags || [],
                    intervalConfig: p.intervalConfig,
                    currentIndex: p.currentIndex,
                    newWordCount: p.newWordCount,
                    // CRITICAL: Save the queue in JSON metadata as well for fast "Metadata First" loading
                    // This fixes the "0/0" issue on reload.
                    queue: p.queue,
                    cardStates: p.cardStates // Persist visual snapshot
                },
                created_at: new Date(p.createdAt).toISOString()
            }).select().single();

            if (setError) throw setError;

            // 2. Update the Items (Queue) in the study_items table
            // For simplicity and resilience, we delete existing items for this set and re-insert.
            // A more optimized approach would diff, but this ensures consistency.
            
            await supabase.from('study_items').delete().eq('set_id', p.id);
            
            const uniqueRowIds = new Set([...p.queue, ...Object.keys(p.cardStates || {})]);
            const itemsToInsert = [];

            for (const rowId of uniqueRowIds) {
                const status = p.cardStates?.[rowId] || 'New';
                itemsToInsert.push({
                    set_id: p.id,
                    row_id: rowId,
                    status: status,
                    data: {
                        isInQueue: p.queue.includes(rowId)
                    }
                });
            }

            if (itemsToInsert.length > 0) {
                const { error: itemsError } = await supabase.from('study_items').insert(itemsToInsert);
                if (itemsError) throw itemsError;
            }
            break;
        }
     }
  }
}