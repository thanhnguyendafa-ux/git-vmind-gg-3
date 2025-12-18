
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, StudySessionData, Question, StudyMode, SessionWordResult, SessionItemState, VocabRow, Table, Relation } from '../../types';
import Icon from '../../components/ui/Icon';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useUserStore } from '../../stores/useUserStore';
import { useTableStore } from '../../stores/useTableStore';
import { useTagStore } from '../../stores/useTagStore';
import { generateHint } from '../../services/geminiService';
import { Button } from '../../components/ui/Button';
import { playSuccessSound, playErrorSound } from '../../services/soundService';
import { useContextLinks } from '../../hooks/useContextLinks';
import { convertQuestionToCard, validateAnswer } from '../../utils/studySessionGenerator';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Popover from '../../components/ui/Popover';


// Child Components
import StudySessionHeader from '../study/components/StudySessionHeader';
import TopTracker from '../study/components/TopTracker';
import SessionDashboard from '../study/components/SessionDashboard'; // Import Dashboard
import UnifiedQuestionCard from '../study/components/v3/UnifiedQuestionCard'; // V3 Architecture
import AnswerFeedbackPanel from '../study/components/AnswerFeedbackPanel';
import WordInfoModal from '../tables/components/WordInfoModal';
import WordDetailModal from '../tables/WordDetailModal';
import ContextViewer from '../study/components/ContextViewer';
import RowTagEditor from '../../components/ui/RowTagEditor';
import FocusTimer from '../common/FocusTimer';

const XP_PER_CORRECT_ANSWER = 10;

const StudySessionScreen: React.FC = () => {
    // Optimization: Select specific session data and actions
    const session = useSessionStore(useShallow(state => state.activeSession));
    const handleEndSession = useSessionStore(state => state.handleEndSession);
    const handleSessionQuit = useSessionStore(state => state.handleSessionQuit);

    const { showToast, setIsApiKeyModalOpen, isImmersive, toggleImmersiveMode, setIsImmersive } = useUIStore();
    const handleSaveToJournal = useNoteStore(state => state.handleSaveToJournal);
    const userStats = useUserStore(useShallow(state => state.stats));
    
    // Optimization: Get action independently to avoid re-renders on state changes
    const { upsertRow, updateTable } = useTableStore(useShallow(state => ({
        upsertRow: state.upsertRow,
        updateTable: state.updateTable
    })));
    const allTags = useTagStore(state => state.tags);
    
    // --- State Management for Dynamic Queue ---
    const originalQuestions = React.useMemo(() => session?.questions || [], [session]);
    const [activeQueue, setActiveQueue] = React.useState<Question[]>(() => originalQuestions.slice(session?.startIndex || 0));
    const [masteredRows, setMasteredRows] = React.useState<Set<string>>(new Set());
    const [itemStates, setItemStates] = React.useState<Record<string, SessionItemState>>(() =>
        Object.fromEntries(originalQuestions.map(q => [q.rowId, SessionItemState.Unseen]))
    );
    const currentQuestion = activeQueue[0];
    const masteredCount = masteredRows.size;
    // --- End New State ---

    // Optimization: Atomic selector to fetch ONLY the data needed for the current question
    const { table, relation, row } = useTableStore(useShallow(state => {
        if (!currentQuestion) return { table: null, relation: null, row: null };
        const t = state.tables.find(t => t.id === currentQuestion.tableId);
        if (!t) return { table: null, relation: null, row: null };
        
        const r = t.relations.find(rel => rel.id === currentQuestion.relationId) || null;
        const w = t.rows.find(row => row.id === currentQuestion.rowId) || null;
        
        return { table: t, relation: r, row: w };
    }));

    const [userInput, setUserInput] = useState(''); // Kept for legacy typing handling if needed
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    const [sessionResults, setSessionResults] = useState<SessionWordResult[]>([]);
    const [isQuitting, setIsQuitting] = useState(false);
    const [hint, setHint] = useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
    const [isJournaled, setIsJournaled] = useState(false);
    const [rowForDetailModal, setRowForDetailModal] = React.useState<VocabRow | null>(null);
    const [rowForInfoModal, setRowForInfoModal] = React.useState<VocabRow | null>(null);
    const [sessionXp, setSessionXp] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(() => Math.floor((Date.now() - (session?.startTime || Date.now())) / 1000));
    
    // Initialize Speed Mode based on relation config if available
    const [isSpeedMode, setIsSpeedMode] = useState(() => {
        if (relation?.speedModeDefault !== undefined) return relation.speedModeDefault;
        return false;
    });
    
    const [showTrackerWords, setShowTrackerWords] = useState(false);
    const [shake, setShake] = useState(false);
    const [isTagEditorOpen, setIsTagEditorOpen] = React.useState(false);

    // New state for session settings
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
    const [reinsertIndex, setReinsertIndex] = useLocalStorage('vmind-study-session-reinsert-index', 2);
    
    const contextLinks = useContextLinks(currentQuestion?.rowId);
    const isAnswered = feedback !== null;

    const tagCounts = useMemo(() => {
        const counts = new Map<string, number>();
        if (!table) return counts;
        const allTagsMap = new Map(allTags.map(t => [t.id, t.name]));
        for (const r of table.rows) {
            if (r.tagIds) {
                for (const tagId of r.tagIds) {
                    const tagName = allTagsMap.get(tagId);
                    if (typeof tagName === 'string') {
                        counts.set(tagName, (counts.get(tagName) || 0) + 1);
                    }
                }
            }
        }
        return counts;
    }, [table, allTags]);

    const rowTagNames = React.useMemo(() => {
        if (!row?.tagIds) return [];
        const tagMap = new Map(allTags.map(t => [t.id, t.name]));
        return row.tagIds.map(id => tagMap.get(id)).filter((name): name is string => !!name);
    }, [row?.tagIds, allTags]);
    
    const trackerQuestions = React.useMemo(() => {
        const masteredQuestions = originalQuestions.filter(q => 
            masteredRows.has(q.rowId) && !activeQueue.some(aq => aq.rowId === q.rowId)
        );
        return [...activeQueue, ...masteredQuestions];
    }, [originalQuestions, masteredRows, activeQueue]);

    // --- V3 Architecture Adapter ---
    const v3Card = useMemo(() => {
        if (!currentQuestion) return null;
        return convertQuestionToCard(currentQuestion);
    }, [currentQuestion]);


    useEffect(() => {
        if (!session) { useUIStore.getState().setCurrentScreen(Screen.Home); }
        const timer = setInterval(() => { setElapsedSeconds(Math.floor((Date.now() - session!.startTime) / 1000)); }, 1000);
        return () => clearInterval(timer);
    }, [session]);
    
    useEffect(() => {
        if (activeQueue.length === 0 && originalQuestions.length > 0 && session) {
            const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
            handleEndSession(sessionResults, durationSeconds);
        }
    }, [activeQueue, originalQuestions, session, sessionResults, handleEndSession]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input field
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
                return;
            }
    
            if (e.key === 'f') {
                e.preventDefault();
                toggleImmersiveMode();
            } else if (e.key === 'Escape') {
                if (isImmersive) {
                    e.preventDefault();
                    setIsImmersive(false);
                }
            }
        };
    
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isImmersive, toggleImmersiveMode, setIsImmersive]);


    const handleNextQuestion = useCallback(() => {
        setFeedback(null);
        setHint({ text: '', isLoading: false });
        setIsJournaled(false);
        setUserInput('');
    }, []);

    const handleCheckAnswer = useCallback((answer: any) => {
        if (isAnswered || !currentQuestion) return;
        
        let isCorrect = false;
        
        // V3 Validation Logic
        if (v3Card) {
            isCorrect = validateAnswer(v3Card, answer);
        }
        
        setSessionResults(prev => [...prev, { rowId: currentQuestion.rowId, isCorrect, timestamp: Date.now(), hintUsed: !!hint.text }]);
        
        const currentState = itemStates[currentQuestion.rowId];

        if (isCorrect) {
            playSuccessSound();
            setFeedback('correct');
            
            if (currentState === SessionItemState.Unseen || currentState === SessionItemState.Fail) {
                setItemStates(prev => ({ ...prev, [currentQuestion.rowId]: SessionItemState.Pass1 }));
                setActiveQueue(prev => {
                    const newQueue = [...prev];
                    const answeredQuestion = newQueue.shift();
                    if (answeredQuestion) newQueue.push(answeredQuestion);
                    return newQueue;
                });
            } else if (currentState === SessionItemState.Pass1) {
                setItemStates(prev => ({ ...prev, [currentQuestion.rowId]: SessionItemState.Pass2 }));
                setMasteredRows(prev => new Set(prev).add(currentQuestion.rowId));
                setSessionXp(xp => xp + XP_PER_CORRECT_ANSWER);
                setActiveQueue(prev => prev.slice(1));
            }
            
            // --- SPEED MODE LOGIC ---
            // Flashcards need explicit continue, so speed mode applies mostly to quizzes
            if (isSpeedMode && currentQuestion.type !== StudyMode.Flashcards) { 
                setTimeout(handleNextQuestion, 500); // 500ms delay as requested
            }
        } else {
            playErrorSound();
            setFeedback('incorrect');
            setItemStates(prev => ({ ...prev, [currentQuestion.rowId]: SessionItemState.Fail }));
            setActiveQueue(prev => {
                const newQueue = [...prev];
                const incorrectQuestion = newQueue.shift();
                if (incorrectQuestion) {
                    const reinsertPosition = Math.min(reinsertIndex, newQueue.length);
                    newQueue.splice(reinsertPosition, 0, incorrectQuestion);
                }
                return newQueue;
            });
            setShake(true);
            setTimeout(() => setShake(false), 300);
        }
    }, [isAnswered, currentQuestion, itemStates, isSpeedMode, hint.text, handleNextQuestion, v3Card, reinsertIndex]);

    const handleQuit = () => {
        const durationSeconds = Math.round((Date.now() - session!.startTime) / 1000);
        handleSessionQuit(sessionResults, durationSeconds, activeQueue);
    };

    const getHint = async () => {
        if (!currentQuestion) return;
        setHint({ text: '', isLoading: true });
        try {
            const hintText = await generateHint(currentQuestion.correctAnswer, currentQuestion.questionText);
            setHint({ text: hintText, isLoading: false });
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") { setIsApiKeyModalOpen(true); } 
            else { showToast("Could not generate hint.", "error"); }
            setHint({ text: '', isLoading: false });
        }
    };
    
    const handleUpdateRowInModal = async (updatedRow: VocabRow): Promise<boolean> => {
        if (!table) return false;
        const success = await upsertRow(table.id, updatedRow);
        if (success) {
            setRowForDetailModal(null);
        }
        return success;
    };

    const handleUpdateTagIds = React.useCallback((newTagIds: string[]) => {
        if (!row || !table) return;
        const updatedRow = { ...row, tagIds: newTagIds };
        upsertRow(table.id, updatedRow);
    }, [row, table, upsertRow]);

    // Handle Relation Update from Magic Wand
    const handleRelationUpdate = async (newRelation: Relation) => {
        if (!table) return;
        
        const updatedRelations = table.relations.map(r => r.id === newRelation.id ? newRelation : r);
        
        // This updates the store, which will propagate down to `relation` via `useTableStore`
        const success = await updateTable({ ...table, relations: updatedRelations });
        
        if (success) {
            showToast("Theme updated successfully!", "success");
        } else {
             showToast("Failed to update theme.", "error");
        }
    };

    if (!session || !currentQuestion || !table || !relation || !row) {
        return <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex items-center justify-center"><Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin"/></div>;
    }
    
    // Apply layout logic based on card type to prevent double centering
    const containerClass = v3Card?.type === 'flashcard' 
        ? 'w-full h-full flex flex-col items-center justify-center' // Allow child to handle width
        : `flex-1 flex flex-col items-center justify-center w-full ${shake ? 'animate-shake' : ''}`;

    return (
        <div className="fixed inset-0 bg-background dark:bg-secondary-900 flex flex-col items-center p-2 sm:p-4 transition-colors duration-300">
            <StudySessionHeader
                onQuit={() => setIsQuitting(true)}
                userLevel={userStats.level}
                userXp={userStats.xp}
                sessionXp={sessionXp}
                masteredCount={masteredCount}
                totalCount={originalQuestions.length}
                elapsedSeconds={elapsedSeconds}
                isSpeedMode={isSpeedMode}
                onToggleSpeedMode={() => setIsSpeedMode(s => !s)}
                isImmersive={isImmersive}
                onToggleImmersiveMode={toggleImmersiveMode}
            />
            <TopTracker
                questions={trackerQuestions}
                itemStates={itemStates}
                showWords={showTrackerWords}
                onToggleShowWords={() => setShowTrackerWords(s => !s)}
            />
            
            {/* Added SessionDashboard for real-time metrics */}
            <SessionDashboard
                startTime={session.startTime}
                results={sessionResults}
                itemStates={itemStates}
                totalItems={originalQuestions.length}
            />

            <main className={containerClass}>
                <div className="w-full h-full flex flex-col items-center justify-center">
                    {!isAnswered ? (
                        <>
                            {/* V3 Architecture: Unified Render */}
                            {v3Card && (
                                <UnifiedQuestionCard 
                                    card={v3Card} 
                                    onAnswer={handleCheckAnswer}
                                    design={relation.design?.front}
                                    backDesign={relation.design?.back} // Pass back design for split view
                                    row={row}
                                    table={table}
                                    relation={relation}
                                    onViewInfo={() => setRowForInfoModal(row)}
                                    onEdit={() => setRowForDetailModal(row)}
                                    onRelationUpdate={handleRelationUpdate} // Added handler
                                />
                            )}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center w-full max-w-2xl lg:max-w-4xl p-4">
                            <AnswerFeedbackPanel
                                feedback={feedback!}
                                question={currentQuestion}
                                row={row}
                                relation={relation}
                                table={table}
                                onViewDetails={() => setRowForDetailModal(row)}
                                onNext={handleNextQuestion}
                                onViewCorrectCard={() => setRowForInfoModal(row)}
                            />
                        </div>
                    )}
                </div>
            </main>

            {/* Only show footer hints for non-flashcard modes or standard layout when not answered */}
            {!isAnswered && v3Card?.type !== 'flashcard' && !isImmersive && (
                <footer className="w-full max-w-2xl lg:max-w-4xl flex justify-between items-center mt-4 flex-shrink-0">
                     <div className="flex gap-2">
                        <Popover
                            isOpen={isSettingsOpen}
                            setIsOpen={setIsSettingsOpen}
                            trigger={
                                <Button variant="ghost" title="Session Settings">
                                    <Icon name="cog" className="w-5 h-5"/>
                                </Button>
                            }
                            contentClassName="w-72"
                        >
                            <div className="p-4 space-y-3">
                                <h4 className="text-sm font-semibold">Incorrect Card Review</h4>
                                <p className="text-xs text-text-subtle">How many cards away to re-insert an incorrect card.</p>
                                <div className="flex flex-col gap-2">
                                    <Button variant={reinsertIndex === 0 ? 'primary' : 'secondary'} onClick={() => { setReinsertIndex(0); setIsSettingsOpen(false); }}>Immediately (+0)</Button>
                                    <Button variant={reinsertIndex === 2 ? 'primary' : 'secondary'} onClick={() => { setReinsertIndex(2); setIsSettingsOpen(false); }}>Soon (+2)</Button>
                                    <Button variant={reinsertIndex === 5 ? 'primary' : 'secondary'} onClick={() => { setReinsertIndex(5); setIsSettingsOpen(false); }}>Later (+5)</Button>
                                </div>
                            </div>
                        </Popover>
                        <Button variant="ghost" onClick={getHint} disabled={hint.isLoading || !!hint.text} className="flex items-center gap-2">
                            {hint.isLoading ? <Icon name="spinner" className="w-4 h-4 animate-spin"/> : <Icon name="sparkles" className="w-4 h-4"/>} Hint
                        </Button>
                        <Button variant="ghost" onClick={() => { handleSaveToJournal(`Study Session: ${table.name}`, `*Q: ${currentQuestion.questionText}*\n*A: ${currentQuestion.correctAnswer}*`); setIsJournaled(true); }} disabled={isJournaled} className="flex items-center gap-2">
                            <Icon name="book" className="w-4 h-4"/> {isJournaled ? 'Saved' : 'Save'}
                        </Button>
                         <Popover
                            isOpen={isTagEditorOpen}
                            setIsOpen={setIsTagEditorOpen}
                            trigger={
                                <Button variant="ghost" title="Add/Edit Tags">
                                    <Icon name="tag" className="w-5 h-5"/>
                                </Button>
                            }
                            contentClassName="w-72"
                        >
                            <RowTagEditor
                                tagIds={row.tagIds || []}
                                onUpdateTagIds={handleUpdateTagIds}
                            />
                        </Popover>
                        <ContextViewer links={contextLinks} />
                    </div>
                    {hint.text && <p className="text-xs text-text-subtle text-right max-w-xs truncate" title={hint.text}>{hint.text}</p>}
                </footer>
            )}
            
             <ConfirmationModal isOpen={isQuitting} onClose={() => setIsQuitting(false)} onConfirm={handleQuit} title="Quit Session?" message="Are you sure you want to end this session early? Your progress will be saved." confirmText="Quit Session" />
             <WordInfoModal
                isOpen={!!rowForInfoModal}
                row={rowForInfoModal}
                table={table}
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
                table={table}
                columns={table.columns}
                aiPrompts={table.aiPrompts}
                imageConfig={table.imageConfig}
                audioConfig={table.audioConfig}
                onClose={() => setRowForDetailModal(null)}
                onSave={handleUpdateRowInModal}
                onDelete={() => { }}
                onConfigureAI={() => { }}
            />
            <FocusTimer displaySeconds={elapsedSeconds} />
        </div>
    );
};

export default StudySessionScreen;
