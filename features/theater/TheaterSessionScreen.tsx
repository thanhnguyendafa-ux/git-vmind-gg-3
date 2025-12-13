
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUserStore } from '../../stores/useUserStore';
import { Table, Relation, StudyMode, Screen, VocabRow, CardFaceDesign, TypographyDesign, TheaterSessionData } from '../../types';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../../components/ui/Button';
import ExpandableText from '../../components/ui/ExpandableText';
import { DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY } from '../tables/designConstants';
import { useNoteStore } from '../../stores/useNoteStore';
import FocusTimer from '../common/FocusTimer';

type AnimationStep = 'in' | 'front' | 'flip' | 'back' | 'out';

// A unified type for any element that can be revealed on a card face.
interface RevealedElement {
    key: string;
    type: 'columnName' | 'columnData' | 'textBox';
    text: string;
    typography: TypographyDesign;
}

const SessionSummary: React.FC<{
    flaggedRowIds: Set<string>;
    session: TheaterSessionData;
    onFinish: () => void;
}> = ({ flaggedRowIds, session, onFinish }) => {
    // Optimization: Only fetch tables relevant to the session to display summary
    const sourceTableIds = useMemo(() => session.settings.sources.map(s => s.tableId), [session.settings.sources]);
    const tables = useTableStore(useShallow(state => 
        state.tables.filter(t => sourceTableIds.includes(t.id))
    ));

    const { setStudySetupOverrides, handleStartTemporaryFlashcardSession } = useSessionStore();
    const { setCurrentScreen } = useUIStore();

    const flaggedWordsData = useMemo(() => {
        const data: { rowId: string; word: string; definition: string }[] = [];
        const rowIds = [...flaggedRowIds];
        
        for (const rowId of rowIds) {
            for (const table of tables) {
                const currentRow: VocabRow | undefined = table.rows.find(r => r.id === rowId);
                if (currentRow) {
                    const source = session.settings.sources.find(s => s.tableId === table.id);
                    if (source) {
                        const relation: Relation | undefined = table.relations.find(r => r.id === source.relationId);
                        if (relation) {
                            const word = relation.questionColumnIds.map((id: string) => currentRow.cols[id] || '').join(' / ');
                            const definition = relation.answerColumnIds.map((id: string) => currentRow.cols[id] || '').join(' / ');
                            data.push({ rowId, word, definition });
                            break; 
                        }
                    }
                }
            }
        }
        return data;
    }, [flaggedRowIds, tables, session.settings.sources]);

    const handleReviewQuiz = () => {
        const uniqueTableIds = new Set(session.settings.sources.map(s => s.tableId));
        const relationsForQuiz = tables
            .filter(t => uniqueTableIds.has(t.id))
            .reduce((acc, t) => {
                const relationsWithTableId = (t.relations || []).map(r => ({ ...r, tableId: t.id }));
                return acc.concat(relationsWithTableId);
            }, [] as (Relation & { tableId: string })[]);
        const quizCompatibleModes = [StudyMode.MultipleChoice, StudyMode.Typing, StudyMode.TrueFalse];

        setStudySetupOverrides({
            sources: relationsForQuiz.map(r => ({ tableId: r.tableId, relationId: r.id })),
            modes: quizCompatibleModes,
            wordSelectionMode: 'manual',
            manualWordIds: Array.from(flaggedRowIds),
        });
        setCurrentScreen(Screen.StudySetup);
        onFinish();
    };

    const handleReviewFlashcards = () => {
        const tableIds = Array.from(new Set<string>(session.settings.sources.map(s => s.tableId)));
        const relationIds = Array.from(new Set<string>(session.settings.sources.map(s => s.relationId)));
        handleStartTemporaryFlashcardSession({
            rowIds: Array.from(flaggedRowIds),
            tableIds,
            relationIds,
        });
        onFinish();
    };

    if (flaggedWordsData.length === 0) {
        return (
            <div className="text-center">
                <Icon name="check-circle" className="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                <p className="text-text-subtle mb-6">You didn't flag any words for review.</p>
                <Button onClick={onFinish} size="lg">Finish</Button>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Review Flagged Words</h2>
            <div className="bg-secondary-800 rounded-lg p-4 max-h-60 overflow-y-auto mb-6 border border-secondary-700">
                <ul className="divide-y divide-secondary-700">
                    {flaggedWordsData.map(({ rowId, word, definition }) => (
                        <li key={rowId} className="py-2">
                            <p className="font-semibold text-secondary-100">{word}</p>
                            <p className="text-sm text-secondary-400 truncate">{definition}</p>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button onClick={handleReviewFlashcards} variant="secondary" size="lg">
                    <Icon name="flashcards" className="w-5 h-5 mr-2" /> Review with Flashcards
                </Button>
                 <Button onClick={handleReviewQuiz} variant="secondary" size="lg">
                    <Icon name="puzzle-piece" className="w-5 h-5 mr-2" /> Review with Quiz
                </Button>
                <Button onClick={onFinish} size="lg">Finish</Button>
            </div>
        </div>
    );
};

const getCardStyle = (theme: string, design?: CardFaceDesign): React.CSSProperties => {
    if (!design) return { background: theme === 'dark' ? '#1f2937' : '#ffffff' };
    
    let background = design.backgroundValue;
    if (design.backgroundType === 'gradient' && design.backgroundValue.includes(',')) {
        const [color1, color2] = design.backgroundValue.split(',');
        background = `linear-gradient(${design.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
    } else if (design.backgroundType === 'image') {
        background = `url("${design.backgroundValue}") center/cover no-repeat, #f0f0f0`;
    }
    return { background };
};

const CardFace: React.FC<{
    elements: RevealedElement[];
    revealedCount: number;
}> = ({ elements, revealedCount }) => {
    return (
        <div className="flex-1 flex flex-col items-center justify-center w-full p-4 space-y-2">
            {elements.map((element, index) => {
                const isRevealed = revealedCount > index;
                const commonClasses = `transition-all duration-500 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;

                return (
                    <div key={element.key} className={`${commonClasses} w-full`}>
                        <ExpandableText text={element.text} typography={element.typography} />
                    </div>
                );
            })}
        </div>
    );
};


const TheaterSessionScreen: React.FC = () => {
    const session = useSessionStore(useShallow(state => state.activeTheaterSession));
    const handleFinishTheaterSession = useSessionStore(state => state.handleFinishTheaterSession);
    
    // Optimization: Use useShallow to filter only relevant tables to prevent re-renders
    const relevantTableIds = useMemo(() => session?.settings.sources.map(s => s.tableId) || [], [session]);
    const tables = useTableStore(useShallow(state => 
        state.tables.filter(t => relevantTableIds.includes(t.id))
    ));
    
    // Optimization: Get action separately
    const updateRowsFromTheaterSession = useTableStore(state => state.updateRowsFromTheaterSession);

    const updateStatsFromSession = useUserStore(state => state.updateStatsFromSession);
    const theme = useUIStore(useShallow(state => state.theme));
    const handleSaveToJournal = useNoteStore(state => state.handleSaveToJournal);
    
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [revealedPartIndex, setRevealedPartIndex] = useState(0); // This now counts from 0 for each new card
    const [animationClass, setAnimationClass] = useState('animate-fadeIn');
    
    const [isPaused, setIsPaused] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [elapsed, setElapsed] = useState(0);
    const [history, setHistory] = useState<{rowId: string, timestamp: number}[]>([]);
    
    const [flaggedRowIds, setFlaggedRowIds] = React.useState<Set<string>>(new Set());
    const [showSummary, setShowSummary] = React.useState(false);

    const timerRef = useRef<number | null>(null);
    const sessionTimerRef = useRef<number | null>(null);
    const controlsTimerRef = useRef<number | null>(null);

    const currentCardData = useMemo(() => {
        if (!session || currentIndex >= session.queue.length) return null;
        const currentRowId = session.queue[currentIndex];
        let currentTable: Table | undefined;
        let currentRow: VocabRow | undefined;
        for (const table of tables) { const row = table.rows.find(r => r.id === currentRowId); if (row) { currentTable = table; currentRow = row; break; } }
        if (!currentTable || !currentRow) return null;
        const source = session.settings.sources.find(s => s.tableId === currentTable!.id);
        if (!source) return null;
        const currentRelation = currentTable.relations.find(r => r.id === source.relationId);
        if (!currentRelation) return null;

        const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

        const getElements = (faceDesign: CardFaceDesign | undefined, columnIds: string[]): RevealedElement[] => {
            const elements: RevealedElement[] = [];
            const elementOrder = faceDesign?.elementOrder || columnIds;

            elementOrder.forEach(id => {
                const column = currentTable!.columns.find(c => c.id === id);
                if (column) {
                    const typography = faceDesign?.typography[id] || defaultTypo;
                    const labelTypo: TypographyDesign = { ...typography, fontSize: '0.8em', color: theme === 'dark' ? '#ffffff80' : '#00000080', fontWeight: 'normal' };
                    const text = String(currentRow!.cols[id] || '');
                    if (text) {
                        elements.push({ key: `${id}-name`, type: 'columnName', text: column.name, typography: labelTypo });
                        elements.push({ key: `${id}-data`, type: 'columnData', text, typography });
                    }
                } else {
                    const textBox = faceDesign?.textBoxes?.find(t => t.id === id);
                    if (textBox) {
                        elements.push({ key: id, type: 'textBox', text: textBox.text, typography: textBox.typography });
                    }
                }
            });
            return elements;
        };
        
        return { 
            table: currentTable, 
            row: currentRow, 
            relation: currentRelation, 
            frontElements: getElements(currentRelation.design?.front, currentRelation.questionColumnIds),
            backElements: getElements(currentRelation.design?.back, currentRelation.answerColumnIds)
        };
    }, [session, currentIndex, tables, theme]);

    const finishSession = useCallback(() => {
        if (!session) return;
        const finalHistory = [...history];
        if (currentCardData && !history.some(h => h.rowId === currentCardData.row.id)) {
            finalHistory.push({ rowId: currentCardData.row.id, timestamp: Date.now() });
        }
        
        const XP_PER_MINUTE_THEATER = 20;
        const duration = Math.round((Date.now() - session.startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const xpGained = minutes * XP_PER_MINUTE_THEATER;
        
        updateRowsFromTheaterSession(finalHistory);
        updateStatsFromSession(duration, xpGained, 0);

        setShowSummary(true);
    }, [session, history, currentCardData, updateRowsFromTheaterSession, updateStatsFromSession]);

    const goToNextCard = useCallback(() => {
        if (!session) return;
        if (currentCardData) {
            setHistory(h => {
                if (h.some(entry => entry.rowId === currentCardData.row.id)) return h;
                return [...h, { rowId: currentCardData.row.id, timestamp: Date.now() }];
            });
        }
        
        setAnimationClass('animate-slide-out-left');

        setTimeout(() => {
            if (currentIndex < session.queue.length - 1) {
                setCurrentIndex(i => i + 1);
            } else {
                finishSession();
            }
        }, 150); // Corresponds to slide-out animation
    }, [session, currentIndex, currentCardData, finishSession]);
    
    // This effect resets the state for a new card
    useEffect(() => {
        setIsFlipped(false);
        setRevealedPartIndex(0);
        setAnimationClass('animate-slide-in-right');
        const cleanup = setTimeout(() => setAnimationClass(''), 500);
        return () => clearTimeout(cleanup);
    }, [currentIndex]);


    // This is the main timer effect that drives the animation
    useEffect(() => {
        if (isPaused || showSummary || !currentCardData || !session) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        const { partDelay, cardInterval } = session.settings;
        const { frontElements, backElements } = currentCardData;

        const totalFrontParts = frontElements.length;
        const totalParts = totalFrontParts + backElements.length;
        
        // Schedule the next action
        timerRef.current = window.setTimeout(() => {
            if (revealedPartIndex < totalParts) {
                setRevealedPartIndex(prev => prev + 1);
            } else {
                // All parts revealed, move to next card
                goToNextCard();
            }
        }, revealedPartIndex === totalParts ? cardInterval : partDelay);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPaused, showSummary, currentCardData, session, revealedPartIndex, goToNextCard]);
    
    // This effect handles the flip at the right time
    useEffect(() => {
        if (!currentCardData) return;
        if (revealedPartIndex > currentCardData.frontElements.length && !isFlipped) {
            setIsFlipped(true);
        }
    }, [revealedPartIndex, isFlipped, currentCardData]);

     useEffect(() => {
        if (!isPaused && session && !showSummary) {
            sessionTimerRef.current = window.setInterval(() => {
                setElapsed(e => {
                    const newElapsed = e + 1;
                    if (session.settings.sessionDuration > 0 && newElapsed >= session.settings.sessionDuration * 60) {
                        if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
                        finishSession();
                    }
                    return newElapsed;
                });
            }, 1000);
        }
        return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }, [isPaused, session, finishSession, showSummary]);
    
    const handleMouseMove = () => { setShowControls(true); if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 3000); };
    useEffect(() => { handleMouseMove(); return () => { if(controlsTimerRef.current) clearTimeout(controlsTimerRef.current) }; }, []);

    const handleToggleFlag = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentCardData) return;
        const rowId = currentCardData.row.id;
        setFlaggedRowIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) {
                newSet.delete(rowId);
            } else {
                newSet.add(rowId);
            }
            return newSet;
        });
    };

    const navigateToIndex = useCallback((index: number) => {
        if (!session || index < 0 || index >= session.queue.length) return;
        if (timerRef.current) clearTimeout(timerRef.current);
        
        setAnimationClass('animate-slide-out-left');
        setTimeout(() => {
            setCurrentIndex(index);
        }, 150);
    }, [session]);

    const handleJournalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentCardData) return;

        const { table, relation, row } = currentCardData;
        const questionText = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
        const answerText = relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
        
        const source = `Theater Mode: ${table.name}`;
        const content = `Q: ${questionText}\nA: ${answerText}`;
        
        handleSaveToJournal(source, content);
    };

    if (!session) return null;
    if (showSummary) {
        return (
            <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-4 animate-fadeIn">
                <SessionSummary
                    flaggedRowIds={flaggedRowIds}
                    session={session}
                    onFinish={() => {
                        handleFinishTheaterSession(session);
                    }}
                />
            </div>
        )
    }
    if (!currentCardData) return <div className="fixed inset-0 bg-black flex items-center justify-center text-white">Loading...</div>;

    const { frontElements, backElements, relation } = currentCardData;
    const progress = (currentIndex / session.queue.length) * 100;
    const time = new Date(elapsed * 1000).toISOString().substr(14, 5);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const newIndex = Math.floor((clickX / rect.width) * session.queue.length);
        navigateToIndex(newIndex);
    };
    
    const isFlagged = flaggedRowIds.has(currentCardData.row.id);

    // REMOVED: max-w-2xl constraints, replaced with w-full to support fluid card
    return (
        <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-4" onMouseMove={handleMouseMove}>
            <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex justify-between items-center text-sm">
                    <span className="truncate max-w-xs">{currentIndex + 1} / {session.queue.length} - {currentCardData.table.name}</span>
                    <span>{time} {session.settings.sessionDuration > 0 && `/ ${String(session.settings.sessionDuration).padStart(2, '0')}:00`}</span>
                </div>
                <div className="flex gap-4">
                    {/* Controls */}
                     <button onClick={() => setIsPaused(!isPaused)} className="hover:text-primary-400 transition-colors" title={isPaused ? "Play" : "Pause"}>
                        <Icon name={isPaused ? 'play' : 'pause'} className="w-6 h-6" />
                    </button>
                     <button onClick={handleToggleFlag} className={`hover:text-warning-400 transition-colors ${isFlagged ? 'text-warning-500' : ''}`} title="Flag for review">
                        <Icon name="flag" variant={isFlagged ? 'filled' : 'outline'} className="w-6 h-6" />
                    </button>
                     <button onClick={handleJournalClick} className="hover:text-primary-400 transition-colors" title="Save to Journal">
                        <Icon name="book" className="w-6 h-6" />
                    </button>
                    <button onClick={() => handleFinishTheaterSession(session)} className="hover:text-error-400 transition-colors" title="Exit">
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Click areas for navigation */}
            <div className="absolute inset-y-0 left-0 w-1/4 z-0 cursor-w-resize opacity-0 hover:opacity-10 bg-gradient-to-r from-white/20 to-transparent transition-opacity" onClick={() => navigateToIndex(currentIndex - 1)} title="Previous"></div>
            <div className="absolute inset-y-0 right-0 w-1/4 z-0 cursor-e-resize opacity-0 hover:opacity-10 bg-gradient-to-l from-white/20 to-transparent transition-opacity" onClick={() => navigateToIndex(currentIndex + 1)} title="Next"></div>

            <div className={`w-full h-full max-w-none relative perspective-1000 ${animationClass}`}>
                 <div className={`card-container w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'flipped' : ''}`}>
                    {/* Front Face */}
                    <div className="card-front absolute w-full h-full rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden backface-hidden" style={getCardStyle(theme, relation.design?.front)}>
                         <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                        <CardFace elements={frontElements} revealedCount={revealedPartIndex} />
                    </div>

                    {/* Back Face */}
                     <div className="card-back absolute w-full h-full rounded-xl shadow-2xl border border-white/10 flex flex-col overflow-hidden backface-hidden rotate-y-180" style={getCardStyle(theme, relation.design?.back)}>
                        <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
                        <CardFace elements={backElements} revealedCount={revealedPartIndex - frontElements.length} />
                    </div>
                 </div>
            </div>
             {/* Progress Bar */}
            <div 
                className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 cursor-pointer group"
                onClick={handleProgressClick}
            >
                <div 
                    className="h-full bg-primary-500 transition-all duration-300 ease-linear relative" 
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm transition-opacity"></div>
                </div>
            </div>
            <FocusTimer displaySeconds={elapsed} />
        </div>
    );
};

export default TheaterSessionScreen;
