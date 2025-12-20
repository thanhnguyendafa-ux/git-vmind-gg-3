import { SyncAction, SyncActionType, SyncLogEntry, ConfidenceProgress, Note, AnkiProgress, StudyProgress } from '../types';
import { supabase } from './supabaseClient';
import { useUIStore } from '../stores/useUIStore';
import { mapErrorToUserMessage } from './errorMapper';
import { generateUUID } from '../utils/uuidUtils';

// FIX: Bumped version to 3 to force store creation if it was missing in v1/v2
const DB_NAME = 'VmindSyncDB';
const STORE_NAME = 'sync_queue';
const DB_VERSION = 3;

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
            case 'UPSERT_TABLE':
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
            case 'UPSERT_FOLDER':
                return `Folder: "${payload.folder?.name || 'Untitled'}"`;
            case 'DELETE_FOLDER':
                return `Delete Folder`;
            case 'UPSERT_COUNTER':
                return `Activity: "${payload.counter?.name || 'Untitled'}"`;
            case 'DELETE_COUNTER':
                return `Delete Activity Tracker`;
            case 'UPSERT_MUSIC':
                return 'Update Music Settings';
            case 'UPSERT_CONTEXT_LINK':
                return 'Link Context';
            case 'DELETE_CONTEXT_LINK':
                return 'Unlink Context';
            case 'UPSERT_BOOKMARK':
                return 'Add Bookmark';
            case 'DELETE_BOOKMARK':
                return 'Remove Bookmark';
            case 'UPSERT_CONCEPT':
                return `Concept: "${payload.concept?.name || 'Untitled'}"`;
            case 'DELETE_CONCEPT':
                return 'Delete Concept';
            case 'UPSERT_CONCEPT_LEVEL':
                return `Level: "${payload.level?.name || 'Untitled'}"`;
            case 'DELETE_CONCEPT_LEVEL':
                return 'Delete Level';
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
    private isLocked = false; // Prevents PUSH (Safety for Pull/Hydration)
    private isBatching = false; // Prevents PROCESSING (UX for Batch Saves)
    private maxRetries = 5; // Battery Saver cap
    private retryTimeoutId: number | null = null; // Track the backoff timer

    private constructor() {
        this.initDB().then(() => this.loadQueue());

        // Network Listeners for Battery Saver/Resilience
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.resume());
            window.addEventListener('offline', () => this.pause());
        }
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
            const request = indexedDB.open(DB_NAME, DB_VERSION);
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
            const request = indexedDB.open(DB_NAME, DB_VERSION);
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
            const request = indexedDB.open(DB_NAME, DB_VERSION);
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
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const getAll = store.getAll();
                getAll.onsuccess = () => {
                    this.queue = (getAll.result as SyncAction[]).sort((a, b) => a.timestamp - b.timestamp);
                    this.broadcastQueueState();
                    resolve();
                };
                getAll.onerror = () => reject(getAll.error);
            };
            request.onerror = () => reject(request.error);
        });
    }

    public async clearQueue(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const clearRequest = store.clear();

                clearRequest.onsuccess = () => {
                    this.queue = [];
                    this.broadcastQueueState();
                    useUIStore.getState().setSyncStatus('idle');
                    this.isProcessing = false;
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
    /**
     * Locks the engine. Rejects all push requests.
     * Used during full data Pulls/Hydration to prevent race conditions.
     */
    public suspend() {
        this.isLocked = true;
        this.interruptBackoff();
        this.isProcessing = false;
    }

    /**
     * Unlocks the engine. Allows push requests again.
     */
    public unsuspend() {
        this.isLocked = false;
    }

    /**
     * Pauses the processor but allows push requests to queue up.
     * Used for "Transactional/Batch Mode" in UI.
     */
    public startBatchMode() {
        this.isBatching = true;
        this.interruptBackoff();
    }

    /**
     * Resumes processing and triggers a sync if items are queued.
     * Used when exiting "Transactional/Batch Mode".
     */
    public endBatchMode() {
        this.isBatching = false;
        this.triggerSync();
    }

    public getLatestPendingPayload(type: SyncActionType): any | null {
        for (let i = this.queue.length - 1; i >= 0; i--) {
            if (this.queue[i].type === type) {
                return this.queue[i].payload;
            }
        }
        return null;
    }

    public async validateQueueForUser(userId: string): Promise<void> {
        await this.loadQueue();

        const zombies: string[] = [];
        const validQueue: SyncAction[] = [];

        this.queue.forEach(action => {
            if (action.userId === userId) {
                validQueue.push(action);
            } else {
                zombies.push(action.id);
            }
        });

        if (zombies.length > 0) {
            console.warn(`[VmindSyncEngine] Purging ${zombies.length} zombie items.`);
            const deletePromises = zombies.map(id => this.removeFromDB(id));
            await Promise.all(deletePromises);
            this.queue = validQueue;
            this.broadcastQueueState();
        }
    }

    // --- Public API ---
    public async getQueueStatus(): Promise<{ isEmpty: boolean }> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
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
            id: generateUUID(),
            type,
            payload,
            userId,
            retries: 0,
            timestamp: Date.now(),
            status: 'pending',
            deferCount: 0
        };

        this.queue.push(action);
        await this.saveToDB(action);
        this.broadcastQueueState();
    }

    public triggerSync() {
        this.isPaused = false;
        this.isBatching = false;

        if (this.isLocked) return;

        if (this.queue.length > 0) {
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

        if (this.isProcessing || this.isPaused || this.isLocked || this.isBatching || this.queue.length === 0) return;

        this.isProcessing = true;
        const action = this.queue[0];

        if (action.status !== 'processing') {
            action.status = 'processing';
            this.broadcastQueueState();
        }

        const itemDetails = getSyncActionDetails(action);

        try {
            await this.executeAction(action);

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
            const userError = mapErrorToUserMessage(error);
            action.lastError = userError;

            const errorCode = error?.code;
            const isTerminalError = errorCode === '23503' || errorCode === '23505';

            // FIX: If it's a FK violation (23503) or a Permission Denied (42501), 
            // it might be a dependency ordering issue (child syncing before parent).
            // Move it to the end of the queue to give other items (dependencies) a chance to process.
            if (errorCode === '23503' || errorCode === '42501') {
                const currentDeferCount = action.deferCount || 0;

                if (currentDeferCount >= 5) {
                    // Stop the loop!
                    console.error(`Foreign Key Violation: Max deferral limit reached for ${action.type}. Marking as failed.`);
                    action.status = 'failed';
                    action.lastError = `Dependencies missing (FK Violation). Processed ${currentDeferCount} times without resolution.`;
                    await this.saveToDB(action);

                    this.logAction(action.id, action.type, 'failed', `Failed: Dependencies Missing (Loop Detected)`);

                    this.broadcastQueueState();
                    // Proceed to next
                    this.isProcessing = false;
                    this._processQueue();
                    return;
                }

                console.warn(`Foreign Key Violation for ${action.type}. Deferring item to end of queue (${currentDeferCount + 1}/5). Details: ${userError}`);

                // 1. Remove from DB and Queue
                await this.removeFromDB(action.id);
                this.queue.shift();

                // 2. Reset status and push to back with incremented deferCount
                action.status = 'pending';
                action.retries = 0; // Reset retries to give it a fresh start
                action.deferCount = currentDeferCount + 1;

                // 3. Save to DB and Queue
                this.queue.push(action);
                await this.saveToDB(action);

                this.broadcastQueueState();

                // 4. Continue processing the next item immediately
                this.isProcessing = false;
                this._processQueue();
                return;
            }

            // FIX: If it's a unique violation (23505), the item already exists.
            // Just discard it silently since the data is already in the database.
            if (errorCode === '23505') {
                console.warn(`Unique Violation for ${action.type}. Item already exists, discarding. Details: ${userError}`);

                // Remove from queue and DB
                this.queue.shift();
                await this.removeFromDB(action.id);
                this.broadcastQueueState();

                // Continue processing next item
                this.isProcessing = false;
                this._processQueue();
                return;
            }

            const isNetworkError = userError.includes('Network connection lost');

            if (!isTerminalError && action.retries < this.maxRetries) {
                console.warn(`Sync Retry (${action.retries + 1}/${this.maxRetries}) for ${action.type}: ${userError}`);
            } else {
                console.error(`Sync Failed for ${action.type}: ${userError}`, error);
            }

            if (isNetworkError && !navigator.onLine) {
                action.status = 'pending';
                this.pause();
                await this.saveToDB(action);
                this.broadcastQueueState();
                this.isProcessing = false;
                return;
            }

            if (!isTerminalError && action.retries < this.maxRetries) {
                action.retries++;
                action.status = 'pending';
                const delay = Math.pow(2, action.retries) * 1000;

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

                this.logAction(action.id, action.type, 'failed', `Failed: ${itemDetails} - ${action.lastError}`);

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
                const { stats, createdAt, modifiedAt, ...rest } = row as any;
                const s = stats as any;
                const statsForDb = {
                    ...s,
                    last_studied: s.lastStudied,
                    flashcard_status: s.flashcardStatus,
                    flashcard_encounters: s.flashcardEncounters,
                    is_flashcard_reviewed: s.isFlashcardReviewed,
                    last_practice_date: s.lastPracticeDate,
                    scramble_encounters: s.scrambleEncounters,
                    scramble_ratings: s.scrambleRatings,
                    theater_encounters: s.theaterEncounters,
                    anki_state: s.ankiState,
                    anki_step: s.ankiStep,
                    anki_repetitions: s.ankiRepetitions,
                    anki_ease_factor: s.ankiEaseFactor,
                    anki_interval: s.ankiInterval,
                    anki_lapses: s.ankiLapses,
                    anki_due_date: s.ankiDueDate,
                    confi_viewed: s.confiViewed,
                };
                delete statsForDb.lastStudied; delete statsForDb.flashcardStatus; delete statsForDb.flashcardEncounters; delete statsForDb.isFlashcardReviewed; delete statsForDb.lastPracticeDate; delete statsForDb.scrambleEncounters; delete statsForDb.scrambleRatings; delete statsForDb.theaterEncounters; delete statsForDb.ankiRepetitions; delete statsForDb.ankiEaseFactor; delete statsForDb.ankiInterval; delete statsForDb.ankiDueDate; delete statsForDb.confiViewed; delete statsForDb.ankiState; delete statsForDb.ankiStep; delete statsForDb.ankiLapses;

                const { conceptLevelId: oldId, conceptLevelIds: oldIds, ...cleanRest } = rest as any;
                const dbRow: any = { ...cleanRest, stats: statsForDb, table_id: tableId, user_id: userId };

                if (createdAt) dbRow.created_at = createdAt;
                if (modifiedAt) dbRow.modified_at = modifiedAt;

                // Map to clean snake_case columns
                if (oldId || rest.conceptLevelId) {
                    dbRow.concept_level_id = oldId || rest.conceptLevelId;
                }
                if (oldIds || rest.conceptLevelIds) {
                    dbRow.concept_level_ids = oldIds || rest.conceptLevelIds;
                }

                const { error: upsertError } = await supabase.from('vocab_rows').upsert(dbRow);
                if (upsertError) {
                    if (upsertError.code === '23505' || upsertError.code === '409') {
                        console.error("[VmindSyncEngine] Conflict detected for UPSERT_ROW:", upsertError);
                    }
                    throw upsertError;
                }
                break;
            }
            case 'UPSERT_TABLE': {
                const { tableData } = payload;
                const dataForDb: any = { ...tableData };
                if (dataForDb.createdAt) dataForDb.created_at = new Date(dataForDb.createdAt).toISOString();
                if (dataForDb.modifiedAt) dataForDb.modified_at = new Date(dataForDb.modifiedAt).toISOString();
                if (dataForDb.shortCode) dataForDb.short_code = dataForDb.shortCode;

                delete dataForDb.modifiedAt; delete dataForDb.createdAt; delete dataForDb.rows; delete dataForDb.rowCount; delete dataForDb.shortCode;

                if (dataForDb.imageConfig) { dataForDb.image_config = dataForDb.imageConfig; delete dataForDb.imageConfig; }
                if (dataForDb.audioConfig) { dataForDb.audio_config = dataForDb.audioConfig; delete dataForDb.audioConfig; }
                if (dataForDb.columnAudioConfig) { dataForDb.column_audio_config = dataForDb.columnAudioConfig; delete dataForDb.columnAudioConfig; }
                if (dataForDb.aiPrompts) { dataForDb.ai_prompts = dataForDb.aiPrompts; delete dataForDb.aiPrompts; }
                if (dataForDb.isPublic !== undefined) { dataForDb.is_public = dataForDb.isPublic; delete dataForDb.isPublic; }
                if (dataForDb.ankiConfig) { dataForDb.anki_config = dataForDb.ankiConfig; delete dataForDb.ankiConfig; }
                if (dataForDb.tagIds) { dataForDb.tag_ids = dataForDb.tagIds; delete dataForDb.tagIds; }
                if (dataForDb.viewConfig) { dataForDb.view_settings = dataForDb.viewConfig; delete dataForDb.viewConfig; }
                if (dataForDb.columnUrlTemplates) { dataForDb.column_url_templates = dataForDb.columnUrlTemplates; delete dataForDb.columnUrlTemplates; }
                delete dataForDb.tags;
                dataForDb.user_id = userId;
                const { error: tableError } = await supabase.from('tables').upsert(dataForDb);
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
                const noteForDb = {
                    id: note.id,
                    title: note.title,
                    content: note.content,
                    bookmarks: note.bookmarks,
                    created_at: new Date(note.createdAt).toISOString(),
                    user_id: userId
                };
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
                const noteForDb = {
                    id: note.id,
                    title: note.title,
                    youtube_url: note.youtubeUrl,
                    transcript: note.transcript,
                    practice_history: note.practiceHistory,
                    is_starred: note.isStarred,
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

                let setType = 'confidence';
                let settings: any = {};
                let itemsToInsert = [];

                if ('ankiConfig' in progress) {
                    setType = 'anki';
                    const p = progress as AnkiProgress;
                    settings = {
                        tableIds: p.tableIds,
                        relationIds: p.relationIds,
                        tags: p.tagIds || p.tags || [],
                        ankiConfig: p.ankiConfig
                    };
                } else if ('settings' in progress && 'queue' in progress && !('cardStates' in progress)) {
                    setType = 'queue';
                    const p = progress as StudyProgress;
                    settings = {
                        studySettings: p.settings,
                        currentIndex: p.currentIndex
                    };
                    if (p.queue && p.queue.length > 0) {
                        itemsToInsert = p.queue.map((q, index) => ({
                            set_id: p.id,
                            row_id: q.rowId,
                            data: {
                                questionSnapshot: q,
                                sortOrder: index
                            }
                        }));
                    }
                } else {
                    setType = 'confidence';
                    const p = progress as ConfidenceProgress;
                    settings = {
                        tableIds: p.tableIds,
                        relationIds: p.relationIds,
                        tags: p.tagIds || p.tags || [],
                        intervalConfig: p.intervalConfig,
                        currentIndex: p.currentIndex,
                        newWordCount: p.newWordCount,
                        queue: p.queue,
                        cardStates: p.cardStates || {}
                    };

                    const uniqueRowIds = new Set([...p.queue, ...Object.keys(p.cardStates || {})]);
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
                }

                const { data: set, error: setError } = await supabase.from('study_sets').upsert({
                    id: progress.id,
                    user_id: userId,
                    name: progress.name,
                    type: setType,
                    settings: settings,
                    created_at: new Date(progress.createdAt).toISOString()
                }).select().single();

                if (setError) {
                    console.error("[VmindSyncEngine] Failed to UPSERT study_set:", setError);
                    if (setError.code === '42P01') {
                        throw new Error("Missing 'study_sets' table. Please check database schema.");
                    }
                    throw setError;
                }

                if (setType !== 'anki') {
                    try {
                        await supabase.from('study_items').delete().eq('set_id', progress.id);

                        if (itemsToInsert.length > 0) {
                            const validRowIds = new Set<string>();
                            const chunkSize = 200;

                            for (let i = 0; i < itemsToInsert.length; i += chunkSize) {
                                const chunkIds = itemsToInsert.slice(i, i + chunkSize).map(item => item.row_id);
                                const { data: rows, error } = await supabase
                                    .from('vocab_rows')
                                    .select('id')
                                    .in('id', chunkIds);

                                if (!error && rows) {
                                    rows.forEach(r => validRowIds.add(r.id));
                                }
                            }

                            const filteredItems = itemsToInsert.filter(item => validRowIds.has(item.row_id));

                            if (filteredItems.length > 0) {
                                const { error: itemsError } = await supabase.from('study_items').insert(filteredItems);
                                if (itemsError) throw itemsError;
                            }
                        }
                    } catch (itemError) {
                        console.error("[VmindSyncEngine] Failed to sync study_items items (secondary layer):", itemError);
                        throw itemError;
                    }
                }
                break;
            }
            case 'UPSERT_FOLDER': {
                const { folder } = payload;
                const folderForDb = {
                    id: folder.id,
                    user_id: userId,
                    name: folder.name,
                    table_ids: folder.tableIds,
                    created_at: new Date(folder.createdAt).toISOString(),
                };
                const { error } = await supabase.from('folders').upsert(folderForDb);
                if (error) throw error;
                break;
            }
            case 'DELETE_FOLDER': {
                const { folderId } = payload;
                const { error } = await supabase.from('folders').delete().eq('id', folderId);
                if (error) throw error;
                break;
            }
            case 'UPSERT_COUNTER': {
                const { counter } = payload;
                const dbCounter = {
                    id: counter.id,
                    user_id: userId,
                    target_id: counter.targetId,
                    target_type: counter.targetType,
                    name: counter.name,
                    count: counter.count,
                    last_interaction: new Date(counter.lastInteraction).toISOString(),
                    threshold_days: counter.thresholdDays,
                    is_active: counter.isActive,
                };
                const { error } = await supabase.from('activity_counters').upsert(dbCounter);
                if (error) throw error;
                break;
            }
            case 'DELETE_COUNTER': {
                const { counterId } = payload;
                const { error } = await supabase.from('activity_counters').delete().eq('id', counterId);
                if (error) throw error;
                break;
            }
            case 'UPSERT_MUSIC': {
                const { musicConfig } = payload;
                const { data: current } = await supabase.from('profiles').select('user_profile').eq('id', userId).single();
                const updatedProfile = { ...(current?.user_profile || {}), music: musicConfig };
                const { error } = await supabase.from('profiles').upsert({ id: userId, user_profile: updatedProfile });
                if (error) throw error;
                break;
            }
            case 'UPSERT_CONTEXT_LINK': {
                const { link } = payload;
                const linkForDb = {
                    id: link.id,
                    user_id: userId,
                    row_id: link.rowId,
                    source_type: link.sourceType,
                    source_id: link.sourceId,
                    metadata: link.metadata,
                    created_at: new Date(link.createdAt).toISOString(),
                };
                const { error } = await supabase.from('context_links').upsert(linkForDb);
                if (error) throw error;
                break;
            }
            case 'DELETE_CONTEXT_LINK': {
                const { linkId } = payload;
                const { error } = await supabase.from('context_links').delete().eq('id', linkId);
                if (error) throw error;
                break;
            }
            case 'UPSERT_BOOKMARK': {
                const { noteId, bookmark } = payload;
                // 1. Fetch current bookmarks to merge (safe for single user)
                const { data } = await supabase.from('notes').select('bookmarks').eq('id', noteId).single();
                const currentBookmarks = data?.bookmarks || [];

                // 2. Append new bookmark (filter out existing if updating same ID)
                const updatedBookmarks = [...currentBookmarks.filter((b: any) => b.id !== bookmark.id), bookmark];

                // 3. Update only the bookmarks column
                const { error } = await supabase.from('notes').update({ bookmarks: updatedBookmarks }).eq('id', noteId);
                if (error) throw error;
                break;
            }
            case 'DELETE_BOOKMARK': {
                const { noteId, bookmarkId } = payload;

                // 1. Fetch current
                const { data } = await supabase.from('notes').select('bookmarks').eq('id', noteId).single();
                const currentBookmarks = data?.bookmarks || [];

                // 2. Filter out
                const updatedBookmarks = currentBookmarks.filter((b: any) => b.id !== bookmarkId);

                // 3. Update
                const { error } = await supabase.from('notes').update({ bookmarks: updatedBookmarks }).eq('id', noteId);
                if (error) throw error;
                break;
            }
            case 'UPSERT_CONCEPT': {
                const { concept } = payload;
                const conceptForDb = {
                    id: concept.id,
                    code: concept.code,
                    name: concept.name,
                    description: concept.description,
                    parent_id: concept.parentId,
                    is_folder: concept.isFolder,
                    user_id: userId,
                    created_at: concept.createdAt,
                    modified_at: concept.modifiedAt
                };
                const { error } = await supabase.from('concepts').upsert(conceptForDb);
                if (error) throw error;
                break;
            }
            case 'DELETE_CONCEPT': {
                const { conceptId } = payload;
                const { error } = await supabase.from('concepts').delete().eq('id', conceptId);
                if (error) throw error;
                break;
            }
            case 'UPSERT_CONCEPT_LEVEL': {
                const { level } = payload;
                const levelForDb = {
                    id: level.id,
                    concept_id: level.conceptId,
                    name: level.name,
                    order: level.order,
                    description: level.description,
                    created_at: level.createdAt,
                    user_id: userId
                };
                const { error } = await supabase.from('concept_levels').upsert(levelForDb);
                if (error) throw error;
                break;
            }
            case 'DELETE_CONCEPT_LEVEL': {
                const { levelId } = payload;
                const { error } = await supabase.from('concept_levels').delete().eq('id', levelId);
                if (error) throw error;
                break;
            }
        }
    }
}
