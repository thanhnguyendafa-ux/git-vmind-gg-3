
import { create } from 'zustand';
import { Table, Folder, Column, SessionWordResult, FlashcardStatus, VocabRow, StudyMode, Relation, RelationDesign, TypographyDesign, TextBox, AnkiConfig, Note } from '../types';
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


interface TableState {
  tables: Table[];
  folders: Folder[];
  loadingTableIds: Set<string>; // Tracks which tables are currently fetching payload
  
  createTable: (name: string, columnsStr: string) => Promise<Table | null>;
  createAnkiStyleTable: (name: string, tags: string[]) => Promise<Table | null>;
  deleteTable: (tableId: string) => Promise<void>;
  updateTable: (updatedTable: Table) => Promise<boolean>;
  upsertRow: (tableId: string, row: VocabRow) => Promise<boolean>;
  addRows: (tableId: string, newRows: VocabRow[]) => Promise<void>;
  deleteRows: (tableId: string, rowIds: string[]) => Promise<void>;
  importTables: (importedTables: Table[], appendToTableId?: string) => void;
  createFolder: (name: string) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveTableToFolder: (tableId: string, folderId: string | null) => Promise<void>;
  reorderFolders: (draggedId: string, targetId: string) => void;
  setTables: (tables: Table[]) => void;
  setInitialData: (data: { tables: Table[], folders: Folder[] }) => void;
  createClozeCard: (options: { note: Note; selectionText: string; selectionStartIndex: number; clozeOptions: any }) => Promise<void>;
  
  fetchTablePayload: (tableId: string, force?: boolean) => Promise<void>;
}

// Helper to get engine instance
const getEngine = () => VmindSyncEngine.getInstance();

const dbRowToVocabRow = (row: any): VocabRow => {
    const { stats, table_id, user_id, ...rest } = row;
    const { last_studied, flashcard_status, flashcard_encounters, is_flashcard_reviewed, last_practice_date, scramble_encounters, scramble_ratings, theater_encounters, anki_repetitions, anki_ease_factor, anki_interval, anki_due_date, ...restStats } = stats;
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
    };
    return { ...rest, stats: statsCamel };
};

export const useTableStore = create<TableState>()(
    (set, get) => ({
      tables: [],
      folders: [],
      loadingTableIds: new Set(),

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
              
              const fetchedRows = (data as any[]).map(dbRowToVocabRow);
              
              // 3. Update Store with Self-Healing Metadata
              // We update rowCount to match actual fetched rows, correcting any metadata lies.
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
        const columnNames = columnsStr.split(',').map(s => s.trim()).filter(Boolean);
        if (columnNames.length === 0) return null;

        const newColumns: Column[] = columnNames.map((colName) => ({ id: crypto.randomUUID(), name: colName }));
        const newTable: Table = { id: crypto.randomUUID(), name, columns: newColumns, rows: [], relations: [], createdAt: Date.now(), modifiedAt: Date.now() };
        
        // Optimistic update
        set(state => ({ tables: [...state.tables, newTable] }));

        if (isGuest || !session) return newTable;

        try {
            const { rows, rowCount, imageConfig, audioConfig, aiPrompts, isPublic, createdAt, modifiedAt, ...tableMetadata } = newTable;
            const dataForDb = {
                ...tableMetadata,
                image_config: imageConfig,
                audio_config: audioConfig,
                ai_prompts: aiPrompts,
                is_public: isPublic,
                user_id: session.user.id,
                created_at: new Date(createdAt!).toISOString(),
                modified_at: new Date(modifiedAt!).toISOString(),
            };

            const { error } = await supabase.from('tables').insert(dataForDb);
            if (error) throw error;
            
            // Initialize empty cache for new table
            await cacheService.saveTableRows(newTable.id, []);
            
            return newTable;
        } catch (error: any) {
            console.error("Failed to create table:", error.message || error);
            // Revert on error
            set(state => ({ tables: state.tables.filter(t => t.id !== newTable.id) }));
            useUIStore.getState().showToast("Failed to create table.", "error");
            return null;
        }
      },
      createAnkiStyleTable: async (name, tags) => {
        const { session, isGuest } = useUserStore.getState();
        const { findOrCreateTagsByName } = useTagStore.getState();
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

        const newTable: Table = {
            id: crypto.randomUUID(),
            name,
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

        // Save to supabase
        try {
            const { rows, rowCount, imageConfig, audioConfig, aiPrompts, isPublic, createdAt, modifiedAt, tags: deprecatedTags, ...tableMetadata } = newTable;
            const dataForDb: any = {
                ...tableMetadata,
                image_config: imageConfig,
                audio_config: audioConfig,
                ai_prompts: aiPrompts,
                is_public: isPublic,
                user_id: session.user.id,
                created_at: new Date(createdAt!).toISOString(),
                modified_at: new Date(modifiedAt!).toISOString(),
            };
            
            if (dataForDb.tagIds) {
                dataForDb.tag_ids = dataForDb.tagIds;
                delete dataForDb.tagIds;
            }

            const { error } = await supabase.from('tables').insert(dataForDb);
            if (error) throw error;
            
            // Init cache
            await cacheService.saveTableRows(newTable.id, []);
            
            return newTable;
        } catch (error: any) {
            console.error("Failed to create Anki-style table:", error.message || error);
            // Revert on error
            set(state => ({ tables: state.tables.filter(t => t.id !== newTable.id) }));
            useUIStore.getState().showToast("Failed to create Anki-style table.", "error");
            return null;
        }
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

        if (isGuest || !session) {
            return true;
        }

        getEngine().push('UPDATE_TABLE', { tableData: tableWithTimestamp }, session.user.id);
        return true;
      },
      upsertRow: async (tableId, row) => {
        const { session, isGuest } = useUserStore.getState();
        const originalTables = get().tables;
        const originalTable = originalTables.find(t => t.id === tableId);
        if (!originalTable) return false;

        const modifiedAt = Date.now();
        const isNew = !originalTable.rows.some(r => r.id === row.id);
        
        // Calculate new rows list
        const newRows = isNew ? [...originalTable.rows, row] : originalTable.rows.map(r => r.id === row.id ? row : r);

        // Optimistic update
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: newRows, rowCount: newRows.length, modifiedAt };
            })
        }));
        
        // Update Cache
        if (!isGuest) {
            cacheService.saveTableRows(tableId, newRows);
        }
        
        // Handle Side Effects (Confidence Queue updates)
        if (isNew) {
            (async () => {
                const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
                const { tags: allTags } = useTagStore.getState();
                
                let didUpdate = false;
                
                const updatedProgresses = confidenceProgresses.map(progress => {
                    if (!progress.tableIds.includes(tableId)) return progress;
                    if (progress.queue.includes(row.id)) return progress;
        
                    const filterTagNames = (progress.tags || []).filter(t => !t.startsWith('FC+'));
                    const hasFilter = filterTagNames.length > 0;
                    let matchesFilter = true;

                    if (hasFilter) {
                        const rowTagNames = (row.tagIds || []).map(id => allTags.find(t => t.id === id)?.name).filter(Boolean) as string[];
                        matchesFilter = rowTagNames.some(name => filterTagNames.includes(name));
                    }
        
                    if (matchesFilter) {
                        didUpdate = true;
                        return { 
                            ...progress, 
                            queue: [...progress.queue, row.id], 
                            newWordCount: (progress.newWordCount || 0) + 1 
                        };
                    }
                    return progress;
                });
                
                if (didUpdate) {
                    await setConfidenceProgresses(() => updatedProgresses);
                }
            })();
        }

        if (isGuest || !session) {
            return true;
        }

        // ENGINE INTEGRATION: Push only the ROW change
        getEngine().push('UPSERT_ROW', { tableId, row }, session.user.id);
        
        return true;
    },
    addRows: async (tableId, newRows) => {
        const { session, isGuest } = useUserStore.getState();
        const modifiedAt = Date.now();
        
        const originalTable = get().tables.find(t => t.id === tableId);
        if (!originalTable) return;
        
        const updatedRows = [...originalTable.rows, ...newRows];

        // Optimistic
        set(state => ({
            tables: state.tables.map(t => {
                if (t.id !== tableId) return t;
                return { ...t, rows: updatedRows, rowCount: updatedRows.length, modifiedAt };
            })
        }));
        
        // Update Cache
        if (!isGuest) {
            cacheService.saveTableRows(tableId, updatedRows);
        }

        if (isGuest || !session) return;

        // Bulk insert via engine
        newRows.forEach(row => {
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

        // Cleanup Logic for ConfidenceProgress queues
        const { confidenceProgresses, setConfidenceProgresses } = useSessionDataStore.getState();
        const updatedProgresses = confidenceProgresses.map(progress => {
            const originalQueueLength = progress.queue.length;
            const newQueue = progress.queue.filter(id => !rowIdSet.has(id));
            if (newQueue.length !== originalQueueLength) {
                const newCurrentIndex = Math.min(progress.currentIndex, newQueue.length > 0 ? newQueue.length - 1 : 0);
                return { ...progress, queue: newQueue, currentIndex: newCurrentIndex };
            }
            return progress;
        });
        await setConfidenceProgresses(() => updatedProgresses);
        
        // Update Cache
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
            const updatedRows = targetTable ? [...targetTable.rows, ...rowsToAppend] : [];
            
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
        const newFolder: Folder = { id: crypto.randomUUID(), name, tableIds: [], createdAt: Date.now() };
    
        set(state => ({ folders: [...state.folders, newFolder] }));
        const newOrder = [...(settings.folderOrder || []), newFolder.id];
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
        
        try {
            const { id, name, tableIds, createdAt } = newFolder;
            const { error } = await supabase.from('folders').insert({ id, name, table_ids: tableIds, created_at: new Date(createdAt).toISOString(), user_id: session.user.id });
            if (error) throw error;
        } catch(error: any) {
            console.error("Failed to create folder:", error.message || error);
            set(state => ({ folders: state.folders.filter(f => f.id !== newFolder.id) }));
            setSettings({ ...settings, folderOrder: settings.folderOrder?.filter(id => id !== newFolder.id) });
            useUIStore.getState().showToast("Failed to create folder.", "error");
        }
      },
      deleteFolder: async (folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;
        const { settings, setSettings } = useUserStore.getState();
        const originalSettings = settings;
    
        set(state => ({ folders: state.folders.filter(f => f.id !== folderId) }));
        const newOrder = (settings.folderOrder || []).filter(id => id !== folderId);
        setSettings({ ...settings, folderOrder: newOrder });
        
        if (isGuest || !session) return;
    
        try {
            const { error } = await supabase.from('folders').delete().eq('id', folderId);
            if (error) throw error;
        } catch (error: any) {
            console.error("Failed to delete folder:", error.message || error);
            set({ folders: originalFolders });
            setSettings(originalSettings);
            useUIStore.getState().showToast("Failed to delete folder.", "error");
        }
      },
      moveTableToFolder: async (tableId, folderId) => {
        const { session, isGuest } = useUserStore.getState();
        const originalFolders = get().folders;

        set(state => {
            const newFolders = state.folders.map(f => ({ ...f, tableIds: f.tableIds.filter(id => id !== tableId) }));
            if (folderId) {
                const folder = newFolders.find(f => f.id === folderId);
                if (folder) folder.tableIds.push(tableId);
            }
            return { folders: newFolders };
        });

        if (isGuest || !session) return;
        
        try {
            const oldFolder = originalFolders.find(f => f.tableIds.includes(tableId));
            const newFolder = get().folders.find(f => f.id === folderId);

            if (oldFolder?.id === newFolder?.id) return;

            const updates: Promise<any>[] = [];

            if (oldFolder) {
                updates.push(supabase.from('folders').update({ table_ids: oldFolder.tableIds.filter(id => id !== tableId) }).eq('id', oldFolder.id));
            }
            if (newFolder) {
                 updates.push(supabase.from('folders').update({ table_ids: newFolder.tableIds }).eq('id', newFolder.id));
            }
            
            const results = await Promise.all(updates);
            const firstError = results.map(res => res.error).find(Boolean);
            if (firstError) throw firstError;

        } catch (error: any) {
            console.error("Failed to move table:", error.message || error);
            set({ folders: originalFolders });
            useUIStore.getState().showToast("Failed to move table.", "error");
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
            // Metadata First Logic:
            // When setting initial data (usually from AppContent fetch), we only get Table metadata with empty rows.
            // If we already have rows loaded in the store for a specific table, preserve them!
            // This prevents the UI from flickering to "empty" or triggering "Missing Data" errors during background refreshes.
            
            const newTables = data.tables.map(newTable => {
                const existingTable = state.tables.find(t => t.id === newTable.id);
                if (existingTable && existingTable.rows.length > 0 && newTable.rows.length === 0) {
                    // Preserve existing rows if new data has none but old data does
                    return { ...newTable, rows: existingTable.rows };
                }
                return newTable;
            });

            return { tables: newTables, folders: data.folders };
        });
      },
      createClozeCard: async ({ note, selectionText, selectionStartIndex, clozeOptions }) => {
        const { createTable, updateTable } = get();
        const { addContextLink } = useContextLinkStore.getState();
    
        let targetTable: Table | undefined | null;
    
        if (clozeOptions.targetTableId === 'new') {
            const newTableName = `Reading Notes - ${note.title}`;
            targetTable = await createTable(newTableName, 'Cloze Question,Cloze Answer');
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
    
        let clozeRelation = updatedTable.relations.find((r: Relation) => r.name === 'Cloze Deletion');
        const clozeConfig = {
            hint: clozeOptions.hint,
            contextBefore: clozeOptions.contextBefore,
            contextAfter: clozeOptions.contextAfter,
        };

        if (!clozeRelation) {
            clozeRelation = {
                id: crypto.randomUUID(),
                name: 'Cloze Deletion',
                questionColumnIds: [questionCol.id],
                answerColumnIds: [answerCol.id],
                compatibleModes: [clozeOptions.clozeType],
                tags: ['StudySession'],
                clozeConfig: clozeConfig,
            };
            updatedTable.relations.push(clozeRelation);
        } else {
            clozeRelation.compatibleModes = [clozeOptions.clozeType];
            clozeRelation.clozeConfig = clozeConfig;
        }
    
        const { contextBefore, contextAfter, fullContext } = findContextSentences(
            note.content || '',
            selectionStartIndex,
            selectionText.length,
            clozeOptions.contextBefore,
            clozeOptions.contextAfter
        );
        const questionText = `${contextBefore}[...]${contextAfter}`;
    
        const newRow: VocabRow = {
            id: crypto.randomUUID(),
            cols: {
                [questionCol.id]: questionText,
                [answerCol.id]: selectionText,
            },
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
        };
        updatedTable.rows.push(newRow);
        
        // Also update cache here since we are modifying rows
        if(!useUserStore.getState().isGuest) {
             cacheService.saveTableRows(targetTable!.id, updatedTable.rows);
        }
    
        await addContextLink({
            rowId: newRow.id,
            sourceType: 'reading',
            sourceId: note.id,
            metadata: {
                snippet: fullContext,
                selection: selectionText,
                selectionStartIndex: selectionStartIndex,
            }
        });
    
        await updateTable(updatedTable);
    },
    })
);
