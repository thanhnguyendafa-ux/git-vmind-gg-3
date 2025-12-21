import { StateCreator } from 'zustand';
import { VocabRow } from '../../types';
import { TableState } from '../useTableStore';
import { useUserStore } from '../useUserStore';
import { useSessionDataStore } from '../useSessionDataStore';
import { cacheService } from '../../services/cacheService';
import { useTagStore } from '../useTagStore';
import { useCounterStore } from '../useCounterStore';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

const getEngine = () => VmindSyncEngine.getInstance();

export const dbRowToVocabRow = (row: any): VocabRow => {
    const { stats, table_id, user_id, row_id_num, concept_level_id, concept_level_ids, concept_notes, ...rest } = row;
    const { last_studied, flashcard_status, flashcard_encounters, is_flashcard_reviewed, last_practice_date, scramble_encounters, scramble_ratings, theater_encounters, anki_repetitions, anki_ease_factor, anki_interval, anki_due_date, confi_viewed, ...restStats } = stats || {};

    const statsCamel = {
        ...restStats,
        lastStudied: last_studied,
        flashcardStatus: flashcard_status,
        flashcardEncounters: flashcard_encounters,
        isFlashcardReviewed: is_flashcard_reviewed,
        lastPracticeDate: last_practice_date,
        scrambleEncounters: scramble_encounters,
        scrambleRatings: scramble_ratings,
        theaterEncounters: theater_encounters,
        ankiRepetitions: anki_repetitions,
        ankiEaseFactor: anki_ease_factor,
        ankiInterval: anki_interval,
        ankiDueDate: anki_due_date,
        confiViewed: confi_viewed,
    };

    return {
        ...rest,
        stats: statsCamel,
        rowIdNum: row_id_num,
        conceptLevelId: concept_level_id,
        conceptLevelIds: concept_level_ids || [],
        conceptNotes: concept_notes || {}
    };
};

export const smartHealRowIds = (rows: VocabRow[], forceReindex = false): { rows: VocabRow[], modifiedRows: VocabRow[] } => {
    const processedRows = [...rows];
    const modifiedRows: VocabRow[] = [];

    if (forceReindex) {
        processedRows.forEach((r, idx) => {
            const newId = idx + 1;
            if (r.rowIdNum !== newId) {
                r.rowIdNum = newId;
                modifiedRows.push(r);
            }
        });
        return { rows: processedRows, modifiedRows };
    }

    const seenIds = new Set<number>();
    let maxId = 0;

    processedRows.forEach(r => {
        if (r.rowIdNum) maxId = Math.max(maxId, r.rowIdNum);
    });

    processedRows.forEach(r => {
        if (!r.rowIdNum || seenIds.has(r.rowIdNum)) {
            r.rowIdNum = ++maxId;
            modifiedRows.push(r);
        }
        seenIds.add(r.rowIdNum);
    });

    return { rows: processedRows, modifiedRows };
};

export interface RowSlice {
    upsertRow: (tableId: string, row: VocabRow) => Promise<boolean>;
    batchUpdateRows: (tableId: string, updates: { rowId: string, changes: Partial<VocabRow> }[]) => Promise<void>;
    addRows: (tableId: string, newRows: VocabRow[]) => Promise<void>;
    deleteRows: (tableId: string, rowIds: string[]) => Promise<void>;
}

export const createRowSlice: StateCreator<TableState, [], [], RowSlice> = (set, get) => ({
    upsertRow: async (tableId, row) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const originalTable = originalTables.find(t => t.id === tableId);
        if (!originalTable) return false;

        const modifiedAt = Date.now();
        const isNew = !originalTable.rows.some(r => r.id === row.id);

        let rowWithId = { ...row };
        if (isNew) {
            const currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
            rowWithId.rowIdNum = row.rowIdNum || currentMax + 1;
        } else {
            const existingRow = originalTable.rows.find(r => r.id === row.id);
            if (existingRow) {
                rowWithId.rowIdNum = row.rowIdNum || existingRow.rowIdNum;
                if (!rowWithId.rowIdNum) {
                    const currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
                    rowWithId.rowIdNum = currentMax + 1;
                }
            }
        }

        const newRows = isNew ? [...originalTable.rows, rowWithId] : originalTable.rows.map(r => r.id === rowWithId.id ? rowWithId : r);

        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: newRows, rowCount: newRows.length, modifiedAt };
            })
        }));

        if (!isGuest) {
            cacheService.saveTableRows(tableId, newRows);
        }

        (async () => {
            const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
            const { tags: allTags } = useTagStore.getState();

            let didUpdate = false;

            const updatedProgresses = confidenceProgresses.map(progress => {
                if (!progress.tableIds.includes(tableId)) return progress;

                const isInQueue = progress.queue.includes(rowWithId.id);
                const filterTagNames = (progress.tags || []).filter(t => !t.startsWith('FC+'));
                const hasFilter = filterTagNames.length > 0;
                let matchesFilter = true;

                if (hasFilter) {
                    const rowTagNames = (rowWithId.tagIds || []).map(id => allTags.find(t => t.id === id)?.name).filter(Boolean) as string[];
                    matchesFilter = rowTagNames.some(name => filterTagNames.includes(name));
                }

                if (matchesFilter) {
                    if (!isInQueue) {
                        didUpdate = true;
                        return {
                            ...progress,
                            queue: [...progress.queue, rowWithId.id],
                            newWordCount: (progress.newWordCount || 0) + 1
                        };
                    }
                } else if (isInQueue) {
                    didUpdate = true;
                    const newQueue = progress.queue.filter(q => q !== rowWithId.id);
                    const newCardStates = { ...progress.cardStates };
                    delete newCardStates[rowWithId.id];
                    let newIndex = progress.currentIndex;
                    if (newIndex >= newQueue.length) {
                        newIndex = Math.max(0, newQueue.length - 1);
                    }
                    return {
                        ...progress,
                        queue: newQueue,
                        cardStates: newCardStates,
                        currentIndex: newIndex
                    };
                }
                return progress;
            });

            if (didUpdate) {
                await setConfidenceProgresses(() => updatedProgresses);
            }
        })();

        useCounterStore.getState().increment(tableId);

        if (isGuest || !session) {
            return true;
        }

        getEngine().push('UPSERT_ROW', { tableId, row: rowWithId }, session.user.id);

        return true;
    },
    batchUpdateRows: async (tableId, updates) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const originalTable = originalTables.find(t => t.id === tableId);
        if (!originalTable) return;

        const modifiedAt = Date.now();
        const updatedRowIds = new Set(updates.map(u => u.rowId));

        const newRows = originalTable.rows.map(row => {
            if (updatedRowIds.has(row.id)) {
                const change = updates.find(u => u.rowId === row.id)?.changes || {};
                return {
                    ...row,
                    ...change,
                    cols: { ...row.cols, ...(change.cols || {}) }
                };
            }
            return row;
        });

        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: newRows, modifiedAt };
            })
        }));

        if (!isGuest) {
            cacheService.saveTableRows(tableId, newRows);
        }
    },
    addRows: async (tableId, newRows) => {
        const { session, isGuest } = useUserStore.getState();
        const modifiedAt = Date.now();

        const originalTable = get().tables.find(t => t.id === tableId);
        if (!originalTable) return;

        let currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
        const newRowsWithIds = newRows.map(r => {
            const rowIdNum = r.rowIdNum || ++currentMax;
            return { ...r, rowIdNum };
        });

        const updatedRows = [...originalTable.rows, ...newRowsWithIds];

        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: updatedRows, rowCount: updatedRows.length, modifiedAt };
            })
        }));

        if (!isGuest) {
            cacheService.saveTableRows(tableId, updatedRows);
        }

        if (isGuest || !session) return;

        newRowsWithIds.forEach(row => {
            getEngine().push('UPSERT_ROW', { tableId, row }, session.user.id);
        });
    },
    deleteRows: async (tableId, rowIds) => {
        const { session, isGuest } = useUserStore.getState();
        const modifiedAt = Date.now();
        const rowIdSet = new Set(rowIds);

        const originalTable = get().tables.find(t => t.id === tableId);
        if (!originalTable) return;

        const updatedRows = originalTable.rows.filter(r => !rowIdSet.has(r.id));

        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: updatedRows, rowCount: updatedRows.length, modifiedAt };
            })
        }));

        const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
        const updatedProgresses = confidenceProgresses.map(progress => {
            if (!progress.tableIds.includes(tableId)) return progress;

            const originalQueueLength = progress.queue.length;
            const newQueue = progress.queue.filter(id => !rowIdSet.has(id));

            if (newQueue.length !== originalQueueLength) {
                const newCardStates = { ...progress.cardStates };
                rowIds.forEach(id => delete newCardStates[id]);
                const newCurrentIndex = Math.min(progress.currentIndex, newQueue.length > 0 ? newQueue.length - 1 : 0);

                return {
                    ...progress,
                    queue: newQueue,
                    cardStates: newCardStates,
                    currentIndex: newCurrentIndex
                };
            }
            return progress;
        });
        await setConfidenceProgresses(() => updatedProgresses);

        if (!isGuest) {
            cacheService.saveTableRows(tableId, updatedRows);
        }

        if (isGuest || !session) return;

        getEngine().push('DELETE_ROWS', { tableId, rowIds }, session.user.id);
    },
});
