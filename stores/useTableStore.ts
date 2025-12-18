
import { create } from 'zustand';
import { Table, Folder, Column, SessionWordResult, FlashcardStatus, VocabRow, StudyMode, Relation, RelationDesign, TypographyDesign, TextBox, AnkiConfig, Note, CardFaceDesign } from '../types';
import { useUserStore } from './useUserStore';
import { supabase } from '../services/supabaseClient';
import { useUIStore } from './useUIStore';
import { useSessionDataStore } from './useSessionDataStore';
import { DESIGN_TEMPLATES, DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../features/tables/designConstants';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { findContextSentences } from '../utils/textUtils';
import { useContextLinkStore } from './useContextLinkStore';
import { useTagStore } from './useTagStore';
import { cacheService } from '../services/cacheService';
import { useCounterStore } from './useCounterStore';


interface TableState {
  tables: Table[];
  folders: Folder[];
  loadingTableIds: Set<string>; // Tracks which tables are currently fetching payload
  
  createTable: (name: string, columnsStr: string) => Promise<Table | null>;
  createAnkiStyleTable: (name: string, tags: string[]) => Promise<Table | null>;
  deleteTable: (tableId: string) => Promise<void>;
  updateTable: (updatedTable: Table) => Promise<boolean>;
  upsertRow: (tableId: string, row: VocabRow) => Promise<boolean>;
  batchUpdateRows: (tableId: string, updates: { rowId: string, changes: Partial<VocabRow> }[]) => Promise<void>;
  addRows: (tableId: string, newRows: VocabRow[]) => Promise<void>;
  deleteRows: (tableId: string, rowIds: string[]) => Promise<void>;
  importTables: (importedTables: Table[], appendToTableId?: string) => void;
  createFolder: (name: string) => Promise<void>;
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveTableToFolder: (tableId: string, folderId: string | null) => Promise<void>;
  moveNoteToFolder: (noteId: string, folderId: string | null) => Promise<void>;
  reorderFolders: (draggedId: string, targetId: string) => void;
  setTables: (tables: Table[]) => void;
  setInitialData: (data: { tables: Table[], folders: Folder[] }) => void;
  createClozeCard: (options: { 
      note: Note; 
      selectionText: string; 
      selectionStartIndex: number; 
      clozeOptions: {
          targetTableId: string;
          contextBefore: number;
          contextAfter: number;
          clozeType: StudyMode;
          hint: 'wordCount' | 'none';
          extraInfo?: string;
          scope: 'single' | 'all';
      }
  }) => Promise<void>;
  
  fetchTablePayload: (tableId: string, force?: boolean) => Promise<void>;
  setTablePublicStatus: (tableId: string, isPublic: boolean) => void;
  generateUniqueShortCode: (tableName: string) => string;
}

// Helper to get engine instance
const getEngine = () => VmindSyncEngine.getInstance();

const dbRowToVocabRow = (row: any): VocabRow => {
    const { stats, table_id, user_id, row_id_num, ...rest } = row;
    const { last_studied, flashcard_status, flashcard_encounters, is_flashcard_reviewed, last_practice_date, scramble_encounters, scramble_ratings, theater_encounters, anki_repetitions, anki_ease_factor, anki_interval, anki_due_date, confi_viewed, ...restStats } = stats;
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
    return { ...rest, stats: statsCamel, rowIdNum: row_id_num };
};

/**
 * Smart Healing Algorithm v2.7
 * Ensures Row Identity Stability by only fixing missing or duplicate IDs.
 * Now integrated with re-indexing logic during migration.
 */
const smartHealRowIds = (rows: VocabRow[], forceReindex = false): { rows: VocabRow[], modifiedRows: VocabRow[] } => {
    // If forced re-index (Migration), we ignore current IDs and reset to 1..N based on current sort
    if (forceReindex) {
        const modifiedRows: VocabRow[] = [];
        const healedRows = rows.map((r, index) => {
            const newIdNum = index + 1;
            if (r.rowIdNum !== newIdNum) {
                const fixed = { ...r, rowIdNum: newIdNum };
                modifiedRows.push(fixed);
                return fixed;
            }
            return r;
        });
        return { rows: healedRows, modifiedRows };
    }

    // Default Healing: Append-Only Logic (Max + N)
    let currentMax = 0;
    rows.forEach(r => {
        if (r.rowIdNum && r.rowIdNum > 0) {
            currentMax = Math.max(currentMax, r.rowIdNum);
        }
    });

    const seenIds = new Set<number>();
    const processedRows: VocabRow[] = [];
    const modifiedRows: VocabRow[] = [];

    rows.forEach(r => {
        let rowIdNum = r.rowIdNum;
        let isModified = false;

        if (!rowIdNum || rowIdNum <= 0 || seenIds.has(rowIdNum)) {
            currentMax++;
            rowIdNum = currentMax;
            isModified = true;
        }

        seenIds.add(rowIdNum);
        
        if (isModified) {
            const fixedRow = { ...r, rowIdNum };
            processedRows.push(fixedRow);
            modifiedRows.push(fixedRow);
        } else {
            processedRows.push(r);
        }
    });

    return { rows: processedRows, modifiedRows };
};

export const useTableStore = create<TableState>()(
    (set, get) => ({
      tables: [],
      folders: [],
      loadingTableIds: new Set(),
      
      generateUniqueShortCode: (tableName: string) => {
          const { tables } = get();
          const usedCodes = new Set(tables.map(t => t.shortCode).filter(Boolean));
          
          // 1. Sanitize: Uppercase, A-Z only
          const base = tableName.replace(/[^a-zA-Z]/g, '').toUpperCase();
          let candidate = base.substring(0, 3);
          
          // Pad if too short
          while (candidate.length < 3) {
              candidate += 'X';
          }
          
          if (!usedCodes.has(candidate)) return candidate;
          
          // 2. Iterate variations
          let suffix = 1;
          while (true) {
              // Try replacing last char with number, e.g. VO1, VO2... then V10...
              const prefixLen = suffix < 10 ? 2 : 1;
              const nextCandidate = candidate.substring(0, prefixLen) + suffix;
              if (!usedCodes.has(nextCandidate)) return nextCandidate;
              suffix++;
              if (suffix > 99) break; // Fallback
          }
          
          return 'UNK'; // Should theoretically never happen with reasonable usage
      },

      fetchTablePayload: async (tableId: string, force = false) => {
          const { tables, loadingTableIds } = get();
          const table = tables.find(t => t.id === tableId);
          
          if (!table || loadingTableIds.has(tableId)) return;
          
          // Bypass check if forced
          if (!force && table.rows.length > 0) return;

          set(state => ({ loadingTableIds: new Set(state.loadingTableIds).add(tableId) }));
          
          try {
              // 1. Check Cache (Skip if forced refresh)
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
              
              // 2. Cache Miss OR Forced: Fetch from Server
              const { data, error } = await supabase.from('vocab_rows').select('*').eq('table_id', tableId);
              
              if (error) throw error;
              
              let fetchedRows = (data as any[]).map(dbRowToVocabRow);
              
              // Sort by Row ID Num to maintain order
              fetchedRows.sort((a, b) => (a.rowIdNum || 0) - (b.rowIdNum || 0));
              
              // --- Lazy Healing v2.6.3: Smart ID Repair ---
              const { rows: healedRows, modifiedRows } = smartHealRowIds(fetchedRows);
              
              if (modifiedRows.length > 0) {
                  console.warn(`[Vmind] Smart Healing: Fixed ${modifiedRows.length} row IDs for table ${tableId}`);
                  fetchedRows = healedRows;
                  
                  // Persist Repairs Asynchronously (with Queue check to prevent flooding)
                  setTimeout(async () => {
                      const { isGuest, session } = useUserStore.getState();
                      const engine = VmindSyncEngine.getInstance();
                      
                      // Update Cache with healed data
                      cacheService.saveTableRows(tableId, fetchedRows);
                      
                      // Update Server: Only push if queue isn't already jammed
                      if (!isGuest && session) {
                          const { isEmpty } = await engine.getQueueStatus();
                          // Only auto-heal push if queue is healthy to avoid infinite retry loops on corrupt data
                          if (isEmpty && modifiedRows.length < 50) { 
                              modifiedRows.forEach(fixedRow => {
                                  engine.push('UPSERT_ROW', { tableId: tableId, row: fixedRow }, session.user.id);
                              });
                          } else {
                              console.warn("[Vmind] Skipping auto-heal push due to existing queue or high volume. Please check data manually.");
                          }
                      }
                  }, 1000);
              }
              // ---------------------------------------------------------
              
              // 3. Update Store
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

      createTable: async (name, columnsStr) => {
        const { session, isGuest } = useUserStore.getState();
        const { generateUniqueShortCode } = get();
        const columnNames = columnsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (columnNames.length === 0) return null;

        const newColumns: Column[] = columnNames.map((colName) => ({ id: crypto.randomUUID(), name: colName }));
        const shortCode = generateUniqueShortCode(name);
        
        const newTable: Table = { 
            id: crypto.randomUUID(), 
            name, 
            shortCode,
            columns: newColumns, 
            rows: [], 
            relations: [], 
            createdAt: Date.now(), 
            modifiedAt: Date.now() 
        };
        
        // Optimistic update
        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) return newTable;

        // Use Sync Engine
        getEngine().push('UPSERT_TABLE', { tableData: newTable }, session.user.id);
            
        // Initialize empty cache for new table
        await cacheService.saveTableRows(newTable.id, []);
            
        return newTable;
      },
      createAnkiStyleTable: async (name, tags) => {
        const { session, isGuest } = useUserStore.getState();
        const { findOrCreateTagsByName } = useTagStore.getState();
        const { generateUniqueShortCode } = get();
        
        const frontCol: Column = { id: crypto.randomUUID(), name: 'Front' };
        const backCol: Column = { id: crypto.randomUUID(), name: 'Back' };

        const randomTemplate = DESIGN_TEMPLATES[Math.floor(Math.random() * DESIGN_TEMPLATES.length)];

        const createDesignForRelation = (relation: Relation): RelationDesign => {
            const theme = useUIStore.getState().theme;
            const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
            const labelTypo: TypographyDesign = { ...defaultTypo, color: theme === 'dark' ? '#94a3b8' : '#64748b', fontSize: '0.875rem', fontWeight: 'normal', textAlign: 'left' };

            const design: RelationDesign = JSON.parse(JSON.stringify(randomTemplate.design));
            design.front.typography = {};
            design.back.typography = {};
            
            relation.questionColumnIds.forEach(id => {
                design.front.typography[id] = { ...randomTemplate.frontTypography };
            });
            relation.answerColumnIds.forEach(id => {
                design.back.typography[id] = { ...randomTemplate.backTypography };
            });
            
            const frontLabelBox: TextBox = { id: crypto.randomUUID(), text: 'Question:', typography: labelTypo };
            design.front.textBoxes = [frontLabelBox];
            design.front.elementOrder = [frontLabelBox.id, ...relation.questionColumnIds];
            
            const backLabelBox: TextBox = { id: crypto.randomUUID(), text: 'Answer:', typography: labelTypo };
            design.back.textBoxes = [backLabelBox];
            design.back.elementOrder = [backLabelBox.id, ...relation.answerColumnIds];

            design.designLinked = true;
            return design;
        };

        const relation1: Relation = {
            id: crypto.randomUUID(),
            name: 'Front -> Back',
            questionColumnIds: [frontCol.id],
            answerColumnIds: [backCol.id],
            compatibleModes: [StudyMode.Flashcards],
            tags: ['Anki']
        };
        relation1.design = createDesignForRelation(relation1);

        const relation2: Relation = {
            id: crypto.randomUUID(),
            name: 'Back -> Front',
            questionColumnIds: [backCol.id],
            answerColumnIds: [frontCol.id],
            compatibleModes: [StudyMode.Flashcards],
            tags: ['Anki']
        };
        relation2.design = createDesignForRelation(relation2);
        
        const tagObjects = findOrCreateTagsByName(tags);
        const tagIds = tagObjects.map(t => t.id);
        const shortCode = generateUniqueShortCode(name);

        const newTable: Table = {
            id: crypto.randomUUID(),
            name,
            shortCode,
            columns: [frontCol, backCol],
            rows: [],
            relations: [relation1, relation2],
            tagIds: tagIds,
            tags: [],
            createdAt: Date.now(),
            modifiedAt: Date.now(),
        };
        
        // Optimistic update
        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) {
            return newTable;
        }

        // Use Sync Engine
        getEngine().push('UPSERT_TABLE', { tableData: newTable }, session.user.id);
            
        // Init cache
        await cacheService.saveTableRows(newTable.id, []);
            
        return newTable;
      },
      deleteTable: async (tableId) => {
        const { session, isGuest } = useUserStore.getState();
        
        // Optimistic update
        set(state => ({
          tables: state.tables.filter(t => t.id !== tableId),
          folders: state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }))
        }));

        if (isGuest || !session) return;
        
        // Use Engine for resilience
        getEngine().push('DELETE_TABLE', { tableId }, session.user.id);
      },
      updateTable: async (updatedTable) => {
        const { session, isGuest } = useUserStore.getState();
        
        const tableWithTimestamp = {
            ...updatedTable,
            createdAt: updatedTable.createdAt || Date.now(),
            modifiedAt: Date.now(),
        };
        
        // Update cache if rows changed
        if (updatedTable.rows) {
            tableWithTimestamp.rowCount = updatedTable.rows.length;
            if (!isGuest) {
                cacheService.saveTableRows(updatedTable.id, updatedTable.rows);
            }
        }
        
        set(state => ({ tables: state.tables.map(t => t.id === tableWithTimestamp.id ? tableWithTimestamp : t) }));

        // Activity Tracking: Increment counter for this table
        useCounterStore.getState().increment(updatedTable.id);

        if (isGuest || !session) {
            return true;
        }

        getEngine().push('UPSERT_TABLE', { tableData: tableWithTimestamp }, session.user.id);
        return true;
      },
      setTablePublicStatus: (tableId, isPublic) => {
          const { updateTable } = get();
          const table = get().tables.find(t => t.id === tableId);
          if (table) {
              updateTable({ ...table, isPublic });
          }
      },
      upsertRow: async (tableId, row) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const originalTable = originalTables.find(t => t.id === tableId);
        if (!originalTable) return false;

        const modifiedAt = Date.now();
        const isNew = !originalTable.rows.some(r => r.id === row.id);
        
        // --- Row ID Management ---
        // If updating, preserve existing ID. If new, increment max + 1.
        let rowWithId = { ...row };
        if (isNew) {
            const currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
            rowWithId.rowIdNum = row.rowIdNum || currentMax + 1;
        } else {
             // Preserve existing ID if not provided in update
             const existingRow = originalTable.rows.find(r => r.id === row.id);
             if (existingRow) {
                 rowWithId.rowIdNum = row.rowIdNum || existingRow.rowIdNum;
                 // Fallback for legacy rows being updated that might still lack an ID
                 if (!rowWithId.rowIdNum) {
                     const currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
                     rowWithId.rowIdNum = currentMax + 1;
                 }
             }
        }
        // -------------------------
        
        // Calculate new rows list
        const newRows = isNew ? [...originalTable.rows, rowWithId] : originalTable.rows.map(r => r.id === rowWithId.id ? rowWithId : r);

        // Optimistic update
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: newRows, rowCount: newRows.length, modifiedAt };
            })
        }));
        
        // Update Cache (Write-Through)
        if (!isGuest) {
            cacheService.saveTableRows(tableId, newRows);
        }
        
        // Handle Side Effects (Confidence Queue Reconciliation)
        // This block runs for both ADD and UPDATE (e.g. tag changes) to ensure queue consistency
        (async () => {
            const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
            const { tags: allTags } = useTagStore.getState();
            
            let didUpdate = false;
            
            const updatedProgresses = confidenceProgresses.map(progress => {
                // Optimization: Skip if this table isn't part of the set
                if (!progress.tableIds.includes(tableId)) return progress;

                const isInQueue = progress.queue.includes(rowWithId.id);

                // Check Filtering Criteria
                const filterTagNames = (progress.tags || []).filter(t => !t.startsWith('FC+'));
                const hasFilter = filterTagNames.length > 0;
                let matchesFilter = true;

                if (hasFilter) {
                    const rowTagNames = (rowWithId.tagIds || []).map(id => allTags.find(t => t.id === id)?.name).filter(Boolean) as string[];
                    matchesFilter = rowTagNames.some(name => filterTagNames.includes(name));
                }
    
                // Scenario 1: Row matches filter (or no filter) -> Should be in queue
                if (matchesFilter) {
                    if (!isInQueue) {
                        didUpdate = true;
                        return { 
                            ...progress, 
                            queue: [...progress.queue, rowWithId.id], 
                            newWordCount: (progress.newWordCount || 0) + 1 
                        };
                    }
                }
                // Scenario 2: Row NO LONGER matches filter (but was in queue) -> Must be removed
                else if (isInQueue) {
                    didUpdate = true;
                    const newQueue = progress.queue.filter(q => q !== rowWithId.id);
                    
                    // Cleanup cardStates (garbage collection)
                    const newCardStates = { ...progress.cardStates };
                    delete newCardStates[rowWithId.id];

                    // Fix Index: Ensure currentIndex is valid in the shortened queue
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

        // Activity Tracking: Increment counter for this table
        useCounterStore.getState().increment(tableId);

        if (isGuest || !session) {
            return true;
        }

        // ENGINE INTEGRATION: Push only the ROW change
        getEngine().push('UPSERT_ROW', { tableId, row: rowWithId }, session.user.id);
        
        return true;
    },
    // New action for batch updating rows (e.g. for drag-to-fill)
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

        // Optimistic update
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: newRows, modifiedAt };
            })
        }));
        
        // Update Cache (Write-Through)
        if (!isGuest) {
            cacheService.saveTableRows(tableId, newRows);
        }

        if (isGuest || !session) return;

        // Push updates to engine
        updates.forEach(update => {
            const row = newRows.find(r => r.id === update.rowId);
            if(row) {
                getEngine().push('UPSERT_ROW', { tableId, row }, session.user.id);
            }
        });
    },
    addRows: async (tableId, newRows) => {
        const { session, isGuest } = useUserStore.getState();
        const modifiedAt = Date.now();
        
        const originalTable = get().tables.find(t => t.id === tableId);
        if (!originalTable) return;
        
        // --- Bulk ID Assignment ---
        let currentMax = originalTable.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0);
        const newRowsWithIds = newRows.map(r => {
             const rowIdNum = r.rowIdNum || ++currentMax;
             return { ...r, rowIdNum };
        });
        // --------------------------
        
        const updatedRows = [...originalTable.rows, ...newRowsWithIds];

        // Optimistic
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: updatedRows, rowCount: updatedRows.length, modifiedAt };
            })
        }));
        
        // Update Cache (Write-Through)
        if (!isGuest) {
            cacheService.saveTableRows(tableId, updatedRows);
        }

        if (isGuest || !session) return;

        // Bulk insert via engine
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

        // Optimistic
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: updatedRows, rowCount: updatedRows.length, modifiedAt };
            })
        }));

        // Cleanup Logic for ConfidenceProgress queues and states
        const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
        const updatedProgresses = confidenceProgresses.map(progress => {
            // Optimization: Only check sets that include this table
            if (!progress.tableIds.includes(tableId)) return progress;

            const originalQueueLength = progress.queue.length;
            const newQueue = progress.queue.filter(id => !rowIdSet.has(id));
            
            // If items were removed
            if (newQueue.length !== originalQueueLength) {
                // Cleanup cardStates
                const newCardStates = { ...progress.cardStates };
                rowIds.forEach(id => delete newCardStates[id]);

                // Reset or adjust current index if out of bounds
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
        
        // Update Cache (Write-Through)
        if (!isGuest) {
             cacheService.saveTableRows(tableId, updatedRows);
        }

        if (isGuest || !session) return;

        getEngine().push('DELETE_ROWS', { tableId, rowIds }, session.user.id);
    },
      importTables: (importedTables, appendToTableId) => {
        set(state => {
          if (appendToTableId) {
            const rowsToAppend = importedTables[0]?.rows || [];
            // For import, we need to update the specific table state
            const targetTable = state.tables.find(t => t.id === appendToTableId);
            
            // ID Assignment for Import
            let currentMax = targetTable?.rows.reduce((max, r) => Math.max(max, r.rowIdNum || 0), 0) || 0;
            const rowsWithIds = rowsToAppend.map(r => ({ ...r, rowIdNum: ++currentMax }));
            
            const updatedRows = targetTable ? [...targetTable.rows, ...rowsWithIds] : [];
            
            // Update cache for appended table
             if (!useUserStore.getState().isGuest && targetTable) {
                cacheService.saveTableRows(appendToTableId, updatedRows);
            }
            
            return {
              tables: state.tables.map(t =>
                t.id === appendToTableId ? { ...t, rows: updatedRows, rowCount: updatedRows.length } : t
              )
            };
          } else {
            const existingIds = new Set(state.tables.map(t => t.id));
            const newTables = importedTables.map(t =>
              existingIds.has(t.id) ? { ...t, id: crypto.randomUUID() } : t
            );
            
            // ID Assignment for New Tables
            newTables.forEach(t => {
                let currentMax = 0;
                t.rows = t.rows.map(r => ({ ...r, rowIdNum: ++currentMax }));
                if (!t.shortCode) {
                    t.shortCode = get().generateUniqueShortCode(t.name);
                }
            });
            
            // Update cache for new tables
            if (!useUserStore.getState().isGuest) {
                newTables.forEach(t => cacheService.saveTableRows(t.id, t.rows));
            }

            return { tables: [...state.tables, ...newTables] };
          }
        });
      },
      createFolder: async (name) => {
        const { session, isGuest, settings, setSettings } = useUserStore.getState();
        const newFolder: Folder = { id: crypto.randomUUID(), name, tableIds: [], noteIds: [], createdAt: Date.now() };
    
        set(state => ({ folders: [...state.folders, newFolder] }));
        const newOrder = [...(settings.folderOrder || []), newFolder.id];
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
        
        getEngine().push('UPSERT_FOLDER', { folder: newFolder }, session.user.id);
      },
      updateFolder: async (folderId, updates) => {
          const { session, isGuest } = useUserStore.getState();
          const folder = get().folders.find(f => f.id === folderId);
          if (!folder) return;

          const updatedFolder = { ...folder, ...updates };

          set(state => ({
              folders: state.folders.map(f => f.id === folderId ? updatedFolder : f)
          }));

          if (isGuest || !session) return;
          getEngine().push('UPSERT_FOLDER', { folder: updatedFolder }, session.user.id);
      },
      deleteFolder: async (folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const { settings, setSettings } = useUserStore.getState();
    
        set(state => ({ folders: state.folders.filter(f => f.id !== folderId) }));
        const newOrder = (settings.folderOrder || []).filter(id => id !== folderId);
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
    
        getEngine().push('DELETE_FOLDER', { folderId }, session.user.id);
      },
      moveTableToFolder: async (tableId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;
        
        let oldFolderToSync: Folder | undefined;
        let newFolderToSync: Folder | undefined;

        // Optimistic update
        set(state => {
            const folders = state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }));
            const oldFolder = originalFolders.find(f => f.tableIds.includes(tableId));
            if (oldFolder) {
                oldFolderToSync = folders.find(f => f.id === oldFolder.id)!;
            }

            if (folderId) {
                const folder = folders.find(f => f.id === folderId);
                if (folder) {
                    folder.tableIds.push(tableId);
                    newFolderToSync = folder;
                }
            }
            return { folders };
        });

        if (isGuest || !session) return;
        
        // Use Sync Engine for both folders affected
        if (oldFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: oldFolderToSync }, session.user.id);
        }
        if (newFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: newFolderToSync }, session.user.id);
        }
      },
      moveNoteToFolder: async (noteId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;
        
        let oldFolderToSync: Folder | undefined;
        let newFolderToSync: Folder | undefined;

        // Optimistic update
        set(state => {
            const folders = state.folders.map(f => ({ ...f, noteIds: (f.noteIds || []).filter(id => id !== noteId) }));
            const oldFolder = originalFolders.find(f => (f.noteIds || []).includes(noteId));
            if (oldFolder) {
                oldFolderToSync = folders.find(f => f.id === oldFolder.id)!;
            }

            if (folderId) {
                const folder = folders.find(f => f.id === folderId);
                if (folder) {
                    if (!folder.noteIds) folder.noteIds = [];
                    folder.noteIds.push(noteId);
                    newFolderToSync = folder;
                }
            }
            return { folders };
        });

        if (isGuest || !session) return;
        
        // Use Sync Engine for both folders affected
        if (oldFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: oldFolderToSync }, session.user.id);
        }
        if (newFolderToSync) {
            getEngine().push('UPSERT_FOLDER', { folder: newFolderToSync }, session.user.id);
        }
      },
      reorderFolders: (draggedId, targetId) => {
        const { folders } = get();
        const { settings, setSettings } = useUserStore.getState();
        const currentOrder = settings.folderOrder && settings.folderOrder.length > 0 
            ? settings.folderOrder 
            : [...folders].sort((a,b) => a.createdAt - b.createdAt).map(f => f.id);
    
        const draggedIndex = currentOrder.indexOf(draggedId);
        const targetIndex = currentOrder.indexOf(targetId);
    
        if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === draggedIndex) return;
    
        const newOrder = [...currentOrder];
        const [draggedItem] = newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem);
        
        setSettings({ ...settings, folderOrder: newOrder });
      },
      setTables: (tables) => set({ tables }),
      setInitialData: (data) => {
        set(state => {
            const { generateUniqueShortCode } = get();
            
            const newTables = data.tables.map(newTable => {
                const existingTable = state.tables.find(t => t.id === newTable.id);
                let rowsToUse = newTable.rows;
                // Metadata First: Use the exact count from the DB if provided (from AppContent)
                // If not provided, default to current length or 0.
                let rowCountToUse = newTable.rowCount; 

                if (existingTable && existingTable.rows.length > 0 && newTable.rows.length === 0) {
                    // Preserve existing rows if new data has none but old data does
                    rowsToUse = existingTable.rows;
                    // Trust local length if we have the rows loaded
                    rowCountToUse = existingTable.rows.length;
                }
                
                // --- Namespacing Migration v2.7 ---
                let finalTable = { ...newTable, rows: rowsToUse, rowCount: rowCountToUse };
                let isMigrationNeeded = false;
                
                if (!finalTable.shortCode) {
                    finalTable.shortCode = generateUniqueShortCode(finalTable.name);
                    isMigrationNeeded = true;
                }
                
                // --- Lazy Healing v2.7: Smart ID Re-indexing (Force if Migrating) ---
                // Note: Only heal if we actually have rows to heal!
                if (rowsToUse.length > 0) {
                    const { rows: healedRows, modifiedRows } = smartHealRowIds(rowsToUse, isMigrationNeeded);

                    if (modifiedRows.length > 0 || isMigrationNeeded) {
                        console.warn(`[Vmind] Data Migration/Healing: Table ${finalTable.shortCode} - Fixed ${modifiedRows.length} IDs.`);
                        finalTable.rows = healedRows;
                        // Update count to match healed rows just in case
                        finalTable.rowCount = healedRows.length;

                        // Trigger persistence (Async)
                        setTimeout(() => {
                             const { isGuest, session } = useUserStore.getState();
                             // Update Cache
                             cacheService.saveTableRows(finalTable.id, healedRows);
                             
                             // PHASE 1 FIX: Disable Auto-Push during Hydration
                             // We do NOT push to server here. This prevents "Phantom Push" (Sync Loop).
                             // The missing shortCode or IDs will be synced only when the user
                             // explicitly edits this table later.
                        }, 2000); 
                    }
                }
                // ---------------------------------------------------

                return finalTable;
            });

            return { tables: newTables, folders: data.folders };
        });
      },
      createClozeCard: async ({ note, selectionText, selectionStartIndex, clozeOptions }) => {
        const { updateTable, addRows } = get();
        const { addContextLink } = useContextLinkStore.getState();
    
        let targetTable: Table | undefined | null;
    
        if (clozeOptions.targetTableId === 'new') {
            const newTableName = `Reading Notes - ${note.title}`;
            targetTable = await get().createTable(newTableName, 'Cloze Question,Cloze Answer');
            if (!targetTable) throw new Error("Failed to create new table for cloze card.");
            targetTable = get().tables.find(t => t.id === targetTable!.id);
        } else {
            targetTable = get().tables.find(t => t.id === clozeOptions.targetTableId);
        }
    
        if (!targetTable) throw new Error("Target table not found for cloze card.");
    
        let updatedTable = JSON.parse(JSON.stringify(targetTable));
    
        let questionCol = updatedTable.columns.find((c: Column) => c.name === 'Cloze Question');
        if (!questionCol) {
            questionCol = { id: crypto.randomUUID(), name: 'Cloze Question' };
            updatedTable.columns.push(questionCol);
        }
        let answerCol = updatedTable.columns.find((c: Column) => c.name === 'Cloze Answer');
        if (!answerCol) {
            answerCol = { id: crypto.randomUUID(), name: 'Cloze Answer' };
            updatedTable.columns.push(answerCol);
        }
        
        // --- NEW: Handle Extra Info Column ---
        let infoCol: Column | undefined;
        if (clozeOptions.extraInfo) {
            infoCol = updatedTable.columns.find((c: Column) => 
                ['notes', 'extra', 'info', 'explanation'].includes(c.name.toLowerCase())
            );
            if (!infoCol) {
                infoCol = { id: crypto.randomUUID(), name: 'Notes' };
                updatedTable.columns.push(infoCol);
            }
        }

        // Find or Create Relation
        let relation = updatedTable.relations.find((r: Relation) => 
            r.compatibleModes?.includes(StudyMode.ClozeTyping) || 
            r.tags?.includes('Cloze')
        );

        const relationId = relation ? relation.id : crypto.randomUUID();

        // Configure Design (V3 Requirement)
        // If creating new or updating, ensure design exists with elementOrder
        const defaultTypo = DEFAULT_TYPOGRAPHY;
        
        const frontDesign: CardFaceDesign = relation?.design?.front || {
            backgroundType: 'solid',
            backgroundValue: 'var(--color-surface)',
            layout: 'vertical',
            typography: {},
            elementOrder: [] // Initialize empty if new
        };
        
        // Ensure Question Column is in Front Design
        if (!frontDesign.elementOrder) frontDesign.elementOrder = [];
        if (!frontDesign.elementOrder.includes(questionCol.id)) {
            frontDesign.elementOrder.push(questionCol.id);
            frontDesign.typography[questionCol.id] = { ...defaultTypo, fontSize: '1.25rem' };
        }

        const backDesign: CardFaceDesign = relation?.design?.back || {
            backgroundType: 'solid',
            backgroundValue: 'var(--color-secondary-50)',
            layout: 'vertical',
            typography: {},
            elementOrder: []
        };
        
        // Ensure Answer Column is in Back Design
        if (!backDesign.elementOrder) backDesign.elementOrder = [];
        if (!backDesign.elementOrder.includes(answerCol.id)) {
            backDesign.elementOrder.push(answerCol.id);
            backDesign.typography[answerCol.id] = { ...defaultTypo, fontSize: '1.25rem', color: '#16a34a' }; // Green for answer
        }
        
        // If extra info exists, add to back design
        if (infoCol) {
             if (!backDesign.elementOrder.includes(infoCol.id)) {
                backDesign.elementOrder.push(infoCol.id);
                backDesign.typography[infoCol.id] = { ...defaultTypo, fontSize: '1rem', fontStyle: 'italic', fontWeight: 'normal' };
            }
        }

        const newRelation: Relation = {
            id: relationId,
            name: relation ? relation.name : 'Cloze Practice',
            questionColumnIds: [questionCol.id],
            answerColumnIds: [answerCol.id],
            compatibleModes: [clozeOptions.clozeType], // StudyMode.ClozeTyping or ClozeMCQ
            interactionModes: [clozeOptions.clozeType],
            tags: ['StudySession', 'Cloze'],
            clozeConfig: {
                hint: clozeOptions.hint,
                contextBefore: clozeOptions.contextBefore,
                contextAfter: clozeOptions.contextAfter,
                extraInfoColId: infoCol?.id
            },
            design: {
                front: frontDesign,
                back: backDesign,
                designLinked: true
            }
        };

        // Update Table with new columns/relation
        if (relation) {
            updatedTable.relations = updatedTable.relations.map((r: Relation) => r.id === relationId ? newRelation : r);
        } else {
            updatedTable.relations.push(newRelation);
        }
        
        await updateTable(updatedTable);

        // --- SCOPE LOGIC: SINGLE vs ALL ---
        const rowsToInsert: VocabRow[] = [];
        const linksToInsert: any[] = [];

        // Helper to generate row data for a specific match index
        const generateRowAndLink = (startIndex: number) => {
            const contextData = findContextSentences(
                note.content || '', 
                startIndex, 
                selectionText.length, 
                clozeOptions.contextBefore, 
                clozeOptions.contextAfter
            );
            
            const fullSentence = contextData.fullContext;
            const newRowId = crypto.randomUUID();
            
            const newRow: VocabRow = {
                id: newRowId,
                cols: {
                    [questionCol.id]: fullSentence,
                    [answerCol.id]: selectionText,
                    ...(infoCol ? { [infoCol.id]: clozeOptions.extraInfo || '' } : {})
                },
                stats: { 
                    correct: 0, incorrect: 0, lastStudied: null, 
                    flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null 
                }
            };
            
            const link = { 
                rowId: newRowId, 
                sourceType: 'reading' as const, 
                sourceId: note.id, 
                metadata: { 
                    snippet: fullSentence,
                    selection: selectionText,
                    selectionStartIndex: startIndex,
                } 
            };

            return { newRow, link };
        };

        if (clozeOptions.scope === 'all' && note.content) {
             // Escape special regex characters in selectionText
             const escapedText = selectionText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
             const regex = new RegExp(escapedText, 'gi');
             let match;
             while ((match = regex.exec(note.content)) !== null) {
                 const { newRow, link } = generateRowAndLink(match.index);
                 rowsToInsert.push(newRow);
                 linksToInsert.push(link);
             }
        } else {
             // Default 'single' behavior
             const { newRow, link } = generateRowAndLink(selectionStartIndex);
             rowsToInsert.push(newRow);
             linksToInsert.push(link);
        }
        
        // Batch Insert Rows
        if (rowsToInsert.length > 0) {
            await get().addRows(targetTable.id, rowsToInsert);
            
            // Batch Insert Links (Loop as store doesn't support batch yet)
            for (const link of linksToInsert) {
                await addContextLink(link);
            }
        }
      },
    })
);
