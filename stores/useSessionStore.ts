
import { create } from 'zustand';
import { 
  StudySessionData, 
  ConfidenceSession, 
  TheaterSessionData, 
  DictationSessionData, 
  AnkiSessionData, 
  DictationNote, 
  StudySettings, 
  SessionWordResult, 
  Screen,
  TheaterSessionSettings,
  AnkiCard,
  Question,
  StudySource,
  VocabRow,
  Table
} from '../types';
import { useUIStore } from './useUIStore';
import { useTableStore } from './useTableStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useUserStore } from './useUserStore';
import { useDictationNoteStore } from './useDictationNoteStore';

interface SessionState {
  activeSession: StudySessionData | null;
  activeConfidenceSession: ConfidenceSession | null;
  activeTheaterSession: TheaterSessionData | null;
  activeDictationSession: DictationSessionData | null;
  activeAnkiSession: AnkiSessionData | null;
  
  editingDictationNote: DictationNote | null;
  activeTableId: string | null;
  
  studySetupSourceTableId: string | null;
  studySetupOverrides: Partial<StudySettings> | null;
  
  readingScreenTarget: { noteId: string; selectionStartIndex?: number; selectionText?: string } | null;
  
  ankiDeckFilter: { progressId: string; tableId: string } | null;
  confidenceProgressFilter: { progressId: string; tableId: string } | null;
  
  ankiStatsProgressId: string | null;

  // Actions
  handleStartStudySession: (sessionData: StudySessionData) => void;
  handleEndSession: (results: SessionWordResult[], durationSeconds: number) => void;
  handleSessionQuit: (results: SessionWordResult[], durationSeconds: number, remainingQueue: Question[]) => void;
  
  handleStartConfidenceSession: (progressId: string) => Promise<void>;
  handleFinishConfidenceSession: (session: ConfidenceSession) => void;
  
  handleStartTheaterSession: (settings: TheaterSessionSettings) => void;
  handleFinishTheaterSession: (session: TheaterSessionData) => void;
  
  handleStartDictationSession: (note: DictationNote) => void;
  handleFinishDictationSession: (session: DictationSessionData, result: { correct: number, total: number }) => void;
  
  handleStartAnkiSession: (progressId: string) => void;
  handleFinishAnkiSession: (session: AnkiSessionData) => void;
  
  handleSelectTable: (tableId: string) => void;
  handleViewAnkiDeckContents: (progressId: string) => void;
  handleViewConfidenceProgressContents: (progressId: string) => void;
  
  setEditingDictationNote: (note: DictationNote | null) => void;
  setReadingScreenTarget: (target: { noteId: string; selectionStartIndex?: number; selectionText?: string } | null) => void;
  setStudySetupSourceTableId: (id: string | null) => void;
  setStudySetupOverrides: (settings: Partial<StudySettings> | null) => void;
  
  setAnkiStatsProgressId: (id: string | null) => void;
  clearAnkiDeckFilter: () => void;
  clearConfidenceProgressFilter: () => void;
}

export const useSessionStore = create<SessionState>()((set, get) => ({
    activeSession: null,
    activeConfidenceSession: null,
    activeTheaterSession: null,
    activeDictationSession: null,
    activeAnkiSession: null,
    editingDictationNote: null,
    activeTableId: null,
    studySetupSourceTableId: null,
    studySetupOverrides: null,
    readingScreenTarget: null,
    ankiDeckFilter: null,
    confidenceProgressFilter: null,
    ankiStatsProgressId: null,

    handleStartStudySession: (sessionData) => {
        set({ activeSession: sessionData });
        useUIStore.getState().setCurrentScreen(Screen.StudySession);
    },

    handleEndSession: (results, durationSeconds) => {
        const { activeSession } = get();
        if (!activeSession) return;

        // Calculate XP
        const xpGained = results.filter(r => r.isCorrect).length * 10;
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);

        // Update Study Progress if applicable
        if (activeSession.progressId) {
            useSessionDataStore.getState().setStudyProgresses(prev => prev.map(p => {
                if (p.id === activeSession.progressId) {
                    // Remove answered questions from queue
                    const answeredIds = new Set(results.map(r => r.rowId));
                    const newQueue = p.queue.filter(q => !answeredIds.has(q.rowId));
                    // Reset index as queue shrinks
                    return { ...p, queue: newQueue, currentIndex: 0 };
                }
                return p;
            }));
        }

        set({ activeSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Vmind);
        useUIStore.getState().showToast(`Session Complete! +${xpGained} XP`, "success");
    },

    handleSessionQuit: (results, durationSeconds, remainingQueue) => {
        const { activeSession } = get();
        if (!activeSession) return;

        // Save partial progress if it's a saved queue
        if (activeSession.progressId) {
             useSessionDataStore.getState().setStudyProgresses(prev => prev.map(p => {
                if (p.id === activeSession.progressId) {
                    // Update queue to remaining
                    return { ...p, queue: remainingQueue, currentIndex: 0 };
                }
                return p;
            }));
        }

        const xpGained = results.filter(r => r.isCorrect).length * 5; // Half XP for quit
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);
        
        set({ activeSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Vmind);
    },

    handleStartConfidenceSession: async (progressId) => {
        const { confidenceProgresses, clearNewWordCount, fetchSessionPayload } = useSessionDataStore.getState();
        const { showToast } = useUIStore.getState();
        
        const progress = confidenceProgresses.find(p => p.id === progressId);

        if (!progress) {
            showToast("Could not find the selected progress.", "error");
            return;
        }

        if (progress.queue.length === 0) {
             // Let's see if the server has a queue for us first
            await fetchSessionPayload(progressId);
            const freshProgress = useSessionDataStore.getState().confidenceProgresses.find(p => p.id === progressId);
            if (!freshProgress || freshProgress.queue.length === 0) {
                showToast("This set has no cards to study.", "info");
                return;
            }
        }
        
        // --- NEW "FULL PRE-LOAD" LOGIC ---
        const { tables, fetchTablePayload } = useTableStore.getState();

        const tablesToLoad = progress.tableIds.map(tid => tables.find(t => t.id === tid)).filter((t): t is Table => {
            if (!t) return false;
            // Condition: needs loading if local rows are less than total row count
            return t.rows.length < (t.rowCount ?? 0);
        });

        if (tablesToLoad.length > 0) {
            showToast("Loading all session data...", "info");
            const promises = tablesToLoad.map(t => fetchTablePayload(t.id, true));
            await Promise.allSettled(promises);
        }
        // --- END NEW LOGIC ---
        
        // Clear new word count indicator
        if (progress.newWordCount && progress.newWordCount > 0) {
            clearNewWordCount(progressId);
        }
        
        // Launch Session
        set({ 
            activeConfidenceSession: { 
                progressId: progress.id,
                tableIds: progress.tableIds, 
                relationIds: progress.relationIds, 
                queue: progress.queue, 
                currentIndex: progress.currentIndex, 
                cardStates: progress.cardStates || {},
                sessionEncounters: 0, 
                startTime: Date.now(), 
                history: [],
                intervalConfig: progress.intervalConfig,
            } 
        });
        useUIStore.getState().setCurrentScreen(Screen.ConfidenceSession);
    },

    handleFinishConfidenceSession: (session) => {
         // --- FIX: Replace incorrect call to setConfidenceProgresses with saveConfidenceProgress ---
         const { confidenceProgresses, saveConfidenceProgress } = useSessionDataStore.getState();
         const progressToUpdate = confidenceProgresses.find(p => p.id === session.progressId);
 
         if (progressToUpdate) {
             const updatedProgress = {
                 ...progressToUpdate,
                 currentIndex: session.currentIndex,
                 cardStates: session.cardStates
             };
             // This call triggers the VmindSyncEngine to persist the changes.
             saveConfidenceProgress(updatedProgress);
         }
         // --- END FIX ---

         const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
         // XP Calculation: Base on interactions
         const interactions = session.history.length;
         const xpGained = interactions * 5;

         useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);
         
         set({ activeConfidenceSession: null });
         useUIStore.getState().setCurrentScreen(Screen.Confidence);
    },

    handleStartTheaterSession: (settings) => {
        const { tables, fetchTablePayload } = useTableStore.getState();
        
        // Check for missing payloads
        const tableIds = settings.sources.map(s => s.tableId);
        const missingPayloadTableIds = tableIds.filter(tid => {
             const t = tables.find(tbl => tbl.id === tid);
             return t && t.rows.length === 0 && (t.rowCount || 0) > 0;
        });
        
        const start = async () => {
            if (missingPayloadTableIds.length > 0) {
                 useUIStore.getState().showToast("Downloading content...", "info");
                 await Promise.all(missingPayloadTableIds.map(tid => fetchTablePayload(tid)));
            }

            // Generate Queue
            const queue: string[] = [];
            // We need fresh tables state after fetch
            const currentTables = useTableStore.getState().tables;
            settings.sources.forEach(source => {
                const table = currentTables.find(t => t.id === source.tableId);
                if (table) {
                     // Add all rows for now, filtering happens in session if needed or pre-filtered
                     table.rows.forEach(r => queue.push(r.id));
                }
            });
            
            if (queue.length === 0) {
                useUIStore.getState().showToast("No cards found for Theater Mode.", "error");
                return;
            }

            set({
                activeTheaterSession: {
                    settings,
                    queue, // Simple queue of row IDs
                    startTime: Date.now(),
                    history: []
                }
            });
            useUIStore.getState().setCurrentScreen(Screen.TheaterSession);
        };
        start();
    },

    handleFinishTheaterSession: (session) => {
        set({ activeTheaterSession: null });
        useUIStore.getState().setCurrentScreen(Screen.TheaterSetup);
    },

    handleStartDictationSession: (note) => {
        useDictationNoteStore.getState().fetchDictationContent(note.id).then(() => {
            // Re-fetch note to get full content
            const fullNote = useDictationNoteStore.getState().dictationNotes.find(n => n.id === note.id) || note;
            
            if (!fullNote.transcript || fullNote.transcript.length === 0) {
                useUIStore.getState().showToast("Transcript not loaded or empty.", "error");
                return;
            }

            set({ activeDictationSession: { note: fullNote, startTime: Date.now() } });
            useUIStore.getState().setCurrentScreen(Screen.DictationSession);
        });
    },

    handleFinishDictationSession: (session, result) => {
        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        const xpGained = result.correct * 15;
        
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);
        
        // Save practice history
        const { updateDictationNote } = useDictationNoteStore.getState();
        const updatedNote = { 
            ...session.note, 
            practiceHistory: [
                ...session.note.practiceHistory, 
                { timestamp: Date.now(), accuracy: result.total > 0 ? result.correct / result.total : 0, durationSeconds }
            ] 
        };
        updateDictationNote(updatedNote);

        set({ activeDictationSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Dictation);
        useUIStore.getState().showToast(`Session Complete! ${result.correct}/${result.total} correct.`, "success");
    },

    handleStartAnkiSession: async (progressId) => {
        const { ankiProgresses } = useSessionDataStore.getState();
        const { tables, fetchTablePayload } = useTableStore.getState();
        const progress = ankiProgresses.find(p => p.id === progressId);

        if (!progress) {
             useUIStore.getState().showToast("Deck not found.", "error");
             return;
        }
        
        // Check payloads
        const missingPayloadTableIds = progress.tableIds.filter(tid => {
             const t = tables.find(tbl => tbl.id === tid);
             return t && t.rows.length === 0 && (t.rowCount || 0) > 0;
        });

        if (missingPayloadTableIds.length > 0) {
             useUIStore.getState().showToast("Downloading deck...", "info");
             await Promise.all(missingPayloadTableIds.map(tid => fetchTablePayload(tid)));
        }

        // Refresh tables
        const currentTables = useTableStore.getState().tables;
        const deckTables = currentTables.filter(t => progress.tableIds.includes(t.id));
        
        // Build Queue based on Anki Algorithm
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        const reviewQueue: AnkiCard[] = [];
        const newQueue: AnkiCard[] = [];
        const learningQueue: AnkiCard[] = []; // TODO: Persist learning steps

        deckTables.forEach(table => {
            // Filter by relations involved in this progress
             const relations = table.relations.filter(r => progress.relationIds.includes(r.id));
             
             relations.forEach(relation => {
                  table.rows.forEach(row => {
                      // Filter by tags if applicable
                      if (progress.tagIds && progress.tagIds.length > 0) {
                           if (!row.tagIds || !row.tagIds.some(tid => progress.tagIds?.includes(tid))) {
                               return; 
                           }
                      }

                      const card: AnkiCard = { rowId: row.id, tableId: table.id, relationId: relation.id, isNew: false };
                      const { ankiDueDate } = row.stats;
                      
                      if (ankiDueDate === undefined || ankiDueDate === null) {
                          card.isNew = true;
                          newQueue.push(card);
                      } else if (ankiDueDate <= todayTimestamp) {
                          reviewQueue.push(card);
                      }
                  });
             });
        });
        
        // Apply Limits
        const config = progress.ankiConfig;
        const newLimit = config.newCardsPerDay;
        const reviewLimit = config.maxReviewsPerDay;
        
        const selectedNew = newQueue.slice(0, newLimit);
        const selectedReview = reviewQueue.slice(0, reviewLimit);
        
        // Shuffle new cards
        for (let i = selectedNew.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedNew[i], selectedNew[j]] = [selectedNew[j], selectedNew[i]];
        }

        const finalQueue = [...selectedReview, ...selectedNew];
        
        if (finalQueue.length === 0) {
             useUIStore.getState().showToast("No cards due for this deck!", "success");
             return;
        }

        const currentCard = finalQueue.shift() || null;

        set({
            activeAnkiSession: {
                progressId,
                reviewQueue: selectedReview.filter(c => c !== currentCard),
                newQueue: selectedNew.filter(c => c !== currentCard),
                learningQueue: [],
                currentCard,
                startTime: Date.now(),
                history: [],
                config
            }
        });
        useUIStore.getState().setCurrentScreen(Screen.AnkiSession);
    },

    handleFinishAnkiSession: (session) => {
        const { updateTable } = useTableStore.getState();
        
        // Batch update rows with new stats
        // Group by tableId for efficiency
        const updatesByTable = new Map<string, VocabRow[]>();
        
        session.history.forEach(entry => {
             const tables = useTableStore.getState().tables;
             for (const t of tables) {
                 const r = t.rows.find(rw => rw.id === entry.rowId);
                 if (r) {
                     const updatedRow = { ...r, stats: entry.newStats };
                     const existing = updatesByTable.get(t.id) || [];
                     existing.push(updatedRow);
                     updatesByTable.set(t.id, existing);
                     break;
                 }
             }
        });
        
        updatesByTable.forEach((rows, tableId) => {
             rows.forEach(row => {
                 useTableStore.getState().upsertRow(tableId, row);
             });
        });

        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        const xpGained = session.history.length * 10;
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0);
        
        set({ activeAnkiSession: null });
        useUIStore.getState().setCurrentScreen(Screen.AnkiSetup);
    },

    handleSelectTable: (tableId) => {
        set({ activeTableId: tableId });
        useUIStore.getState().setCurrentScreen(Screen.TableDetail);
    },

    handleViewAnkiDeckContents: (progressId) => {
        const { ankiProgresses } = useSessionDataStore.getState();
        const progress = ankiProgresses.find(p => p.id === progressId);
        if (progress && progress.tableIds.length > 0) {
            set({ 
                activeTableId: progress.tableIds[0],
                ankiDeckFilter: { progressId, tableId: progress.tableIds[0] }
            });
            useUIStore.getState().setCurrentScreen(Screen.TableDetail);
        }
    },

    handleViewConfidenceProgressContents: (progressId) => {
        const { confidenceProgresses } = useSessionDataStore.getState();
        const progress = confidenceProgresses.find(p => p.id === progressId);
        if (progress && progress.tableIds.length > 0) {
            set({ 
                activeTableId: progress.tableIds[0],
                confidenceProgressFilter: { progressId, tableId: progress.tableIds[0] }
            });
            useUIStore.getState().setCurrentScreen(Screen.TableDetail);
        }
    },

    setEditingDictationNote: (note) => set({ editingDictationNote: note }),
    setReadingScreenTarget: (target) => set({ readingScreenTarget: target }),
    setStudySetupSourceTableId: (id) => set({ studySetupSourceTableId: id }),
    setStudySetupOverrides: (overrides) => set({ studySetupOverrides: overrides }),
    setAnkiStatsProgressId: (id) => set({ ankiStatsProgressId: id }),
    clearAnkiDeckFilter: () => set({ ankiDeckFilter: null }),
    clearConfidenceProgressFilter: () => set({ confidenceProgressFilter: null }),

}));
