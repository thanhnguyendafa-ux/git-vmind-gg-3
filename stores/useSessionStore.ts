import { generateUUID } from '../utils/uuidUtils';



import { create } from 'zustand';
import {
    StudySessionData,
    ConfidenceSession,
    TheaterSessionData,
    DictationSessionData,
    AnkiSessionData,
    ScrambleSessionData,
    ScrambleSessionSettings,
    DictationNote,
    StudySettings,
    SessionWordResult,
    Screen,
    TheaterSessionSettings,
    AnkiCard,
    Question,
    StudySource,
    VocabRow,
    Table,
    ConfidenceProgress,
    StudyProgress,
    StudyMode
} from '../types';
import { useUIStore } from './useUIStore';
import { useTableStore } from './useTableStore';
import { useSessionDataStore } from './useSessionDataStore';
import { useUserStore } from './useUserStore';
import { useDictationNoteStore } from './useDictationNoteStore';
import { useGardenStore } from './useGardenStore';
import { VmindSyncEngine } from '../services/VmindSyncEngine';
import { useCounterStore } from './useCounterStore';
import { createQuestion } from '../utils/studySessionGenerator';

interface SessionState {
    activeSession: StudySessionData | null;
    activeConfidenceSession: ConfidenceSession | null;
    activeTheaterSession: TheaterSessionData | null;
    activeDictationSession: DictationSessionData | null;
    activeAnkiSession: AnkiSessionData | null;
    activeScrambleSession: ScrambleSessionData | null;

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
    updateActiveConfidenceSession: (updates: Partial<ConfidenceSession>) => void; // New Action
    handleFinishConfidenceSession: () => void; // Removed argument, uses store state

    handleStartTheaterSession: (settings: TheaterSessionSettings) => void;
    handleFinishTheaterSession: (session: TheaterSessionData) => void;

    handleStartScrambleSession: (settings: ScrambleSessionSettings) => void;
    handleFinishScrambleSession: (session: ScrambleSessionData) => void;

    handleStartDictationSession: (note: DictationNote) => void;
    handleFinishDictationSession: (session: DictationSessionData, result: { correct: number, total: number }) => void;

    handleStartAnkiSession: (progressId: string) => Promise<void>;
    handleFinishAnkiSession: (session: AnkiSessionData) => void;

    handleStartTemporaryFlashcardSession: (options: { rowIds: string[], tableIds: string[], relationIds: string[] }) => void;

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
    activeScrambleSession: null,
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
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        // Queue Mode: Interaction count is equal to number of results (questions answered)
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Queue', droplets, results.length);
        useGardenStore.getState().addDrops(droplets);

        // Update Study Progress if applicable
        if (activeSession.progressId) {
            const { studyProgresses, saveStudyProgress } = useSessionDataStore.getState();
            const progress = studyProgresses.find(p => p.id === activeSession.progressId);

            if (progress) {
                // Remove answered questions from queue
                const answeredIds = new Set(results.map(r => r.rowId));
                const newQueue = progress.queue.filter(q => !answeredIds.has(q.rowId));

                // Use atomic save action
                saveStudyProgress({ ...progress, queue: newQueue, currentIndex: 0 });

                // Activity Tracking: Increment counter for the queue
                useCounterStore.getState().increment(progress.id);
            }
        }

        set({ activeSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Vmind);
        useUIStore.getState().showToast(`Session complete! Studied for ${minutes} min & earned ${droplets} droplets.`, "success");
    },

    handleSessionQuit: (results, durationSeconds, remainingQueue) => {
        const { activeSession } = get();
        if (!activeSession) return;

        // Save partial progress if it's a saved queue
        if (activeSession.progressId) {
            const { studyProgresses, saveStudyProgress } = useSessionDataStore.getState();
            const progress = studyProgresses.find(p => p.id === activeSession.progressId);

            if (progress) {
                // Use atomic save action to update queue
                saveStudyProgress({ ...progress, queue: remainingQueue, currentIndex: 0 });

                // Activity Tracking: Increment counter for the queue
                useCounterStore.getState().increment(progress.id);
            }
        }

        const xpGained = results.filter(r => r.isCorrect).length * 5; // Half XP for quit
        const droplets = results.length;
        // Queue Mode: Interaction count is equal to number of results (questions answered so far)
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Queue', droplets, results.length);
        useGardenStore.getState().addDrops(results.length);

        set({ activeSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Vmind);
    },

    handleStartConfidenceSession: async (progressId: string) => {
        const { confidenceProgresses, clearNewWordCount, fetchSessionPayload } = useSessionDataStore.getState();
        const { showToast } = useUIStore.getState();

        const progress = confidenceProgresses.find(p => p.id === progressId);

        if (!progress) {
            showToast("Could not find the selected progress.", "error");
            return;
        }

        if (progress.queue.length === 0) {
            await fetchSessionPayload(progressId);
            const freshProgress = useSessionDataStore.getState().confidenceProgresses.find(p => p.id === progressId);
            if (!freshProgress || freshProgress.queue.length === 0) {
                showToast("This set has no cards to study.", "info");
                return;
            }
        }

        const { tables, fetchTablePayload } = useTableStore.getState();

        const tablesToLoad = progress.tableIds.map(tid => tables.find(t => t.id === tid)).filter((t): t is Table => {
            if (!t) return false;
            return t.rows.length < (t.rowCount ?? 0);
        });

        if (tablesToLoad.length > 0) {
            showToast("Loading all session data...", "info");
            const promises = tablesToLoad.map(t => fetchTablePayload(t.id, true));
            await Promise.allSettled(promises);
        }

        if (progress.newWordCount && progress.newWordCount > 0) {
            clearNewWordCount(progressId);
        }

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

    updateActiveConfidenceSession: (updates) => {
        set(state => {
            if (!state.activeConfidenceSession) return {};
            return {
                activeConfidenceSession: {
                    ...state.activeConfidenceSession,
                    ...updates
                }
            };
        });
    },

    handleFinishConfidenceSession: () => {
        // SOURCE OF TRUTH: Get state directly from store, not from arguments.
        // This prevents race conditions where UI might pass stale data.
        const session = get().activeConfidenceSession;

        if (!session) {
            console.error("No active confidence session to finish.");
            return;
        }

        const { saveConfidenceProgress } = useSessionDataStore.getState();
        const progressToUpdate = useSessionDataStore.getState().confidenceProgresses.find(p => p.id === session.progressId);

        if (progressToUpdate) {
            const updatedProgress: ConfidenceProgress = {
                ...progressToUpdate,
                currentIndex: session.currentIndex,
                cardStates: session.cardStates,
                queue: session.queue // Ensure queue state is also synced if changed (e.g. deletions)
            };
            saveConfidenceProgress(updatedProgress);

            // Activity Tracking: Increment counter for the confidence set
            useCounterStore.getState().increment(session.progressId);
        }

        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        const interactions = session.history.length;
        const xpGained = interactions * 5;

        // Confidence Mode: Interaction count is session history length
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Confidence', droplets, interactions);
        useGardenStore.getState().addDrops(droplets);

        set({ activeConfidenceSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Confidence);
        useUIStore.getState().showToast(`Session finished! Studied for ${minutes} min & earned ${droplets} droplets.`, 'success');
    },

    handleStartTheaterSession: (settings: TheaterSessionSettings) => {
        const { tables, fetchTablePayload } = useTableStore.getState();

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

            const currentTables = useTableStore.getState().tables;
            const queue: string[] = [];
            settings.sources.forEach(source => {
                const table = currentTables.find(t => t.id === source.tableId);
                if (table) {
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
                    queue,
                    startTime: Date.now(),
                    history: []
                }
            });
            useUIStore.getState().setCurrentScreen(Screen.TheaterSession);
        };
        start();
    },

    handleFinishTheaterSession: (session: TheaterSessionData) => {
        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        const xpGained = minutes * 10;
        const interactions = session.history.length;

        // Theater Mode: Passive, but we can track 'interactions' as cards shown.
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Theater', droplets, interactions);
        useGardenStore.getState().addDrops(droplets);

        // Activity Tracking: Increment counter for each table involved
        session.settings.sources.forEach(source => {
            useCounterStore.getState().increment(source.tableId);
        });

        set({ activeTheaterSession: null });
        useUIStore.getState().setCurrentScreen(Screen.TheaterSetup);
        useUIStore.getState().showToast(`Theater finished! Watched for ${minutes} min & earned ${droplets} droplets.`, 'success');
    },

    handleStartScrambleSession: (settings: ScrambleSessionSettings) => {
        const { tables, fetchTablePayload } = useTableStore.getState();

        // Ensure payload is loaded for selected tables
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

            const currentTables = useTableStore.getState().tables;
            const queue: { rowId: string, scrambledParts: string[], originalSentence: string }[] = [];

            settings.sources.forEach(source => {
                const table = currentTables.find(t => t.id === source.tableId);
                if (!table) return;
                const relation = table.relations.find(r => r.id === source.relationId);
                if (!relation) return;

                // Create ephemeral relation copy with the override splitCount
                const tempRelation = {
                    ...relation,
                    scrambleConfig: { splitCount: settings.splitCount }
                };

                table.rows.forEach(row => {
                    // Force mode to Scrambled to use the correct logic in createQuestion
                    const question = createQuestion(row, tempRelation, table, table.rows, StudyMode.Scrambled);
                    if (question && question.scrambledParts && question.correctAnswer) {
                        queue.push({
                            rowId: row.id,
                            scrambledParts: question.scrambledParts,
                            originalSentence: question.correctAnswer
                        });
                    }
                });
            });

            if (queue.length === 0) {
                useUIStore.getState().showToast("No valid sentences found for Scramble.", "error");
                return;
            }

            // Shuffle Queue
            for (let i = queue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [queue[i], queue[j]] = [queue[j], queue[i]];
            }

            set({
                activeScrambleSession: {
                    settings,
                    queue,
                    currentIndex: 0,
                    history: [],
                    startTime: Date.now()
                }
            });
            useUIStore.getState().setCurrentScreen(Screen.ScrambleSession);
        };
        start();
    },

    handleFinishScrambleSession: (session: ScrambleSessionData) => {
        const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        const interactions = session.history.length;
        const xpGained = interactions * 15;

        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Scramble', droplets, interactions);
        useGardenStore.getState().addDrops(droplets);

        // Activity Tracking
        session.settings.sources.forEach(source => {
            useCounterStore.getState().increment(source.tableId);
        });

        set({ activeScrambleSession: null });
        useUIStore.getState().setCurrentScreen(Screen.ScrambleSetup);
        useUIStore.getState().showToast(`Scramble finished! Studied for ${minutes} min & earned ${droplets} droplets.`, 'success');
    },

    handleStartDictationSession: (note: DictationNote) => {
        useDictationNoteStore.getState().fetchDictationContent(note.id).then(() => {
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
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        const xpGained = result.correct * 15;

        // Dictation: Interaction count could be result.total (segments attempted)
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Dictation', droplets, result.total);
        useGardenStore.getState().addDrops(droplets);

        const { updateDictationNote } = useDictationNoteStore.getState();
        const updatedNote = {
            ...session.note,
            practiceHistory: [
                ...session.note.practiceHistory,
                { timestamp: Date.now(), accuracy: result.total > 0 ? result.correct / result.total : 0, durationSeconds }
            ]
        };
        updateDictationNote(updatedNote);

        // Activity Tracking: Increment counter for the dictation note
        useCounterStore.getState().increment(session.note.id);

        set({ activeDictationSession: null });
        useUIStore.getState().setCurrentScreen(Screen.Dictation);
        useUIStore.getState().showToast(`Finished! ${result.correct}/${result.total} correct. Studied for ${minutes} min.`, "success");
    },

    handleStartAnkiSession: async (progressId: string) => {
        const { ankiProgresses } = useSessionDataStore.getState();
        const { tables, fetchTablePayload } = useTableStore.getState();
        const progress = ankiProgresses.find(p => p.id === progressId);

        if (!progress) {
            useUIStore.getState().showToast("Deck not found.", "error");
            return;
        }

        const missingPayloadTableIds = progress.tableIds.filter(tid => {
            const t = tables.find(tbl => tbl.id === tid);
            return t && t.rows.length === 0 && (t.rowCount || 0) > 0;
        });

        if (missingPayloadTableIds.length > 0) {
            useUIStore.getState().showToast("Downloading deck...", "info");
            await Promise.all(missingPayloadTableIds.map(tid => fetchTablePayload(tid)));
        }

        const currentTables = useTableStore.getState().tables;
        const deckTables = currentTables.filter(t => progress.tableIds.includes(t.id));

        const now = Date.now(); // Current timestamp for Learning/Relearning checks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime(); // Start of today for Review checks

        const reviewQueue: AnkiCard[] = [];
        const newQueue: AnkiCard[] = [];
        const learningQueue: AnkiCard[] = [];

        deckTables.forEach(table => {
            const relations = table.relations.filter(r => progress.relationIds.includes(r.id));

            relations.forEach(relation => {
                table.rows.forEach(row => {
                    if (progress.tagIds && progress.tagIds.length > 0) {
                        if (!row.tagIds || !row.tagIds.some(tid => progress.tagIds?.includes(tid))) {
                            return;
                        }
                    }

                    // Determine State and Stats from Row
                    const stats = row.stats;

                    // Fallback logic if migration hasn't run: infer state from repetitions
                    let state = stats.ankiState;
                    if (!state) {
                        if (stats.ankiRepetitions && stats.ankiRepetitions > 0) state = 'Review';
                        else state = 'New';
                    }

                    const card: AnkiCard = {
                        rowId: row.id,
                        tableId: table.id,
                        relationId: relation.id,
                        state,
                        step: stats.ankiStep || 0,
                        due: stats.ankiDueDate || 0,
                        interval: stats.ankiInterval || 0,
                        easeFactor: stats.ankiEaseFactor || 2.5,
                        lapses: stats.ankiLapses || 0
                    };

                    const ankiDueDate = stats.ankiDueDate;

                    if (state === 'New') {
                        newQueue.push(card);
                    } else if (state === 'Learning' || state === 'Relearning') {
                        // Learning cards are due if their specific timestamp is passed
                        if (ankiDueDate && ankiDueDate <= now) {
                            learningQueue.push(card);
                        } else {
                            // Not due yet
                        }
                    } else if (state === 'Review') {
                        // Review cards are due if their due date (day) is today or earlier
                        if (ankiDueDate && ankiDueDate <= todayTimestamp) {
                            reviewQueue.push(card);
                        }
                    }
                });
            });
        });

        const config = progress.ankiConfig;
        const newLimit = config.newCardsPerDay;
        const reviewLimit = config.maxReviewsPerDay;

        // --- Queue Prioritization & Limits ---

        // 1. Limit New Cards (User Config)
        // We need to count how many new cards were ALREADY studied today? 
        // For simplicity v1: Limit the *session* to X new cards. 
        // Real Anki tracks "new cards today" in a separate log. 
        // We'll rely on session limit for now.
        const selectedNew = newQueue.slice(0, newLimit);

        // 2. Limit Review Cards
        const selectedReview = reviewQueue.slice(0, reviewLimit);

        // 3. Sort Learning Queue by Due Time (Oldest due first)
        learningQueue.sort((a, b) => a.due - b.due);

        // 4. Shuffle New Cards (optional, keeping it random is usually good)
        for (let i = selectedNew.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedNew[i], selectedNew[j]] = [selectedNew[j], selectedNew[i]];
        }

        // Note: We do NOT combine them into a single `finalQueue` here.
        // We allow the Session Screen to pick from the 3 queues dynamically.
        // But we need to pick an INITIAL card.

        // Priority: Learning > Review > New
        let currentCard: AnkiCard | null = null;
        if (learningQueue.length > 0) currentCard = learningQueue.shift()!;
        else if (selectedReview.length > 0) currentCard = selectedReview.shift()!;
        else if (selectedNew.length > 0) currentCard = selectedNew.shift()!;

        if (!currentCard) {
            useUIStore.getState().showToast("No cards due for this deck!", "success");
            return;
        }

        set({
            activeAnkiSession: {
                progressId,
                reviewQueue: selectedReview,   // Kept separate
                newQueue: selectedNew,         // Kept separate
                learningQueue: learningQueue,  // Kept separate
                currentCard,
                startTime: Date.now(),
                history: [],
                config
            }
        });
        useUIStore.getState().setCurrentScreen(Screen.AnkiSession);
    },

    handleFinishAnkiSession: (session: AnkiSessionData) => {
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
        const minutes = Math.floor(durationSeconds / 60);
        const droplets = minutes;
        const xpGained = session.history.length * 10;
        const interactions = session.history.length;

        // Anki Mode: Interaction count is history length
        useUserStore.getState().updateStatsFromSession(durationSeconds, xpGained, 0, 'Anki', droplets, interactions);
        useGardenStore.getState().addDrops(droplets);
        // Activity Tracking: Increment counter for the Anki deck
        useCounterStore.getState().increment(session.progressId);

        set({ activeAnkiSession: null });
        useUIStore.getState().setCurrentScreen(Screen.AnkiSetup);
        useUIStore.getState().showToast(`Anki session complete! Studied for ${minutes} min. Progress saved and synced across all sets.`, 'success');
    },

    handleStartTemporaryFlashcardSession: (options) => {
        const newProgress: ConfidenceProgress = {
            id: `temp-${generateUUID()}`,
            name: 'Flagged Words Review',
            tableIds: options.tableIds,
            relationIds: options.relationIds,
            createdAt: Date.now(),
            queue: options.rowIds,
            currentIndex: 0,
        };
        // We don't save this progress, just create it for the session
        get().handleStartConfidenceSession(newProgress.id);
        useSessionDataStore.getState().setConfidenceProgresses(prev => [...prev, newProgress]);
    },

    handleSelectTable: (tableId) => {
        // Deprecated for TablesScreen navigation, now handled locally.
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