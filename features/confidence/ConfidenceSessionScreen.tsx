
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { FlashcardStatus, StudyMode, SessionWordResult, VocabRow } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import UnifiedQuestionCard from '../study/components/v3/UnifiedQuestionCard';
import { playSuccessSound, playErrorSound } from '../../services/soundService';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../utils/studySessionGenerator';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import AnswerFeedbackPanel from '../study/components/AnswerFeedbackPanel';

const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; hex: string; interval: number } } = {
  [FlashcardStatus.New]: { label: 'New', color: 'gray', hex: '#9ca3af', interval: 0 }, // gray-400
  [FlashcardStatus.Again]: { label: 'Again (Fail)', color: 'bg-error-500 hover:bg-error-600', hex: '#ef4444', interval: 3 }, // red-500
  [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', hex: '#f97316', interval: 5 }, // orange-500
  [FlashcardStatus.Good]: { label: 'Good', color: 'bg-warning-500 hover:bg-warning-600', hex: '#eab308', interval: 8 }, // yellow-500
  [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-success-500 hover:bg-success-600', hex: '#22c55e', interval: 13 }, // green-500
  [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-info-500 hover:bg-info-600', hex: '#06b6d4', interval: 21 }, // cyan-500
  [FlashcardStatus.Superb]: { label: 'Superb', color: 'bg-purple-500 hover:bg-purple-600', hex: '#a855f7', interval: 34 }, // purple-500
};

const ConfidenceSessionScreen: React.FC = () => {
    const activeSession = useSessionStore(useShallow(state => state.activeConfidenceSession));
    const handleFinishConfidenceSession = useSessionStore(state => state.handleFinishConfidenceSession);
    const { setConfidenceProgresses } = useSessionDataStore();
    // Select tables and fetch action. 
    // Using useTableStore.getState() in effects for actions is better to avoid stale closures, 
    // but for rendering we need reactive state.
    const { tables, loadingTableIds, fetchTablePayload } = useTableStore(useShallow(state => ({ 
        tables: state.tables,
        loadingTableIds: state.loadingTableIds,
        fetchTablePayload: state.fetchTablePayload 
    })));
    const { showToast } = useUIStore();
    
    if (!activeSession) return null;

    const [session, setSession] = useState(activeSession);
    const [isAnswered, setIsAnswered] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [isDataMissing, setIsDataMissing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // New State for Simulation & Prediction
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

    // Track last pre-fetch index to avoid duplicate calls
    const lastPreFetchIndex = useRef<number | null>(null);

    const currentRowId = session.queue[session.currentIndex];
    
    // --- Data Retrieval & Question Generation ---
    // Optimization: Filter only tables involved in this session for lookup
    const sessionTables = useMemo(() => tables.filter(t => session.tableIds.includes(t.id)), [tables, session.tableIds]);
    const allRows = useMemo(() => sessionTables.flatMap(t => t.rows), [sessionTables]);
    
    const { table: currentTable, row: currentRow, relation: currentRelation } = useMemo(() => {
        for (const table of sessionTables) {
            const row = table.rows.find(r => r.id === currentRowId);
            if (row) {
                // 1. Try to find the EXACT relation saved in the session
                let relId = session.relationIds.find(rid => table.relations.some(r => r.id === rid));
                let relation = table.relations.find(r => r.id === relId);

                // 2. FAILSAFE: If the specific relation ID is missing (deleted/changed in settings),
                // but the table has other relations, use the first available one.
                if (!relation && table.relations.length > 0) {
                    relation = table.relations[0];
                }

                if (relation) return { table, row, relation };
            }
        }
        return { table: undefined, row: undefined, relation: undefined };
    }, [currentRowId, sessionTables, session.relationIds]);

    // --- Background Hydration Worker (Architecture v2.6) ---
    // Monitors progress and silently fetches upcoming data batches.
    useEffect(() => {
        const currentIndex = session.currentIndex;
        
        // Trigger logic periodically (e.g., every 3 cards)
        if (currentIndex % 3 === 0) {
             // Debounce duplicate triggers for the same index
            if (lastPreFetchIndex.current === currentIndex) return;
            
            // Define Lookahead Window
            const LOOKAHEAD_START_OFFSET = 20; // Start checking 20 cards ahead
            const LOOKAHEAD_RANGE = 30;        // Check next 30 cards (up to index+50)
            
            const start = currentIndex + LOOKAHEAD_START_OFFSET;
            const end = start + LOOKAHEAD_RANGE;
            const nextBatchIds = session.queue.slice(start, end);
            
            if (nextBatchIds.length === 0) return;

            // Identify missing rows in this batch
            const allLoadedRowIds = new Set(tables.flatMap(t => t.rows.map(r => r.id)));
            const missingCount = nextBatchIds.filter(id => !allLoadedRowIds.has(id)).length;

            if (missingCount > 0) {
                lastPreFetchIndex.current = currentIndex;
                
                // Identify which tables in the set are still unloaded (empty rows)
                // We assume missing rows belong to unloaded tables.
                const unloadedTableIds = session.tableIds.filter(tid => {
                    const t = tables.find(tbl => tbl.id === tid);
                    return !t || t.rows.length === 0;
                });
                
                // Trigger silent fetch for unloaded tables
                unloadedTableIds.forEach(tid => {
                    // Prevent duplicate fetch calls if already loading
                    if (!loadingTableIds.has(tid)) {
                        // Fire-and-forget. No await. No blocking toast.
                        fetchTablePayload(tid).catch(e => console.warn(`Background fetch failed for ${tid}`, e));
                    }
                });
            }
        }
    }, [session.currentIndex, session.queue, session.tableIds, tables, loadingTableIds, fetchTablePayload]);

    // Optimized: Create a Map of the latest status for each row based on SESSION PERSISTENCE
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

    // Generate Visual Gradient for Queue
    const queueGradient = useMemo(() => {
        const total = session.queue.length;
        if (total === 0) return 'none';

        const stops = session.queue.map((rowId, index) => {
            const status = sessionStatusMap.get(rowId) || FlashcardStatus.New;
            const color = statusConfig[status].hex;
            const startPct = (index / total) * 100;
            const endPct = ((index + 1) / total) * 100;
            return `${color} ${startPct}% ${endPct}%`;
        });

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [session.queue, sessionStatusMap]);
    
    // Calculate learned count based on current session state
    const learnedCount = useMemo(() => {
        return session.queue.reduce((count, rowId) => {
            const status = sessionStatusMap.get(rowId) || FlashcardStatus.New;
            // A card is "Learned" if its status is NOT New
            return status !== FlashcardStatus.New ? count + 1 : count;
        }, 0);
    }, [session.queue, sessionStatusMap]);

    const currentPositionPct = session.queue.length > 0 
        ? (session.currentIndex / session.queue.length) * 100 
        : 0;

    const previewPositionPct = useMemo(() => {
        if (!previewTargetIndex || session.queue.length === 0) return null;
        return (previewTargetIndex.idx / session.queue.length) * 100;
    }, [previewTargetIndex, session.queue.length]);


    // Determine Question Object
    const question = useMemo(() => {
        if (!currentRow || !currentRelation || !currentTable) return null;
        
        // --- NEW: Respect Relation's Interaction Mode settings ---
        let modesToUse = currentRelation.interactionModes || [];
        if (modesToUse.length === 0) {
            // Fallback for older relations
            modesToUse = currentRelation.compatibleModes || [StudyMode.Flashcards];
        }

        let mode: StudyMode;
        // Check the relation's design setting for randomization
        if (currentRelation.design?.isRandom && modesToUse.length > 1) {
            mode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
        } else {
            // Default to the first mode if not randomizing or only one is available
            mode = modesToUse[0] || StudyMode.Flashcards;
        }

        return createQuestion(currentRow, currentRelation, currentTable, allRows, mode);
    }, [currentRow, currentRelation, currentTable, allRows]);

    // --- V3 Architecture: Convert to QuestionCard ---
    const v3Card = useMemo(() => {
        if (!question) return null;
        return convertQuestionToCard(question);
    }, [question]);


    const calculateMove = (status: FlashcardStatus) => {
        const interval = session.intervalConfig?.[status] ?? statusConfig[status].interval;
        const originalQueue = session.queue;
        const currentIndex = session.currentIndex;
        const queueLength = originalQueue.length;
        const insertIndexRaw = currentIndex + interval;
        const insertIndex = Math.min(insertIndexRaw, queueLength - 1);
        return { interval, insertIndex, queueLengthAfterRemoval: queueLength };
    };

    const executeMove = (status: FlashcardStatus) => {
        const originalQueue = session.queue;
        const currentIndex = session.currentIndex;
        const cardId = originalQueue[currentIndex];

        const interval = session.intervalConfig?.[status] ?? statusConfig[status].interval;
        const restOfQueue = originalQueue.filter((_, idx) => idx !== currentIndex);

        // FIX: nextIndex should be the current index, as the next item slides into this position.
        let nextIndex = currentIndex;
        
        // FIX: Simplified and corrected re-insertion logic.
        const insertIndex = Math.min(currentIndex + interval, restOfQueue.length);
        const newQueue = [...restOfQueue.slice(0, insertIndex), cardId, ...restOfQueue.slice(insertIndex)];

        const newHistory = [...session.history, { rowId: currentRowId, status, timestamp: Date.now() }];
        const updatedCardStates = { ...session.cardStates, [currentRowId]: status };
        
        let cycleReset = false;
        if (nextIndex >= newQueue.length) {
            nextIndex = 0;
            cycleReset = true;
        }
        
        setConfidenceProgresses(prev => prev.map(p => {
            if (p.id === session.progressId) {
                return {
                    ...p,
                    queue: newQueue,
                    currentIndex: nextIndex,
                    cardStates: updatedCardStates,
                }
            }
            return p;
        }));

        setSession(prev => ({
            ...prev,
            queue: newQueue, 
            currentIndex: nextIndex, 
            history: newHistory,
            cardStates: updatedCardStates
        }));
        
        setIsAnswered(false);
        setFeedback(null);
        
        setSimulationData(null);
        setPreviewTargetIndex(null);
        
        if (cycleReset) {
            showToast("Queue completed. Starting next cycle.", "success");
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
        
        setConfidenceProgresses(prev => prev.map(p => 
            p.id === session.progressId 
                ? { ...p, currentIndex: 0, cardStates: {} } 
                : p
        ));
        
        showToast("Session progress reset.", "success");
    };

    const handleUnifiedAnswer = (userAnswer: any) => {
        if (!v3Card) return;

        // Flashcard Logic: Any answer is a "flip"
        if (v3Card.type === 'flashcard') {
            setIsAnswered(true);
            return;
        }

        // Interactive Logic
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
        // Remove current item locally from session queue to unblock user
        const newQueue = session.queue.filter((_, i) => i !== session.currentIndex);
        const nextIndex = Math.min(session.currentIndex, newQueue.length - 1);
        
        // 1. Update local session state
        setSession(prev => ({ 
            ...prev, 
            queue: newQueue, 
            currentIndex: nextIndex 
        }));
        
        // 2. Sync update to global store so it persists if they leave/return
        setConfidenceProgresses(prev => prev.map(p => {
            if (p.id === session.progressId) {
                return {
                    ...p,
                    queue: newQueue,
                    currentIndex: nextIndex
                }
            }
            return p;
        }));

        setIsDataMissing(false);
        showToast("Card skipped and removed from queue.", "info");
    };

    // Just-in-Time Recovery for missing data
    useEffect(() => {
        let timer: number;
        
        if (!question || !currentRow) {
            // --- RECOVERY LOGIC START ---
            // 1. Check if table is already loading.
            const isTableLoading = session.tableIds.some(tid => loadingTableIds.has(tid));
            
            if (isTableLoading) {
                // If loading, just show spinner, don't trigger sync again
                setIsSyncing(true);
                setIsDataMissing(false);
            } else {
                // If NOT loading and data is missing, trigger fetch
                setIsSyncing(true);
                session.tableIds.forEach(tid => fetchTablePayload(tid));
            }
            
            // 2. Set timeout for "Giving Up"
            timer = window.setTimeout(() => {
                setIsDataMissing(true);
                setIsSyncing(false);
            }, 8000); // Increased grace period to 8s for slow networks
            
            // --- RECOVERY LOGIC END ---
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
                    <Icon name="error-circle" className="w-12 h-12 text-error-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">Data is missing for this card</h3>
                    <p className="text-text-subtle mb-6">We couldn't load the content. This might happen if the card was deleted or sync is incomplete.</p>
                    <div className="flex gap-2 justify-center">
                        <Button variant="secondary" onClick={handleSkipMissingCard}>Skip & Repair</Button>
                        <Button onClick={() => handleFinishConfidenceSession(session)}>Return to Menu</Button>
                    </div>
                </div>
             )
         }
         return (
            <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center justify-center gap-3">
                <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin"/>
                {isSyncing && (
                    <p className="text-sm font-medium text-text-subtle animate-pulse">Loading card data...</p>
                )}
            </div>
         );
    }

    return (
        <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center p-4 transition-colors duration-300">
            <header className="w-full max-w-2xl mb-4">
                <div className="flex justify-between items-center text-text-subtle mb-2">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs uppercase tracking-wider">Queue Distribution</span>
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
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-text-main dark:text-secondary-100">
                            {learnedCount} / {session.queue.length}
                        </span>
                        <button onClick={() => handleFinishConfidenceSession(session)} className="text-xs hover:text-text-main dark:hover:text-secondary-100 transition-colors">End Session</button>
                    </div>
                </div>
                
                {/* Dynamic Queue Visualization Bar */}
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
            
            <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl relative overflow-y-auto hide-scrollbar pb-24">
                <UnifiedQuestionCard 
                    key={v3Card.id} // Force re-render on new card
                    card={v3Card}
                    design={currentRelation.design?.front}
                    backDesign={currentRelation.design?.back}
                    row={currentRow}
                    table={currentTable}
                    onAnswer={handleUnifiedAnswer}
                />
                
                {/* Feedback & Rating Area */}
                <div className="w-full mt-6 min-h-[80px] flex flex-col justify-center">
                    {isAnswered && (
                        <div className="animate-fadeIn w-full">
                            {/* Interactive Mode Feedback */}
                            {v3Card.type !== 'flashcard' && feedback && (
                                <div className="mb-4">
                                    <AnswerFeedbackPanel
                                        feedback={feedback}
                                        question={question}
                                        row={currentRow}
                                        relation={currentRelation}
                                        onViewDetails={() => {}} // Optional: Add detail view if needed
                                        onNext={() => { /* Wait for user to rate */ }}
                                        onViewCorrectCard={() => {}} 
                                    />
                                </div>
                            )}

                            {/* Rating Buttons (Always shown after answer) */}
                            <div className="grid grid-cols-6 gap-2 sm:gap-3 w-full">
                                {[FlashcardStatus.Again, FlashcardStatus.Hard, FlashcardStatus.Good, FlashcardStatus.Easy, FlashcardStatus.Perfect, FlashcardStatus.Superb].map(status => {
                                    const effectiveInterval = session.intervalConfig?.[status] ?? statusConfig[status].interval;
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
                                )})}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Algorithm Debug Modal */}
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
            
            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setIsResetConfirmOpen(false)}
                onConfirm={handleResetSession}
                title="Reset Session?"
                message="This will clear all card colors (mastery status) for this session and restart from the beginning. This action cannot be undone."
                confirmText="Reset Session"
                confirmVariant="primary" // Less destructive look than delete
            />
        </div>
    );
};

export default ConfidenceSessionScreen;
