import { StateCreator } from 'zustand';
import { TableState } from '../useTableStore';
import { useUserStore } from '../useUserStore';
import { useUIStore } from '../useUIStore';
import { cacheService } from '../../services/cacheService';
import { supabase } from '../../services/supabaseClient';
import { dbRowToVocabRow, smartHealRowIds } from './rowSlice';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

export interface CacheSlice {
    generateUniqueShortCode: (tableName: string) => string;
    fetchTablePayload: (tableId: string, force?: boolean) => Promise<void>;
    setTables: (tables: any[]) => void;
    setInitialData: (data: { tables: any[], folders: any[] }) => void;
}

export const createCacheSlice: StateCreator<TableState, [], [], CacheSlice> = (set, get) => ({
    generateUniqueShortCode: (tableName: string) => {
        const { tables } = get();
        const usedCodes = new Set((tables || []).map(t => t.shortCode).filter(Boolean));

        const base = tableName.replace(/[^a-zA-Z]/g, '').toUpperCase();
        let candidate = base.substring(0, 3);

        while (candidate.length < 3) {
            candidate += 'X';
        }

        if (!usedCodes.has(candidate)) return candidate;

        let suffix = 1;
        while (true) {
            const prefixLen = suffix < 10 ? 2 : 1;
            const nextCandidate = candidate.substring(0, prefixLen) + suffix;
            if (!usedCodes.has(nextCandidate)) return nextCandidate;
            suffix++;
            if (suffix > 99) break;
        }

        return 'UNK';
    },

    fetchTablePayload: async (tableId: string, force = false) => {
        const { tables, loadingTableIds } = get();
        const table = tables.find(t => t.id === tableId);

        if (!table || loadingTableIds.has(tableId)) return;
        if (!force && table.rows.length > 0) return;

        set(state => ({ loadingTableIds: new Set(state.loadingTableIds).add(tableId) }));

        try {
            if (!force) {
                const cachedRows = await cacheService.getTableRows(tableId);
                if (cachedRows && cachedRows.length > 0) {
                    set(state => ({
                        tables: state.tables.map(t => t.id === tableId ? { ...t, rows: cachedRows, rowCount: cachedRows.length } : t),
                        loadingTableIds: new Set(Array.from(state.loadingTableIds).filter(id => id !== tableId))
                    }));
                    return;
                }
            }

            const { data, error } = await supabase.from('vocab_rows').select('*').eq('table_id', tableId);
            if (error) throw error;

            let fetchedRows = (data as any[]).map(dbRowToVocabRow);
            fetchedRows.sort((a, b) => (a.rowIdNum || 0) - (b.rowIdNum || 0));

            const { rows: healedRows, modifiedRows } = smartHealRowIds(fetchedRows);

            if (modifiedRows.length > 0) {
                console.warn(`[Vmind] Smart Healing: Fixed ${modifiedRows.length} row IDs for table ${tableId}`);
                fetchedRows = healedRows;

                setTimeout(async () => {
                    const { isGuest, session } = useUserStore.getState();
                    const engine = VmindSyncEngine.getInstance();
                    cacheService.saveTableRows(tableId, fetchedRows);

                    if (!isGuest && session) {
                        const { isEmpty } = await engine.getQueueStatus();
                        if (isEmpty && modifiedRows.length < 50) {
                            modifiedRows.forEach(fixedRow => {
                                engine.push('UPSERT_ROW', { tableId: tableId, row: fixedRow }, session.user.id);
                            });
                        }
                    }
                }, 1000);
            }

            set(state => ({
                tables: state.tables.map(t => t.id === tableId ? {
                    ...t,
                    rows: fetchedRows,
                    rowCount: fetchedRows.length
                } : t),
                loadingTableIds: new Set(Array.from(state.loadingTableIds).filter(id => id !== tableId))
            }));

            await cacheService.saveTableRows(tableId, fetchedRows);

        } catch (error) {
            console.error("Failed to fetch payload for table " + tableId, error);
            set(state => ({ loadingTableIds: new Set(Array.from(state.loadingTableIds).filter(id => id !== tableId)) }));
            useUIStore.getState().showToast("Failed to download content.", "error");
        }
    },

    setTables: (tables) => set({ tables }),

    setInitialData: (data) => {
        set(state => {
            const { generateUniqueShortCode } = get();

            const newTables = data.tables.map(newTable => {
                const existingTable = state.tables.find(t => t.id === newTable.id);
                let rowsToUse = newTable.rows;
                let rowCountToUse = newTable.rowCount;

                if (existingTable && existingTable.rows.length > 0 && newTable.rows.length === 0) {
                    rowsToUse = existingTable.rows;
                    rowCountToUse = existingTable.rows.length;
                }

                let finalTable = { ...newTable, rows: rowsToUse, rowCount: rowCountToUse };
                let isMigrationNeeded = false;

                if (!finalTable.shortCode) {
                    finalTable.shortCode = generateUniqueShortCode(finalTable.name);
                    isMigrationNeeded = true;
                }

                if (rowsToUse.length > 0) {
                    const { rows: healedRows, modifiedRows } = smartHealRowIds(rowsToUse, isMigrationNeeded);

                    if (modifiedRows.length > 0 || isMigrationNeeded) {
                        finalTable.rows = healedRows;
                        finalTable.rowCount = healedRows.length;

                        setTimeout(() => {
                            cacheService.saveTableRows(finalTable.id, healedRows);
                        }, 2000);
                    }
                }

                return finalTable;
            });

            return { tables: newTables, folders: data.folders };
        });
    },
});
