
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FlashcardStatus, StudyMode, SessionWordResult, VocabRow, McqPayload, CardFaceDesign, ConfidenceProgress, Screen, Relation } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useUserStore } from '../../stores/useUserStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useGardenStore } from '../../stores/useGardenStore';
import UnifiedQuestionCard from '../study/components/v3/UnifiedQuestionCard';
import { playSuccessSound, playErrorSound } from '../../services/soundService';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../utils/studySessionGenerator';
import { resolveVariables } from '../../utils/textUtils';
import { formatShortDuration } from '../../utils/timeUtils';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import AnswerFeedbackPanel from '../study/components/AnswerFeedbackPanel';
import { useAudioStore, SpeechRequest } from '../../stores/useAudioStore';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
import FocusTimer from '../common/FocusTimer';
import ManualJumpModal from './components/ManualJumpModal';
import Popover from '../../components/ui/Popover';
import { Input } from '../../components/ui/Input';
import { useCounterStore } from '../../stores/useCounterStore';
import WordDetailModal from '../tables/WordDetailModal';
import WordInfoModal from '../tables/components/WordInfoModal';
import { useTagStore } from '../../stores/useTagStore';
import RelationSettingsModal from '../tables/components/RelationSettingsModal';
import LevelGalleryView from '../concepts/LevelGalleryView';

const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; hex: string; interval: number } } = {
    [FlashcardStatus.New]: { label: 'New', color: 'gray', hex: '#9ca3af', interval: 0 }, // gray-400
    [FlashcardStatus.Again]: { label: 'Again (Fail)', color: 'bg-error-500 hover:bg-error-600', hex: '#ef4444', interval: 3 }, // red-500
    [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', hex: '#f97316', interval: 5 }, // orange-500
    [FlashcardStatus.Good]: { label: 'Good', color: 'bg-warning-500 hover:bg-warning-600', hex: '#eab308', interval: 8 }, // yellow-500
    [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-success-500 hover:bg-success-600', hex: '#22c55e', interval: 13 }, // green-500
    [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-info-500 hover:bg-info-600', hex: '#06b6d4', interval: 21 }, // cyan-500
    [FlashcardStatus.Superb]: { label: 'Superb', color: 'bg-purple-500 hover:bg-purple-600', hex: '#a855f7', interval: 34 }, // purple-500
};

const DEFAULT_INTERVALS = {
    [FlashcardStatus.Again]: 3,
    [FlashcardStatus.Hard]: 5,
    [FlashcardStatus.Good]: 8,
    [FlashcardStatus.Easy]: 13,
    [FlashcardStatus.Perfect]: 21,
    [FlashcardStatus.Superb]: 34,
    [FlashcardStatus.New]: 0,
};

const SessionSummaryOverlay: React.FC<{
    durationSeconds: number;
    dropletsEarned: number;
    onClose: () => void;
}> = ({ durationSeconds, dropletsEarned, onClose }) => {
    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-surface dark:bg-secondary-800 w-full max-w-sm rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden animate-slideInUp">
                <div className="p-8 flex flex-col items-center text-center">
                    <div className="mb-4 p-4 bg-success-500/10 rounded-full">
                        <Icon name="check-circle" className="w-16 h-16 text-success-500" variant="filled" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main dark:text-secondary-100 mb-6">Session Complete!</h2>

                    <div className="grid grid-cols-2 gap-4 w-full mb-8">
                        <div className="bg-secondary-50 dark:bg-secondary-900/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-secondary-100 dark:border-secondary-700/50">
                            <Icon name="clock" className="w-6 h-6 text-text-subtle mb-1" />
                            <span className="text-lg font-bold text-text-main dark:text-secondary-100">{formatShortDuration(durationSeconds)}</span>
                            <span className="text-xs text-text-subtle font-medium uppercase tracking-wider">Focus Time</span>
                        </div>
                        <div className="bg-secondary-50 dark:bg-secondary-900/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1 border border-secondary-100 dark:border-secondary-700/50">
                            <Icon name="cloud-rain" className="w-6 h-6 text-sky-500 mb-1" variant="filled" />
                            <span className="text-lg font-bold text-text-main dark:text-secondary-100">+{dropletsEarned}</span>
                            <span className="text-xs text-text-subtle font-medium uppercase tracking-wider">Droplets</span>
                        </div>
                    </div>

                    <p className="text-text-subtle text-sm mb-6">Great job reviewing today!</p>

                    <Button onClick={onClose} className="w-full py-3 text-base" size="lg">
                        Return to Menu
                    </Button>
                </div>
            </div>
        </div>
    );
};

const ConfidenceSessionScreen: React.FC = () => {
    // ...
    const [showGallery, setShowGallery] = useState(false);
    const activeSession = useSessionStore(useShallow(state => state.activeConfidenceSession));
    const updateActiveConfidenceSession = useSessionStore(state => state.updateActiveConfidenceSession);
    const { saveConfidenceProgress, confidenceProgresses } = useSessionDataStore();
    const { updateStatsFromSession } = useUserStore();
    const addDrops = useGardenStore(state => state.addDrops);
    const { upsertRow, deleteRows, updateTable } = useTableStore(useShallow(state => ({ upsertRow: state.upsertRow, deleteRows: state.deleteRows, updateTable: state.updateTable })));
    const { tags: allTags } = useTagStore();

    const { tables, loadingTableIds, fetchTablePayload } = useTableStore(useShallow(state => ({
        tables: state.tables,
        loadingTableIds: state.loadingTableIds,
        fetchTablePayload: state.fetchTablePayload
    })));
    const {
        showToast,
        isConfidenceAutoplayEnabled,
        toggleConfidenceAutoplay,
        setCurrentScreen,
        triggerGlobalAction
    } = useUIStore(useShallow(state => ({
        showToast: state.showToast,
        isConfidenceAutoplayEnabled: state.isConfidenceAutoplayEnabled,
        toggleConfidenceAutoplay: state.toggleConfidenceAutoplay,
        setCurrentScreen: state.setCurrentScreen,
        triggerGlobalAction: state.triggerGlobalAction
    })));

    // Extracted audio store actions for use in effects
    const { playQueue, stopQueue } = useAudioStore(useShallow(state => ({
        playQueue: state.playQueue,
        stopQueue: state.stopQueue
    })));

    if (!activeSession) return null;

    const [session, setSession] = useState(activeSession);
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isEndSessionConfirmOpen, setIsEndSessionConfirmOpen] = useState(false);
    const [isJumpModalOpen, setIsJumpModalOpen] = useState(false);
    const [isDataMissing, setIsDataMissing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const [showSummary, setShowSummary] = useState(false);
    const [summaryStats, setSummaryStats] = useState<{ duration: number, droplets: number } | null>(null);

    const [isDebugMode, setIsDebugMode] = useState(false);
    const [simulationData, setSimulationData] = useState<{
        status: FlashcardStatus;
        currentIdx: number;
        interval: number;
        targetIdx: number;
        queueLength: number;
        cardId: string;
    } | null>(null);
    const [previewTargetIndex, setPreviewTargetIndex] = useState<{ idx: number; color: string } | null>(null);

    const [sessionIntervals, setSessionIntervals] = useState(activeSession.intervalConfig || DEFAULT_INTERVALS);
    const [isIntervalEditorOpen, setIsIntervalEditorOpen] = useState(false);

    const [rowForDetailModal, setRowForDetailModal] = useState<VocabRow | null>(null);
    const [rowForInfoModal, setRowForInfoModal] = useState<VocabRow | null>(null);
    const [relationToEdit, setRelationToEdit] = useState<Relation | null>(null);

    // State for delete confirmation
    const [rowToDelete, setRowToDelete] = useState<string | null>(null);

    const lastPreFetchIndex = useRef<number | null>(null);

    const currentRowId = session.queue[session.currentIndex];

    useEffect(() => {
        if (showSummary || relationToEdit) return; // Stop timer when summary or modal is active
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - session.startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [session.startTime, showSummary, relationToEdit]);

    // Handle Escape key to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const sessionTables = useMemo(() => tables.filter(t => session.tableIds.includes(t.id)), [tables, session.tableIds]);
    const allRows = useMemo(() => sessionTables.flatMap(t => t.rows), [sessionTables]);

    const { table: currentTable, row: currentRow, relation: currentRelation } = useMemo(() => {
        for (const table of sessionTables) {
            const row = table.rows.find(r => r.id === currentRowId);
            if (row) {
                let relId = session.relationIds.find(rid => table.relations.some(r => r.id === rid));
                let relation = table.relations.find(r => r.id === relId);

                if (!relation && table.relations.length > 0) {
                    relation = table.relations[0];
                }

                if (relation) return { table, row, relation };
            }
        }
        return { table: undefined, row: undefined, relation: undefined };
    }, [currentRowId, sessionTables, session.relationIds]);

    const handleUpdateRowInModal = async (updatedRow: VocabRow): Promise<boolean> => {
        if (!currentTable) return false;
        const success = await upsertRow(currentTable.id, updatedRow);
        if (success) {
            setRowForDetailModal(null);
        }
        return success;
    };

    const handleDeleteRowInSession = async (rowId: string) => {
        if (!currentTable) return;

        // 1. Global Delete (DB + Table Store)
        await deleteRows(currentTable.id, [rowId]);

        // 2. Heal Local Queue (Atomic)
        const newQueue = session.queue.filter(id => id !== rowId);
        const newCardStates = { ...(session.cardStates || {}) };
        delete newCardStates[rowId];

        // Adjust Index: If we delete the current item, the next item slides into the current index.
        // If we deleted the last item in the queue, index must wrap to 0.
        let newIndex = session.currentIndex;
        if (newIndex >= newQueue.length) {
            newIndex = 0;
        }

        // 3. Persist Healing
        const { confidenceProgresses } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);

        if (originalProgress) {
            const updatedProgress: ConfidenceProgress = {
                ...originalProgress,
                queue: newQueue,
                currentIndex: newIndex,
                cardStates: newCardStates
            };
            saveConfidenceProgress(updatedProgress);
        }

        // 4. Update Local Session State & Global Store State
        const updatedSession = {
            ...session,
            queue: newQueue,
            currentIndex: newIndex,
            cardStates: newCardStates
        };
        setSession(updatedSession);
        updateActiveConfidenceSession(updatedSession);

        // 5. Reset UI
        setRowToDelete(null);
        setRowForDetailModal(null);
        setRowForInfoModal(null);
        setIsAnswered(false);
        setFeedback(null);
        setSimulationData(null);

        // 6. Handle Empty Queue
        if (newQueue.length === 0) {
            const duration = Math.floor((Date.now() - session.startTime) / 1000);
            const droplets = Math.floor(duration / 60);

            // Ensure sync completes before showing summary for empty set
            triggerGlobalAction(() => {
                setSummaryStats({ duration, droplets });
                setShowSummary(true);
            });
        } else {
            showToast("Row deleted successfully.", "success");
        }
    };

    // --- In-Session Relation Editing Logic ---
    const handleSaveRelation = async (updatedRel: Relation) => {
        if (!currentTable) return;

        // 1. Update the table locally and persist
        const updatedRelations = currentTable.relations.map(r => r.id === updatedRel.id ? updatedRel : r);
        const success = await updateTable({ ...currentTable, relations: updatedRelations });

        if (success) {
            // 2. The useTableStore update will automatically trigger a re-render of useShallow(tables)
            // 3. The useMemo for currentRelation will re-run
            // 4. UnifiedQuestionCard will receive the new design/logic props
            setRelationToEdit(null);
            showToast("Card design updated.", "success");
        } else {
            showToast("Failed to update relation.", "error");
        }
    };

    useEffect(() => {
        const currentIndex = session.currentIndex;

        if (currentIndex % 3 === 0) {
            if (lastPreFetchIndex.current === currentIndex) return;

            const LOOKAHEAD_START_OFFSET = 20;
            const LOOKAHEAD_RANGE = 30;

            const start = currentIndex + LOOKAHEAD_START_OFFSET;
            const end = start + LOOKAHEAD_RANGE;
            const nextBatchIds = session.queue.slice(start, end);

            if (nextBatchIds.length === 0) return;

            const allLoadedRowIds = new Set(tables.flatMap(t => t.rows.map(r => r.id)));
            const missingCount = nextBatchIds.filter(id => !allLoadedRowIds.has(id)).length;

            if (missingCount > 0) {
                lastPreFetchIndex.current = currentIndex;

                const unloadedTableIds = session.tableIds.filter(tid => {
                    const t = tables.find(tbl => tbl.id === tid);
                    return !t || t.rows.length === 0;
                });

                unloadedTableIds.forEach(tid => {
                    if (!loadingTableIds.has(tid)) {
                        fetchTablePayload(tid).catch(e => console.warn(`Background fetch failed for ${tid}`, e));
                    }
                });
            }
        }
    }, [session.currentIndex, session.queue, session.tableIds, tables, loadingTableIds, fetchTablePayload]);

    const sessionStatusMap = useMemo(() => {
        const map = new Map<string, FlashcardStatus>();
        if (session.cardStates) {
            Object.entries(session.cardStates).forEach(([id, status]) => {
                map.set(id, status as FlashcardStatus);
            });
        }
        session.history.forEach(h => {
            map.set(h.rowId, h.status);
        });
        return map;
    }, [session.history, session.cardStates]);

    const queueGradient = useMemo(() => {
        const total = session.queue.length;
        if (total === 0) return 'none';

        const states = session.cardStates || {};
        const stops = session.queue.map((rowId, index) => {
            const status = (states[rowId] as FlashcardStatus) || FlashcardStatus.New;
            const color = statusConfig[status].hex;
            const startPct = (index / total) * 100;
            const endPct = ((index + 1) / total) * 100;
            return `${color} ${startPct}% ${endPct}%`;
        });

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [session.queue, session.cardStates]);

    const learnedCount = useMemo(() => {
        return session.queue.reduce((count, rowId) => {
            const status = sessionStatusMap.get(rowId) || FlashcardStatus.New;
            return status !== FlashcardStatus.New ? count + 1 : count;
        }, 0);
    }, [session.queue, sessionStatusMap]);

    const currentPositionPct = session.queue.length > 0 ? (session.currentIndex / session.queue.length) * 100 : 0;

    const previewPositionPct = useMemo(() => {
        if (!previewTargetIndex || session.queue.length === 0) return null;
        return (previewTargetIndex.idx / session.queue.length) * 100;
    }, [previewTargetIndex, session.queue.length]);

    const question = useMemo(() => {
        if (!currentRow || !currentRelation || !currentTable) return null;

        let modesToUse = currentRelation.interactionModes || [];
        if (modesToUse.length === 0) {
            modesToUse = currentRelation.compatibleModes || [StudyMode.Flashcards];
        }

        let mode: StudyMode;
        if (currentRelation.design?.isRandom && modesToUse.length > 1) {
            mode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
        } else {
            mode = modesToUse[0] || StudyMode.Flashcards;
        }

        return createQuestion(currentRow, currentRelation, currentTable, allRows, mode);
    }, [currentRow, currentRelation, currentTable, allRows]);

    const v3Card = useMemo(() => {
        if (!question) return null;
        return convertQuestionToCard(question);
    }, [question]);

    const calculateMove = (status: FlashcardStatus) => {
        const interval = sessionIntervals[status] ?? statusConfig[status].interval;
        const originalQueue = session.queue;
        const currentIndex = session.currentIndex;
        const queueLength = originalQueue.length;
        const insertIndexRaw = currentIndex + interval;
        const queueLengthAfterRemoval = queueLength > 0 ? queueLength - 1 : 0;
        const insertIndex = Math.min(insertIndexRaw, queueLengthAfterRemoval);
        return { interval, insertIndex, queueLengthAfterRemoval: queueLength };
    };

    const executeMove = (status: FlashcardStatus) => {
        const originalQueue = session.queue;
        const currentIndex = session.currentIndex;
        const cardId = originalQueue[currentIndex];

        const interval = sessionIntervals[status] ?? statusConfig[status].interval;
        const restOfQueue = originalQueue.filter((_, idx) => idx !== currentIndex);

        let nextIndex = currentIndex;

        const insertIndex = Math.min(currentIndex + interval, restOfQueue.length);
        const newQueue = [...restOfQueue.slice(0, insertIndex), cardId, ...restOfQueue.slice(insertIndex)];

        const newHistory = [...session.history, { rowId: currentRowId, status, timestamp: Date.now() }];

        // 1. Atomic Variable Creation (Complete State)
        const updatedCardStates = { ...(session.cardStates || {}), [currentRowId]: status };

        let cycleReset = false;
        if (nextIndex >= newQueue.length) {
            nextIndex = 0;
            cycleReset = true;
        }

        // --- New: Update Confi-Viewed Global Stat ---
        if (currentRow && currentTable) {
            const currentCount = currentRow.stats.confiViewed || 0;
            const newRow = {
                ...currentRow,
                stats: {
                    ...currentRow.stats,
                    confiViewed: currentCount + 1
                }
            };
            // This updates the global table store
            upsertRow(currentTable.id, newRow);
        }

        // 2. Persistence with Deep Copy
        const { confidenceProgresses } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);

        if (originalProgress) {
            const updatedProgress: ConfidenceProgress = {
                ...originalProgress,
                queue: newQueue,
                currentIndex: nextIndex, // This is the index for the *next* session
                cardStates: updatedCardStates, // CRITICAL: Explicitly pass complete cardStates map
            };
            saveConfidenceProgress(updatedProgress);
        } else {
            console.error("Could not find original progress to save!");
            showToast("Error saving progress.", "error");
        }

        // 3. Update the local session state for the UI to advance.
        const updatedSession = {
            ...session,
            queue: newQueue,
            currentIndex: nextIndex,
            cardStates: updatedCardStates,
            history: newHistory,
        };
        setSession(updatedSession);
        // FIX: Update global store state for synchronization
        updateActiveConfidenceSession(updatedSession);

        setIsAnswered(false);
        setFeedback(null);

        setSimulationData(null);
        setPreviewTargetIndex(null);

        if (cycleReset) {
            // Automatic completion flow
            const duration = Math.floor((Date.now() - session.startTime) / 1000);
            const droplets = Math.floor(duration / 60);
            const xpGained = newHistory.length * 5;

            // Stats are calculated and saved here, skipping the UI step to prevent double-saving
            updateStatsFromSession(duration, xpGained, 0, 'Confidence', droplets, newHistory.length);
            addDrops(droplets);
            useCounterStore.getState().increment(session.progressId);

            // Use triggerGlobalAction to ensure data consistency on cycle reset
            triggerGlobalAction(() => {
                setSummaryStats({ duration, droplets });
                setShowSummary(true);
            });
        }
    }

    const handleRate = (status: FlashcardStatus) => {
        if (isDebugMode) {
            const { interval, insertIndex } = calculateMove(status);
            setSimulationData({
                status,
                currentIdx: session.currentIndex,
                interval,
                targetIdx: insertIndex,
                queueLength: session.queue.length,
                cardId: currentRowId
            });
            return;
        }
        executeMove(status);
    };

    const handleResetSession = async () => {
        setIsResetConfirmOpen(false);
        const newSessionState = {
            ...session,
            currentIndex: 0,
            cardStates: {},
            history: [],
        };
        setSession(newSessionState);
        updateActiveConfidenceSession(newSessionState); // Sync Global

        // 1. Atomic Persistence for Reset
        const { confidenceProgresses } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);

        if (originalProgress) {
            const progressToUpdate = {
                ...originalProgress,
                currentIndex: 0,
                cardStates: {} // Clear states explicitly
            };
            await saveConfidenceProgress(progressToUpdate);
        }

        showToast("Session progress reset.", "success");
    };

    const handleConcludeSession = async () => {
        setIsEndSessionConfirmOpen(false);
        const duration = Math.floor((Date.now() - session.startTime) / 1000);
        const droplets = Math.floor(duration / 60);
        const xpGained = session.history.length * 5; // Based on interactions in current session

        // 1. Update Progress (Persistence) with Atomic Values - Ironclad Commit
        // We explicitly use the local 'session' state variables to ensure no stale data
        const { confidenceProgresses } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);

        if (originalProgress) {
            const updatedProgress: ConfidenceProgress = {
                ...originalProgress,
                queue: session.queue, // Snapshot from active session
                currentIndex: session.currentIndex, // Snapshot from active session
                cardStates: session.cardStates || {}, // Snapshot from active session
                intervalConfig: sessionIntervals,
            };
            // Push to sync queue immediately. Await to ensure queue is populated before trigger.
            await saveConfidenceProgress(updatedProgress);
        }

        // 2. Update Stats & Garden
        updateStatsFromSession(duration, xpGained, 0, 'Confidence', droplets, session.history.length);
        addDrops(droplets);
        useCounterStore.getState().increment(session.progressId);

        // 3. Trigger Global Sync & Show Summary
        // The triggerGlobalAction detects the pending items in syncQueue (from step 1),
        // activates the blocking overlay, flushes the queue, and only runs the callback
        // when sync is complete (or safely offline-queued).
        triggerGlobalAction(() => {
            setSummaryStats({ duration, droplets });
            setShowSummary(true);
        });
    };

    const handleCloseSummary = () => {
        // Use triggerGlobalAction again on exit to be double-safe against any pending actions
        // (e.g. if user clicked quickly or retried a sync)
        triggerGlobalAction(() => {
            useSessionStore.setState({ activeConfidenceSession: null });
            setCurrentScreen(Screen.Confidence);
            showToast("Session saved.", "success");
        });
    };

    const handleUnifiedAnswer = (userAnswer: any) => {
        if (!v3Card) return;

        if (v3Card.type === 'flashcard') {
            setIsAnswered(true);
            return;
        }

        const isCorrect = validateAnswer(v3Card, userAnswer);
        if (isCorrect) {
            playSuccessSound();
            setFeedback('correct');
        } else {
            playErrorSound();
            setFeedback('incorrect');
        }
        setIsAnswered(true);
    };

    const handleMouseEnterBtn = (status: FlashcardStatus) => {
        const { insertIndex } = calculateMove(status);
        setPreviewTargetIndex({ idx: insertIndex, color: statusConfig[status].hex });
    };

    const handleMouseLeaveBtn = () => {
        setPreviewTargetIndex(null);
    };

    const handleSkipMissingCard = () => {
        const newQueue = session.queue.filter((_, i) => i !== session.currentIndex);
        const nextIndex = Math.min(session.currentIndex, newQueue.length - 1);

        const updatedSession = {
            ...session,
            queue: newQueue,
            currentIndex: nextIndex
        };

        setSession(updatedSession);
        updateActiveConfidenceSession(updatedSession);

        // Persist
        const { confidenceProgresses } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);
        if (originalProgress) {
            saveConfidenceProgress({
                ...originalProgress,
                queue: newQueue,
                currentIndex: nextIndex
            });
        }

        setIsDataMissing(false);
        showToast("Card skipped and removed from queue.", "info");
    };

    const handleManualJump = (interval: number) => {
        setIsJumpModalOpen(false);
        const status = FlashcardStatus.Good;

        const originalQueue = session.queue;
        const currentIndex = session.currentIndex;
        const cardId = originalQueue[currentIndex];

        const restOfQueue = originalQueue.filter((_, idx) => idx !== currentIndex);

        const insertIndex = Math.min(interval, restOfQueue.length);

        const newQueue = [...restOfQueue.slice(0, insertIndex), cardId, ...restOfQueue.slice(insertIndex)];

        const newHistory = [...session.history, { rowId: cardId, status, timestamp: Date.now() }];

        // 1. Atomic Variable Creation
        const updatedCardStates = { ...(session.cardStates || {}), [cardId]: status };

        // 2. Persistence
        const { confidenceProgresses, saveConfidenceProgress } = useSessionDataStore.getState();
        const originalProgress = confidenceProgresses.find(p => p.id === session.progressId);

        if (originalProgress) {
            const updatedProgress: ConfidenceProgress = {
                ...originalProgress,
                queue: newQueue,
                currentIndex: 0, // Reset to head as the card moved away
                cardStates: updatedCardStates, // Explicit
            };
            saveConfidenceProgress(updatedProgress);
        }

        // 3. UI Update
        const updatedSession = {
            ...session,
            queue: newQueue,
            currentIndex: 0,
            cardStates: updatedCardStates,
            history: newHistory,
        };
        setSession(updatedSession);
        updateActiveConfidenceSession(updatedSession);

        setIsAnswered(false);
        setFeedback(null);
        setSimulationData(null);
        setPreviewTargetIndex(null);

        showToast(`Card jumped +${interval} spots.`, "success");
    };

    const handleIntervalChange = (status: FlashcardStatus, value: string) => {
        const numValue = Math.max(1, parseInt(value, 10) || 1);
        setSessionIntervals(prev => ({ ...prev, [status]: numValue }));
    };

    const handleSaveIntervals = () => {
        const { confidenceProgresses } = useSessionDataStore.getState();
        const progressToUpdate = confidenceProgresses.find(p => p.id === session.progressId);
        if (progressToUpdate) {
            saveConfidenceProgress({ ...progressToUpdate, intervalConfig: sessionIntervals as any });
            showToast("Intervals updated!", "success");
        }
        setIsIntervalEditorOpen(false);
    };

    // --- MANUAL CHECK/SYNC FUNCTION ---
    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            // 1. Retrieve full progress definition
            const { confidenceProgresses } = useSessionDataStore.getState();
            const progressDef = confidenceProgresses.find(p => p.id === session.progressId);

            if (!progressDef) {
                showToast("Session definition not found.", "error");
                return;
            }

            // 2. Identify Source Rows
            const { tables: globalTables } = useTableStore.getState();
            const sourceTables = globalTables.filter(t => progressDef.tableIds.includes(t.id));
            const allSourceRows = sourceTables.flatMap(t => t.rows);

            // 3. Identify Filter Criteria
            const filterTagNames = (progressDef.tags || []).filter(t => !t.startsWith('FC+'));
            const hasFilter = filterTagNames.length > 0;

            const validRowIds = new Set<string>();

            // 4. Evaluate Match
            allSourceRows.forEach(row => {
                let matches = true;
                if (hasFilter) {
                    const rowTagNames = (row.tagIds || [])
                        .map(id => allTags.find(t => t.id === id)?.name)
                        .filter(Boolean) as string[];

                    matches = rowTagNames.some(name => filterTagNames.includes(name));
                }

                if (matches) {
                    validRowIds.add(row.id);
                }
            });

            // 5. Reconcile with Current Queue
            const currentQueueSet = new Set(session.queue);
            const toAdd = Array.from(validRowIds).filter(id => !currentQueueSet.has(id));
            const toRemove = session.queue.filter(id => !validRowIds.has(id));

            if (toAdd.length === 0 && toRemove.length === 0) {
                showToast("Queue is already up to date.", "info");
                return;
            }

            // 6. Apply Updates (Atomic)
            const newQueue = [
                ...session.queue.filter(id => !toRemove.includes(id)),
                ...toAdd
            ];

            const newCardStates = { ...(session.cardStates || {}) };
            toRemove.forEach(id => delete newCardStates[id]);

            // Adjust current index if needed
            let newIndex = session.currentIndex;
            if (newIndex >= newQueue.length) {
                newIndex = Math.max(0, newQueue.length - 1);
            }

            // Update DB and Sync Queue via saveConfidenceProgress
            const updatedProgress: ConfidenceProgress = {
                ...progressDef,
                queue: newQueue,
                cardStates: newCardStates,
                currentIndex: newIndex,
                newWordCount: (progressDef.newWordCount || 0) + toAdd.length
            };
            await saveConfidenceProgress(updatedProgress);

            // Update ACTIVE session state immediately
            const updatedSession = {
                ...session,
                queue: newQueue,
                currentIndex: newIndex,
                cardStates: newCardStates,
            };
            setSession(updatedSession);
            updateActiveConfidenceSession(updatedSession);

            const addedMsg = toAdd.length > 0 ? `+${toAdd.length} added` : '';
            const removedMsg = toRemove.length > 0 ? `-${toRemove.length} removed` : '';
            const msg = [addedMsg, removedMsg].filter(Boolean).join(', ');

            showToast(`Synced: ${msg}. Changes added to push queue.`, "success");

        } catch (error) {
            console.error("Manual sync failed", error);
            showToast("Failed to sync queue.", "error");
        } finally {
            setIsSyncing(false);
        }
    };


    useEffect(() => {
        let timer: number;

        if (!question || !currentRow) {
            const isTableLoading = session.tableIds.some(tid => loadingTableIds.has(tid));

            if (isTableLoading) {
                setIsSyncing(true);
                setIsDataMissing(false);
            } else {
                setIsSyncing(true);
                session.tableIds.forEach(tid => fetchTablePayload(tid));
            }

            timer = window.setTimeout(() => {
                setIsDataMissing(true);
                setIsSyncing(false);
            }, 8000);

        } else {
            setIsDataMissing(false);
            setIsSyncing(false);
        }
        return () => clearTimeout(timer);
    }, [question, currentRow, session.tableIds, fetchTablePayload, loadingTableIds]);

    if (!question || !currentRow || !currentRelation || !currentTable || !v3Card) {
        if (isDataMissing) {
            return (
                <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
                    <Icon name="error-circle" className="w-12 h-12 text-error-500 mb-4" />
                    <h3 className="text-lg font-bold mb-2">Data is missing for this card</h3>
                    <p className="text-text-subtle mb-6">We couldn't load the content. This might happen if the card was deleted or sync is incomplete.</p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="secondary" onClick={handleSkipMissingCard}>Skip & Repair</Button>
                        <Button onClick={handleConcludeSession}>Return to Menu</Button>
                    </div>
                </div>
            )
        }
        return (
            <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center justify-center gap-3">
                <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin" />
                {isSyncing && (
                    <p className="text-sm font-medium text-text-subtle animate-pulse">Loading card data...</p>
                )}
            </div>
        );
    }

    if (showSummary && summaryStats) {
        return (
            <SessionSummaryOverlay
                durationSeconds={summaryStats.duration}
                dropletsEarned={summaryStats.droplets}
                onClose={handleCloseSummary}
            />
        );
    }

    return (
        <div className={`fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col transition-colors duration-300 ${isFullscreen ? 'z-50 p-0' : 'p-4'}`}>
            <header className="w-full px-4 md:px-6 mb-4 flex-shrink-0">
                <div className="flex justify-between items-center text-text-subtle mb-2">
                    <div className="flex items-center gap-2">
                        {/* Shortened label on mobile */}
                        <span className="font-semibold text-xs uppercase tracking-wider hidden sm:inline">Queue Distribution</span>
                        <span className="font-semibold text-xs uppercase tracking-wider sm:hidden">Queue</span>

                        {/* NEW BADGE: Confi-Viewed */}
                        <div className="flex items-center gap-1 px-2 py-1 bg-secondary-100 dark:bg-secondary-800 rounded-md text-xs font-mono text-text-subtle ml-2" title={`Total views: ${currentRow?.stats.confiViewed || 0}`}>
                            <Icon name="eye" className="w-3 h-3" />
                            <span>{currentRow?.stats.confiViewed || 0}</span>
                        </div>

                        {/* Check Now / Sync Button */}
                        <button
                            onClick={handleManualSync}
                            className={`p-1 rounded-md text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors ${isSyncing ? 'animate-pulse' : ''}`}
                            title="Check Now (Sync with Tables and add new matching words)"
                            disabled={isSyncing}
                        >
                            {isSyncing ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="arrow-down-tray" className="w-4 h-4" />}
                        </button>

                        {/* Desktop: Extended Controls */}
                        <div className="hidden md:flex items-center gap-2">
                            <button
                                onClick={() => setRelationToEdit(currentRelation)}
                                className="p-1 rounded-md text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                                title="Edit Card Design"
                            >
                                <Icon name="palette" className="w-4 h-4" />
                            </button>

                            <button
                                onClick={() => setIsJumpModalOpen(true)}
                                className="p-1 rounded-md text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                                title="Manual Jump"
                            >
                                <Icon name="arrowRight" className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsDebugMode(!isDebugMode)}
                                className={`p-1 rounded-md transition-colors ${isDebugMode ? 'text-warning-500 bg-warning-500/10' : 'text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                                title={isDebugMode ? "Disable Algorithm Debugger" : "Enable Algorithm Debugger"}
                            >
                                <Icon name="cog" className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setIsResetConfirmOpen(true)}
                                className="p-1 rounded-md text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                                title="Reset Session Progress"
                            >
                                <Icon name="repeat" className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile: Condensed 'More' Menu */}
                        <div className="md:hidden">
                            <Popover
                                isOpen={isMenuOpen}
                                setIsOpen={setIsMenuOpen}
                                trigger={
                                    <button className="p-1 rounded-md text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                                        <Icon name="dots-horizontal" className="w-4 h-4" />
                                    </button>
                                }
                                contentClassName="w-48 z-50"
                            >
                                <div className="p-1 space-y-1">
                                    <button onClick={() => { setRelationToEdit(currentRelation); setIsMenuOpen(false); }} className="w-full text-left px-2 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-2 text-text-main dark:text-secondary-100">
                                        <Icon name="palette" className="w-4 h-4 text-text-subtle" /> Edit Design
                                    </button>
                                    <button onClick={() => { setIsJumpModalOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-2 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-2 text-text-main dark:text-secondary-100">
                                        <Icon name="arrowRight" className="w-4 h-4 text-text-subtle" /> Manual Jump
                                    </button>
                                    <button onClick={() => { setIsDebugMode(!isDebugMode); setIsMenuOpen(false); }} className="w-full text-left px-2 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-2 text-text-main dark:text-secondary-100">
                                        <Icon name="cog" className="w-4 h-4 text-text-subtle" /> {isDebugMode ? "Disable Debug" : "Enable Debug"}
                                    </button>
                                    <button onClick={() => { setIsResetConfirmOpen(true); setIsMenuOpen(false); }} className="w-full text-left px-2 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-md flex items-center gap-2 text-warning-600">
                                        <Icon name="repeat" className="w-4 h-4" /> Reset Progress
                                    </button>
                                </div>
                            </Popover>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className={`p-1 rounded-md transition-colors ${isFullscreen ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                            title={isFullscreen ? "Exit Immersive Mode" : "Enter Immersive Mode"}
                        >
                            <Icon name={isFullscreen ? "x" : "arrows-pointing-out"} className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono font-bold text-text-main dark:text-secondary-100">
                            {learnedCount} / {session.queue.length}
                        </span>
                        <button
                            onClick={toggleConfidenceAutoplay}
                            className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                            title={isConfidenceAutoplayEnabled ? "Disable Autoplay" : "Enable Autoplay"}
                        >
                            <Icon name="volume-up" className={`w-5 h-5 transition-colors ${isConfidenceAutoplayEnabled ? 'text-primary-500' : 'text-text-subtle'}`} />
                        </button>

                        {/* Gallery View Trigger */}
                        {currentRow?.conceptLevelId && (
                            <button
                                onClick={() => setShowGallery(true)}
                                className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                                title="Open Level Gallery"
                            >
                                <Icon name="grid-outline" className={`w-5 h-5 hover:text-primary-500 transition-colors`} />
                            </button>
                        )}

                        <button onClick={() => setIsEndSessionConfirmOpen(true)} className="text-xs hover:text-text-main dark:hover:text-secondary-100 transition-colors p-1 md:p-0" title="End Session">
                            <span className="hidden md:inline">End Session</span>
                            <Icon name="logout" className="md:hidden w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="relative h-4 w-full rounded-full bg-secondary-200 dark:bg-secondary-800 overflow-visible mt-2">
                    <div
                        className="absolute inset-0 rounded-full transition-all duration-500 ease-out opacity-90"
                        style={{ background: queueGradient }}
                    />
                    <div
                        className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white dark:bg-white border-x border-black/20 shadow-lg z-20 transition-all duration-300 ease-out"
                        style={{ left: `${currentPositionPct}%` }}
                        title="Current Card"
                    >
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-white dark:border-t-white"></div>
                    </div>
                    {previewPositionPct !== null && (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-8 z-30 transition-all duration-200 ease-out animate-pulse"
                            style={{
                                left: `${previewPositionPct}%`,
                                backgroundColor: previewTargetIndex?.color,
                                boxShadow: `0 0 8px 2px ${previewTargetIndex?.color}`,
                                border: '1px solid white'
                            }}
                            title={`New Position: ${previewTargetIndex?.idx}`}
                        >
                            <div
                                className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent"
                                style={{ borderBottomColor: previewTargetIndex?.color }}
                            ></div>
                        </div>
                    )}
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-text-subtle font-mono px-0.5">
                    <span>Start</span>
                    <span>End</span>
                </div>
            </header>

            {/* Main content area - Using w-full and overflow-visible for the container to let card handle scroll */}
            <main className={`flex-1 flex flex-col w-full relative overflow-y-auto hide-scrollbar ${isAnswered ? 'md:pb-[200px]' : isFullscreen ? 'pb-4' : 'pb-24'} px-0`}>

                <UnifiedQuestionCard
                    key={v3Card.id}
                    card={v3Card}
                    design={currentRelation.design?.front}
                    backDesign={currentRelation.design?.back}
                    row={currentRow}
                    table={currentTable}
                    relation={currentRelation} // Pass relation here
                    onAnswer={handleUnifiedAnswer}
                    onEdit={() => setRowForDetailModal(currentRow)}
                    onViewInfo={() => setRowForInfoModal(currentRow)}
                    onReveal={() => setIsAnswered(true)}
                    hideFlashcardButtons={true}
                    onRelationUpdate={handleSaveRelation}
                />

                {/* Feedback Panel (stays in scrollable area) */}
                {isAnswered && v3Card.type !== 'flashcard' && feedback && (
                    <div className="w-full mt-6 px-4 md:px-6 animate-fadeIn">
                        <AnswerFeedbackPanel
                            feedback={feedback}
                            question={question}
                            row={currentRow}
                            relation={currentRelation}
                            table={currentTable}
                            onViewDetails={() => setRowForDetailModal(currentRow)}
                            onViewCorrectCard={() => setRowForInfoModal(currentRow)}
                        />
                    </div>
                )}
            </main>

            {/* Sticky Button Footer (Desktop only) */}
            {isAnswered && (
                <div className="md:fixed md:bottom-0 md:left-0 md:right-0 md:z-50 bg-surface/95 dark:bg-secondary-800/95 md:border-t border-secondary-200 dark:border-secondary-700 md:shadow-[0_-5px_25px_rgba(0,0,0,0.1)] md:backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-4">
                        {/* Action Row */}
                        <div className="flex justify-between items-center mb-2 px-1">
                            <div className="flex gap-3">
                                <button onClick={() => setRowForDetailModal(currentRow)} className="text-xs font-semibold text-text-subtle hover:text-text-main flex items-center gap-1 transition-colors">
                                    <Icon name="pencil" className="w-3.5 h-3.5" /> Edit
                                </button>
                                <button onClick={() => setRowForInfoModal(currentRow)} className="text-xs font-semibold text-text-subtle hover:text-text-main flex items-center gap-1 transition-colors">
                                    <Icon name="file-text" className="w-3.5 h-3.5" /> Info
                                </button>
                            </div>
                        </div>

                        {/* Grading Buttons */}
                        <div className="flex items-center gap-2">
                            <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full flex-1">
                                {[FlashcardStatus.Again, FlashcardStatus.Hard, FlashcardStatus.Good, FlashcardStatus.Easy, FlashcardStatus.Perfect, FlashcardStatus.Superb].map(status => {
                                    const effectiveInterval = sessionIntervals[status] ?? statusConfig[status].interval;
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => handleRate(status)}
                                            onMouseEnter={() => handleMouseEnterBtn(status)}
                                            onMouseLeave={handleMouseLeaveBtn}
                                            className={`py-2 sm:py-3 rounded-xl text-white text-[10px] sm:text-xs font-bold transition-transform hover:scale-105 shadow-md flex flex-col items-center justify-center ${statusConfig[status].color}`}
                                        >
                                            <span>{statusConfig[status].label}</span>
                                            <span className="opacity-80 font-normal mt-0.5">
                                                +{effectiveInterval}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                            <Popover
                                isOpen={isIntervalEditorOpen}
                                setIsOpen={setIsIntervalEditorOpen}
                                trigger={
                                    <Button variant="ghost" onClick={() => setIsIntervalEditorOpen(true)} className="p-2 h-full">
                                        <Icon name="cog" className="w-5 h-5 text-text-subtle" />
                                    </Button>
                                }
                                contentClassName="w-72"
                            >
                                <div className="p-4 space-y-3">
                                    <h4 className="text-sm font-semibold">Edit Intervals</h4>
                                    {(Object.keys(statusConfig) as (keyof typeof statusConfig)[]).map(status => (
                                        <div key={status} className="flex items-center justify-between gap-2">
                                            <label htmlFor={`interval-${status}`} className="text-sm font-medium flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${statusConfig[status].color}`}></div>
                                                {statusConfig[status].label}
                                            </label>
                                            <Input
                                                id={`interval-${status}`}
                                                type="number"
                                                value={sessionIntervals[status]}
                                                onChange={e => handleIntervalChange(status, e.target.value)}
                                                className="w-20 h-8 text-right"
                                                min={1}
                                            />
                                            <span className="text-xs text-text-subtle w-8">spots</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-end pt-2">
                                        <Button size="sm" onClick={handleSaveIntervals}>Save</Button>
                                    </div>
                                </div>
                            </Popover>
                        </div>
                    </div>
                </div>
            )}


            {simulationData && (
                <Modal isOpen={true} onClose={() => setSimulationData(null)} title="Algorithm Check">
                    <div className="p-6 space-y-4">
                        <div className="bg-secondary-100 dark:bg-secondary-800/50 p-4 rounded-lg border border-secondary-200 dark:border-secondary-700 font-mono text-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-text-subtle">Status:</span>
                                <span className={`font-bold`} style={{ color: statusConfig[simulationData.status].hex }}>{simulationData.status.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-text-subtle">Jump Interval:</span>
                                <span>+{simulationData.interval}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-text-subtle">Current Position:</span>
                                <span>{simulationData.currentIdx}</span>
                            </div>
                            <div className="flex justify-between border-t border-secondary-300 dark:border-secondary-600 pt-2 mt-2">
                                <span className="font-bold">Target Insertion:</span>
                                <span className="font-bold text-primary-600 dark:text-primary-400">Index {simulationData.targetIdx}</span>
                            </div>
                            <div className="text-xs text-text-subtle mt-3">
                                * Logic: The card is removed from index {simulationData.currentIdx}, remaining queue length is {simulationData.queueLength - 1}. Target is min(Current + {simulationData.interval}, Length).
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => setSimulationData(null)}>Cancel</Button>
                            <Button onClick={() => executeMove(simulationData.status)}>Confirm Move</Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ManualJumpModal
                isOpen={isJumpModalOpen}
                onClose={() => setIsJumpModalOpen(false)}
                onConfirm={handleManualJump}
                queueLength={session.queue.length}
            />

            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetSession}
                title="Reset Session?"
                message="This will clear all card colors (mastery status) for this session and restart from the beginning. This action cannot be undone."
                confirmText="Reset Progress"
                confirmVariant="primary" // Less destructive look than delete
            />

            <ConfirmationModal
                isOpen={isEndSessionConfirmOpen}
                onClose={() => setIsEndSessionConfirmOpen(false)}
                onConfirm={handleConcludeSession}
                title="End Session"
                message="Are you finished for now? Your progress will be saved."
                confirmText="View Summary & Finish"
                confirmVariant="primary"
            />

            <ConfirmationModal
                isOpen={!!rowToDelete}
                onClose={() => setRowToDelete(null)}
                onConfirm={() => rowToDelete && handleDeleteRowInSession(rowToDelete)}
                title="Delete Word?"
                message="Are you sure you want to delete this word permanently? It will be removed from all tables and sessions."
                warning="This action cannot be undone."
                confirmText="Delete Forever"
                confirmVariant="destructive"
            />

            <WordInfoModal
                isOpen={!!rowForInfoModal}
                row={rowForInfoModal}
                table={currentTable}
                onClose={() => setRowForInfoModal(null)}
                onEdit={() => {
                    if (rowForInfoModal) {
                        setRowForDetailModal(rowForInfoModal);
                    }
                    setRowForInfoModal(null);
                }}
            />

            <WordDetailModal
                isOpen={!!rowForDetailModal}
                row={rowForDetailModal}
                table={currentTable}
                columns={currentTable?.columns || []}
                aiPrompts={currentTable?.aiPrompts}
                imageConfig={currentTable?.imageConfig}
                audioConfig={currentTable?.audioConfig}
                onClose={() => setRowForDetailModal(null)}
                onSave={handleUpdateRowInModal}
                onDelete={(id) => setRowToDelete(id)}
                onConfigureAI={() => { }}
            />

            <RelationSettingsModal
                isOpen={!!relationToEdit}
                onClose={() => setRelationToEdit(null)}
                onSave={handleSaveRelation}
                relation={relationToEdit}
                table={currentTable!} // Assuming table exists when button is clickable
                initialTab="design"
            />

            {showGallery && currentRow && (
                <LevelGalleryView
                    currentRowId={currentRow.id}
                    onClose={() => setShowGallery(false)}
                    onNavigateToRow={(rowId) => {
                        console.log("Gallery requested navigation to:", rowId);
                        setShowGallery(false);
                        useUIStore.getState().showToast("Navigation is limited in Confidence mode.", "info");
                    }}
                />
            )}

            {/* Hide timer when summary is shown or editing relation */}
            {!showSummary && !relationToEdit && <FocusTimer displaySeconds={elapsedSeconds} />}
        </div>
    );
};

export default ConfidenceSessionScreen;
