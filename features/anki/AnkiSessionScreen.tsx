
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnkiCard, AnkiSessionData, StudyMode, VocabRow } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { calculateNextAnkiState, AnkiCalculationResult } from '../../utils/srs';
import { formatAnkiInterval } from '../../utils/timeUtils';
import { Button } from '../../components/ui/Button';
import { useTagStore } from '../../stores/useTagStore';
import UnifiedQuestionCard from '../study/components/v3/UnifiedQuestionCard';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../utils/studySessionGenerator';
import { playSuccessSound, playErrorSound } from '../../services/soundService';
import FocusTimer from '../common/FocusTimer';
import AnswerFeedbackPanel from '../study/components/AnswerFeedbackPanel';
import WordDetailModal from '../tables/WordDetailModal';
import WordInfoModal from '../tables/components/WordInfoModal';
import RelationSettingsModal from '../tables/components/RelationSettingsModal';
import LevelGalleryView from '../concepts/LevelGalleryView'; // Import Gallery View
import { Relation } from '../../types';

const ratingButtons: { label: string, quality: number, color: string, hotkey: string }[] = [
    { label: 'Again', quality: 1, color: 'bg-red-500 hover:bg-red-600', hotkey: '1' },
    { label: 'Hard', quality: 3, color: 'bg-orange-500 hover:bg-orange-600', hotkey: '2' },
    { label: 'Good', quality: 4, color: 'bg-blue-500 hover:bg-blue-600', hotkey: '3' },
    { label: 'Easy', quality: 5, color: 'bg-green-500 hover:bg-green-600', hotkey: '4' },
];

const AnkiSessionScreen: React.FC = () => {
    const activeAnkiSession = useSessionStore(useShallow(state => state.activeAnkiSession));
    const handleFinishAnkiSession = useSessionStore(state => state.handleFinishAnkiSession);
    const { isAnkiAutoplayEnabled, toggleAnkiAutoplay } = useUIStore(useShallow(state => ({
        isAnkiAutoplayEnabled: state.isAnkiAutoplayEnabled,
        toggleAnkiAutoplay: state.toggleAnkiAutoplay
    })));
    const upsertRow = useTableStore(state => state.upsertRow);
    const deleteRows = useTableStore(state => state.deleteRows);

    const [sessionState, setSessionState] = useState(activeAnkiSession);
    const [isAnswered, setIsAnswered] = useState(false);
    const [lastResult, setLastResult] = useState<boolean | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

    const [relationToEdit, setRelationToEdit] = useState<Relation | null>(null);
    const [showGallery, setShowGallery] = useState(false);

    // Modal State
    const [rowForDetailModal, setRowForDetailModal] = useState<VocabRow | null>(null);
    const [rowForInfoModal, setRowForInfoModal] = useState<VocabRow | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // For "Early Review" check or timer check
    const [tick, setTick] = useState(0);

    const goodButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!sessionState || relationToEdit) return; // Pause timer if editing design
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - sessionState.startTime) / 1000));
            setTick(t => t + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionState]);

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

    // Optimization: Fetch data only for the current card.
    const currentCard = sessionState?.currentCard;

    const { currentTable, currentRow, currentRelation } = useTableStore(useShallow(state => {
        if (!currentCard) return { currentTable: undefined, currentRow: undefined, currentRelation: undefined };
        const t = state.tables.find(tbl => tbl.id === currentCard.tableId);
        const r = t?.rows.find(row => row.id === currentCard.rowId);
        const rel = t?.relations.find(rel => rel.id === currentCard.relationId);
        return { currentTable: t, currentRow: r, currentRelation: rel };
    }));

    // --- Dynamic Question Generation (V3) ---
    const { questionObject, v3Card } = useMemo(() => {
        if (!currentTable || !currentRow || !currentRelation) return { questionObject: null, v3Card: null };

        // Determine Mode: Priority to 'interactionModes', fallback to 'compatibleModes', default to Flashcard
        let modesToUse = currentRelation.interactionModes || [];
        if (modesToUse.length === 0) {
            modesToUse = currentRelation.compatibleModes || [StudyMode.Flashcards];
        }

        let effectiveMode: StudyMode;
        if (currentRelation.design?.isRandom && modesToUse.length > 1) {
            effectiveMode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
        } else {
            effectiveMode = modesToUse[0] || StudyMode.Flashcards;
        }

        // Generate the Question object with context (using all rows for distractors if needed)
        const q = createQuestion(currentRow, currentRelation, currentTable, currentTable.rows, effectiveMode);

        if (!q) return { questionObject: null, v3Card: null };

        return {
            questionObject: q,
            v3Card: convertQuestionToCard(q)
        };
    }, [currentTable, currentRow, currentRelation]);


    const { sessionProgress } = useMemo(() => {
        if (!sessionState || !sessionState.currentCard) {
            return { sessionProgress: { reviewed: 0, total: 0, percent: 0 } };
        }
        // Total is hard to estimate perfectly because Learning cards repeat.
        // We'll trust the initial queue sizes + history.
        const totalInitialCards = (sessionState.reviewQueue.length + sessionState.newQueue.length + sessionState.learningQueue.length + sessionState.history.length + (sessionState.currentCard ? 1 : 0));
        const reviewedCount = sessionState.history.length;

        return {
            sessionProgress: {
                reviewed: reviewedCount,
                total: totalInitialCards,
                percent: totalInitialCards > 0 ? (reviewedCount / totalInitialCards) * 100 : 0
            }
        };
    }, [sessionState]);

    const nextIntervals = useMemo(() => {
        if (!currentRow || !sessionState) return new Map<number, AnkiCalculationResult>();

        const intervals = new Map<number, AnkiCalculationResult>();
        ratingButtons.forEach(btn => {
            const result = calculateNextAnkiState(currentRow.stats, btn.quality, sessionState.config);
            intervals.set(btn.quality, result);
        });
        return intervals;

    }, [currentRow, sessionState]);

    // --- Interaction Handlers ---

    const handleUnifiedAnswer = (userAnswer: any) => {
        if (isAnswered || !v3Card) return;

        let correct = true;
        // If it's interactive (not flashcard), check the answer
        if (v3Card.type !== 'flashcard') {
            correct = validateAnswer(v3Card, userAnswer);
            if (correct) {
                playSuccessSound();
                setFeedback('correct');
            } else {
                playErrorSound();
                setFeedback('incorrect');
            }
        } else {
            // For Flashcards, we just mark as answered (revealed)
            setFeedback(null);
        }

        setLastResult(correct);
        setIsAnswered(true);

        // UX Optimization: 
        // 1. Blur any active inputs
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // 2. Auto-focus "Good" button
        if (correct || v3Card.type === 'flashcard') {
            setTimeout(() => {
                goodButtonRef.current?.focus();
            }, 50);
        }
    };

    const handleRate = (quality: number) => {
        if (!sessionState || !currentRow) return;

        const calculationResult = nextIntervals.get(quality);
        if (!calculationResult) return;

        const { nextStats: newStats, nextState, dueInMinutes } = calculationResult;
        const now = Date.now();

        const updatedSession: AnkiSessionData = JSON.parse(JSON.stringify(sessionState));

        // 1. Add to history
        updatedSession.history.push({
            rowId: currentRow.id,
            quality,
            timestamp: now,
            newStats
        });

        // 2. Handle Learning/Relearning Re-queuing
        const updatedCard: AnkiCard = {
            ...sessionState.currentCard!,
            state: nextState,
            step: newStats.ankiStep || 0,
            interval: newStats.ankiInterval || 0,
            easeFactor: newStats.ankiEaseFactor || 2.5,
            due: newStats.ankiDueDate || (now + dueInMinutes * 60 * 1000),
            lapses: newStats.ankiLapses || 0
        };

        if (nextState === 'Learning' || nextState === 'Relearning') {
            updatedSession.learningQueue.push(updatedCard);
            updatedSession.learningQueue.sort((a, b) => a.due - b.due);
        }

        // 3. Determine next card and update queues
        let nextCard: AnkiCard | null = null;
        const currentTimestamp = Date.now();

        if (updatedSession.learningQueue.length > 0 && updatedSession.learningQueue[0].due <= currentTimestamp) {
            nextCard = updatedSession.learningQueue.shift()!;
        }
        else if (updatedSession.reviewQueue.length > 0) {
            nextCard = updatedSession.reviewQueue.shift()!;
        }
        else if (updatedSession.newQueue.length > 0) {
            nextCard = updatedSession.newQueue.shift()!;
        }
        else if (updatedSession.learningQueue.length > 0) {
            nextCard = updatedSession.learningQueue.shift()!;
        }

        if (!nextCard) {
            handleFinishAnkiSession({ ...updatedSession, currentCard: null });
            return;
        }

        updatedSession.currentCard = nextCard;

        setSessionState(updatedSession);
        setIsAnswered(false);
        setLastResult(null);
        setFeedback(null);
    };

    // Keyboard Shortcuts for Desktop
    useEffect(() => {
        if (!isAnswered) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const rating = ratingButtons.find(r => r.hotkey === e.key);
            if (rating) {
                e.preventDefault();
                handleRate(rating.quality);
            }
            if (e.code === 'Space') {
                e.preventDefault();
                handleRate(4);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAnswered, sessionState, nextIntervals]);

    const handleUpdateRowInModal = async (updatedRow: VocabRow): Promise<boolean> => {
        if (!currentTable) return false;
        const success = await upsertRow(currentTable.id, updatedRow);
        if (success) {
            setRowForDetailModal(null);
        }
        return success;
    };


    if (!sessionState || !currentRow || !v3Card) {
        return (
            <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center justify-center">
                <Icon name="check-circle" className="w-16 h-16 text-primary-500 mb-4" />
                <h2 className="text-2xl font-bold mb-4">Anki Review Complete!</h2>
                <Button onClick={() => handleFinishAnkiSession(sessionState || activeAnkiSession!)}>
                    Return to Menu
                </Button>
            </div>
        );
    }

    // For formatting intervals properly (e.g. "10m", "4d")
    const formatDue = (min: number) => {
        if (min < 60) return `< ${Math.ceil(min)}m`;
        const hours = min / 60;
        if (hours < 24) return `~${Math.round(hours)}h`;
        return `${Math.round(hours / 24)}d`;
    };

    return (
        <div className={`fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col transition-colors duration-300 ${isFullscreen ? 'z-50 p-0' : 'p-4'}`}>
            {/* Header */}
            <header className="w-full px-4 md:px-6 mb-4 flex-shrink-0">
                <div className="flex justify-between items-center text-text-subtle mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider 
                            ${currentCard.state === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                currentCard.state === 'Review' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                            {currentCard.state}
                        </span>
                        <span className="text-xs font-medium pl-2">Done: {sessionState.history.length}</span>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        {currentRelation && (
                            <button
                                onClick={() => setRelationToEdit(currentRelation)}
                                className="p-1 rounded-md text-text-subtle hover:text-text-main hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                                title="Edit Card Design"
                            >
                                <Icon name="pencil" className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className={`p-1 rounded-md transition-colors ${isFullscreen ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                            title={isFullscreen ? "Exit Immersive Mode" : "Enter Immersive Mode"}
                        >
                            <Icon name={isFullscreen ? "x" : "arrows-pointing-out"} className="w-4 h-4" />
                        </button>
                        <button
                            onClick={toggleAnkiAutoplay}
                            title={isAnkiAutoplayEnabled ? "Disable Autoplay" : "Enable Autoplay"}
                        >
                            <Icon name="volume-up" className={`w-5 h-5 transition-colors ${isAnkiAutoplayEnabled ? 'text-primary-500' : 'text-text-subtle'}`} />
                        </button>

                        {/* Gallery View Trigger */}
                        {currentRow?.conceptLevelId && (
                            <button
                                onClick={() => setShowGallery(true)}
                                title="Open Level Gallery"
                                className="text-text-subtle hover:text-primary-500 transition-colors"
                            >
                                <Icon name="grid-outline" className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={() => handleFinishAnkiSession(sessionState)} className="text-xs hover:text-text-main dark:hover:text-secondary-100 transition-colors p-1 md:p-0" title="End Session">
                            <span className="hidden md:inline">End Session</span>
                            <Icon name="logout" className="md:hidden w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="relative h-1 w-full rounded-full bg-secondary-200 dark:bg-secondary-800 overflow-hidden">
                    <div className="bg-primary-500 h-full rounded-full transition-all duration-300" style={{ width: `${sessionProgress?.sessionProgress?.percent || 0}%` }}></div>
                </div>
            </header>

            {/* Main content area */}
            <main className={`flex-1 flex flex-col w-full relative overflow-y-auto hide-scrollbar ${isAnswered ? 'md:pb-[180px]' : 'pb-4'} px-0`}>
                <div className="w-full max-w-4xl mx-auto py-2">
                    <UnifiedQuestionCard
                        card={v3Card}
                        row={currentRow}
                        table={currentTable}
                        design={currentRelation?.design?.front}
                        backDesign={currentRelation?.design?.back}
                        onAnswer={handleUnifiedAnswer}
                        onReveal={() => { setIsAnswered(true); setFeedback(null); }}
                        hideFlashcardButtons={true}
                    />

                    {/* Feedback Panel (stays in scrollable area) */}
                    {isAnswered && v3Card.type !== 'flashcard' && feedback && questionObject && (
                        <div className="w-full mt-6 px-4 md:px-6 animate-fadeIn">
                            <AnswerFeedbackPanel
                                feedback={feedback}
                                question={questionObject}
                                row={currentRow}
                                relation={currentRelation}
                                table={currentTable}
                                onViewDetails={() => setRowForDetailModal(currentRow)}
                                onViewCorrectCard={() => setRowForInfoModal(currentRow)}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Sticky Button Footer (Desktop only) */}
            {isAnswered && (
                <div className="md:fixed md:bottom-0 md:left-0 md:right-0 md:z-50 bg-surface/95 dark:bg-secondary-800/95 md:border-t border-secondary-200 dark:border-secondary-700 md:shadow-[0_-5px_25px_rgba(0,0,0,0.1)] md:backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-4">
                        {/* Action Row */}
                        <div className="flex justify-between items-center mb-3 px-1">
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
                            <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full flex-1">
                                {ratingButtons.map(btn => {
                                    const intervalData = nextIntervals.get(btn.quality);
                                    const intervalString = intervalData ? formatDue(intervalData.dueInMinutes) : '-';
                                    return (
                                        <button
                                            key={btn.label}
                                            ref={btn.label === 'Good' ? goodButtonRef : null}
                                            onClick={() => handleRate(btn.quality)}
                                            className={`py-2 sm:py-3 rounded-xl text-white text-[10px] sm:text-xs font-bold transition-transform hover:scale-105 shadow-md flex flex-col items-center justify-center ${btn.color} group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:ring-offset-secondary-900`}
                                        >
                                            <span>{btn.label}</span>
                                            <span className="opacity-80 font-normal mt-0.5">{intervalString}</span>
                                            <span className="hidden md:block absolute -top-2 -right-2 bg-black/60 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {btn.hotkey}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <div className="hidden md:block absolute bottom-4 left-4 text-[10px] text-text-subtle z-40 bg-surface/80 px-2 py-1 rounded backdrop-blur">
                <span className="text-blue-500 font-bold">{sessionState.newQueue.length} New</span> •
                <span className="text-orange-500 font-bold"> {sessionState.learningQueue.length} Lrn</span> •
                <span className="text-green-500 font-bold"> {sessionState.reviewQueue.length} Rev</span>
            </div>

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
                onDelete={() => { /* Anki deletion is complex, might need to call global delete, for now keep simple or add if needed */ }}
                onConfigureAI={() => { }}
            />

            {relationToEdit && currentTable && (
                <RelationSettingsModal
                    isOpen={!!relationToEdit}
                    relation={relationToEdit}
                    table={currentTable}
                    onClose={() => setRelationToEdit(null)}
                    onSave={async (updatedRel) => {
                        if (!currentTable) return;
                        const updatedRelations = currentTable.relations.map(r => r.id === updatedRel.id ? updatedRel : r);
                        await upsertRow(currentTable.id, { ...currentRow } as any); // Trigger reactivity if needed, but actually we need updateTable
                        // But wait, AnkiSessionScreen calls upsertRow/deleteRows directly from store.
                        // We need updateTable from store to save relation changes.
                        useTableStore.getState().updateTable({ ...currentTable, relations: updatedRelations });
                        setRelationToEdit(null);
                        useUIStore.getState().showToast("Card design updated.", "success");
                    }}
                />
            )}

            {showGallery && currentRow && (
                <LevelGalleryView
                    currentRowId={currentRow.id}
                    onClose={() => setShowGallery(false)}
                    onNavigateToRow={(rowId) => {
                        console.log("Gallery requested navigation to:", rowId);
                        setShowGallery(false);
                        useUIStore.getState().showToast("Navigation is limited in SRS mode.", "info");
                    }}
                />
            )}

            <FocusTimer displaySeconds={elapsedSeconds} />
        </div>
    );
};

export default AnkiSessionScreen;
