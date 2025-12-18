
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnkiCard, AnkiSessionData, StudyMode } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { calculateNextAnkiState, AnkiCalculationResult } from '../../utils/srs';
import { formatAnkiInterval } from '../../utils/timeUtils';
import { Button } from '../../components/ui/Button';
import { useTagStore } from '../../stores/useTagStore';
import UnifiedQuestionCard from '../study/components/v3/UnifiedQuestionCard';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../utils/studySessionGenerator';
import { playSuccessSound, playErrorSound } from '../../services/soundService';
import FocusTimer from '../common/FocusTimer';

const ratingButtons: { label: string, quality: number, color: string, hotkey: string }[] = [
    { label: 'Again', quality: 1, color: 'bg-red-500 hover:bg-red-600', hotkey: '1' },
    { label: 'Hard', quality: 3, color: 'bg-orange-500 hover:bg-orange-600', hotkey: '2' },
    { label: 'Good', quality: 4, color: 'bg-blue-500 hover:bg-blue-600', hotkey: '3' },
    { label: 'Easy', quality: 5, color: 'bg-green-500 hover:bg-green-600', hotkey: '4' },
];

const AnkiSessionScreen: React.FC = () => {
    const activeAnkiSession = useSessionStore(useShallow(state => state.activeAnkiSession));
    const handleFinishAnkiSession = useSessionStore(state => state.handleFinishAnkiSession);
    const allTags = useTagStore(state => state.tags);
    
    const [sessionState, setSessionState] = useState(activeAnkiSession);
    const [isAnswered, setIsAnswered] = useState(false);
    const [lastResult, setLastResult] = useState<boolean | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    
    const goodButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!sessionState) return;
        const timer = setInterval(() => {
            setElapsedSeconds(Math.floor((Date.now() - sessionState.startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionState]);

    // Optimization: Fetch data only for the current card.
    const currentCard = sessionState?.currentCard;
    
    const { currentTable, currentRow, currentRelation } = useTableStore(useShallow(state => {
         if(!currentCard) return { currentTable: undefined, currentRow: undefined, currentRelation: undefined };
         const t = state.tables.find(tbl => tbl.id === currentCard.tableId);
         const r = t?.rows.find(row => row.id === currentCard.rowId);
         const rel = t?.relations.find(rel => rel.id === currentCard.relationId);
         return { currentTable: t, currentRow: r, currentRelation: rel };
    }));

    // --- Dynamic Question Generation (V3) ---
    const { questionObject, v3Card } = useMemo(() => {
        if (!currentTable || !currentRow || !currentRelation) return { questionObject: null, v3Card: null };

        // Determine Mode: Priority to 'interactionModes', fallback to 'compatibleModes', default to Flashcard
        const modes = currentRelation.interactionModes || currentRelation.compatibleModes || [];
        // Filter for supported modes in Anki (we support all now via UnifiedCard)
        let effectiveMode = modes.length > 0 ? modes[0] : StudyMode.Flashcards;
        
        // Special case: If configured as Flashcards, stick to it.
        if (modes.includes(StudyMode.Flashcards)) effectiveMode = StudyMode.Flashcards;

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
        const totalInitialCards = (sessionState.reviewQueue.length + sessionState.newQueue.length + sessionState.history.length + (sessionState.currentCard ? 1 : 0));
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
            } else {
                playErrorSound();
            }
        }
        
        setLastResult(correct);
        setIsAnswered(true);

        // UX Optimization: 
        // 1. Blur any active inputs (like Textarea) so Global Hotkeys (1,2,3,4, Space) work immediately.
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // 2. Auto-focus "Good" button for rapid flow if correct or just a flashcard flip
        if (correct || v3Card.type === 'flashcard') {
            // Small timeout to ensure the UI has re-rendered and the button exists
            setTimeout(() => {
                goodButtonRef.current?.focus();
            }, 50);
        }
    };

    const handleRate = (quality: number) => {
        if (!sessionState || !currentRow) return;
    
        const calculationResult = nextIntervals.get(quality);
        if (!calculationResult) return; 

        const { nextStats: newStats } = calculationResult;
    
        const updatedSession: AnkiSessionData = JSON.parse(JSON.stringify(sessionState));
    
        // 1. Add to history
        updatedSession.history.push({ rowId: currentRow.id, quality, timestamp: Date.now(), newStats });
    
        // 2. Handle failed cards ("Again")
        if (quality < 3) {
            updatedSession.learningQueue.push(sessionState.currentCard!);
        }
    
        // 3. Determine next card and update queues
        let nextCard: AnkiCard | null = null;
        if (updatedSession.reviewQueue.length > 0) {
            nextCard = updatedSession.reviewQueue.shift()!;
        } else if (updatedSession.newQueue.length > 0) {
            nextCard = updatedSession.newQueue.shift()!;
        } else if (updatedSession.learningQueue.length > 0) {
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
            // Standard Anki: Spacebar defaults to "Good" (Quality 4) when answer is shown
            if (e.code === 'Space') {
                e.preventDefault();
                handleRate(4);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isAnswered, sessionState, nextIntervals]);


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
    
    const progress = sessionProgress;

    return (
        <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col transition-colors duration-300">
            {/* Header */}
            <header className="w-full px-4 md:px-6 py-4 flex-shrink-0 z-30 bg-background/95 dark:bg-secondary-900/95 backdrop-blur">
                <div className="flex justify-between items-center text-text-subtle mb-2">
                    <span className="text-sm font-medium">{progress.reviewed} / {progress.total}</span>
                    <button onClick={() => handleFinishAnkiSession(sessionState)} className="text-sm hover:text-text-main dark:hover:text-secondary-100 transition-colors">End</button>
                </div>
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                </div>
            </header>

            {/* Scrollable Content Area */}
            <main className="flex-1 overflow-y-auto px-4 md:px-6 pb-32">
                <div className="w-full max-w-4xl mx-auto py-4">
                    <UnifiedQuestionCard
                        card={v3Card}
                        row={currentRow}
                        table={currentTable}
                        design={currentRelation?.design?.front}
                        backDesign={currentRelation?.design?.back}
                        onAnswer={handleUnifiedAnswer}
                    />
                </div>
            </main>

            {/* Sticky Rating Dock (Bottom Sheet on Mobile / Dock on Desktop) */}
            {isAnswered && (
                <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-surface/95 dark:bg-secondary-800/95 border-t border-secondary-200 dark:border-secondary-700 shadow-[0_-5px_25px_rgba(0,0,0,0.1)] backdrop-blur-md animate-slideInUp">
                    <div className="max-w-4xl mx-auto">
                        {lastResult !== null && v3Card.type !== 'flashcard' && (
                            <div className={`text-center font-bold text-sm mb-3 ${lastResult ? 'text-success-500' : 'text-error-500'}`}>
                                {lastResult ? 'Correct!' : 'Incorrect'}
                            </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 sm:gap-4">
                            {ratingButtons.map(btn => {
                                const intervalData = nextIntervals.get(btn.quality);
                                const intervalString = intervalData ? formatAnkiInterval(intervalData.interval, intervalData.unit) : '';
                                return (
                                    <button 
                                        key={btn.label} 
                                        ref={btn.label === 'Good' ? goodButtonRef : null}
                                        onClick={() => handleRate(btn.quality)} 
                                        className={`py-3 rounded-xl text-white font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${btn.color} shadow-sm group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:ring-offset-secondary-900`}
                                    >
                                        <span className="text-xs sm:text-sm">{btn.label}</span>
                                        <span className="text-[10px] text-white/80 font-medium mt-0.5">{intervalString}</span>
                                        {/* Desktop Hotkey Hint */}
                                        <span className="hidden md:block absolute -top-2 -right-2 bg-black/60 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {btn.hotkey}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            <div className="hidden md:block absolute bottom-4 left-4 text-[10px] text-text-subtle z-40">
                <span>New: {sessionState.newQueue.length}</span> • 
                <span> Learning: {sessionState.learningQueue.length}</span> • 
                <span> Review: {sessionState.reviewQueue.length}</span>
            </div>
            
            <FocusTimer displaySeconds={elapsedSeconds} />
        </div>
    );
};

export default AnkiSessionScreen;
