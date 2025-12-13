import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { StudySessionData, Question, StudyMode, SessionWordResult, SessionItemState, VocabRow, Table, Relation } from '../../../types';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useTableStore } from '../../../stores/useTableStore';
import { generateHint } from '../../../services/geminiService';
import { playSuccessSound, playErrorSound } from '../../../services/soundService';

const XP_PER_CORRECT_ANSWER = 10;
const REINSERT_INDEX = 2;

export const useStudySessionManager = (session: StudySessionData, isSpeedMode: boolean) => {
    const handleEndSession = useSessionStore(state => state.handleEndSession);
    const showToast = useUIStore(state => state.showToast);
    const setIsApiKeyModalOpen = useUIStore(state => state.setIsApiKeyModalOpen);

    const originalQuestions = React.useMemo(() => session?.questions || [], [session]);
    const [activeQueue, setActiveQueue] = React.useState<Question[]>(() => originalQuestions.slice(session?.startIndex || 0));
    const [masteredRows, setMasteredRows] = React.useState<Set<string>>(new Set());
    const [itemStates, setItemStates] = React.useState<Record<string, SessionItemState>>(() =>
        Object.fromEntries(originalQuestions.map(q => [q.rowId, SessionItemState.Unseen]))
    );
    const [userInput, setUserInput] = React.useState('');
    const [feedback, setFeedback] = React.useState<'correct' | 'incorrect' | null>(null);
    const [sessionResults, setSessionResults] = React.useState<SessionWordResult[]>([]);
    const [hint, setHint] = React.useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
    const [sessionXp, setSessionXp] = React.useState(0);
    const [shake, setShake] = React.useState(false);
    const [isJournaled, setIsJournaled] = React.useState(false);

    const currentQuestion = activeQueue[0];
    const masteredCount = masteredRows.size;
    const isAnswered = feedback !== null;

    const { table, relation, row } = useTableStore(useShallow(state => {
        if (!currentQuestion) return { table: null, relation: null, row: null };
        const t = state.tables.find(t => t.id === currentQuestion.tableId);
        if (!t) return { table: null, relation: null, row: null };
        const r = t.relations.find(rel => rel.id === currentQuestion.relationId) || null;
        const w = t.rows.find(row => row.id === currentQuestion.rowId) || null;
        return { table: t, relation: r, row: w };
    }));

    const trackerQuestions = React.useMemo(() => {
        const masteredQuestions = originalQuestions.filter(q =>
            masteredRows.has(q.rowId) && !activeQueue.some(aq => aq.rowId === q.rowId)
        );
        return [...activeQueue, ...masteredQuestions];
    }, [originalQuestions, masteredRows, activeQueue]);

    React.useEffect(() => {
        if (activeQueue.length === 0 && originalQuestions.length > 0 && session) {
            const durationSeconds = Math.round((Date.now() - session.startTime) / 1000);
            handleEndSession(sessionResults, durationSeconds);
        }
    }, [activeQueue, originalQuestions, session, sessionResults, handleEndSession]);

    const handleNextQuestion = React.useCallback(() => {
        setFeedback(null);
        setHint({ text: '', isLoading: false });
        setIsJournaled(false);
        setUserInput('');
    }, []);

    const handleCheckAnswer = React.useCallback((answer: string) => {
        if (isAnswered || !currentQuestion) return;

        const normalize = (ans: string) => ans.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        const isCorrect = currentQuestion.type === StudyMode.TrueFalse
            ? answer === currentQuestion.correctAnswer
            : normalize(answer) === normalize(currentQuestion.correctAnswer);

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
            if (isSpeedMode) { setTimeout(handleNextQuestion, 1200); }
        } else {
            playErrorSound();
            setFeedback('incorrect');
            setItemStates(prev => ({ ...prev, [currentQuestion.rowId]: SessionItemState.Fail }));
            setActiveQueue(prev => {
                const newQueue = [...prev];
                const incorrectQuestion = newQueue.shift();
                if (incorrectQuestion) {
                    const reinsertPosition = Math.min(REINSERT_INDEX, newQueue.length);
                    newQueue.splice(reinsertPosition, 0, incorrectQuestion);
                }
                return newQueue;
            });
            setShake(true);
            setTimeout(() => setShake(false), 300);
        }
    }, [isAnswered, currentQuestion, itemStates, isSpeedMode, hint.text, handleNextQuestion]);

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
    
    // Reset journal status for new questions
    React.useEffect(() => {
        setIsJournaled(false);
    }, [currentQuestion]);

    return {
        // State
        activeQueue,
        masteredRows,
        itemStates,
        currentQuestion,
        masteredCount,
        table,
        relation,
        row,
        userInput,
        feedback,
        sessionResults,
        hint,
        isJournaled,
        sessionXp,
        shake,
        trackerQuestions,
        originalQuestions,
        isAnswered,
        
        // Actions
        setUserInput,
        setIsJournaled,
        handleNextQuestion,
        handleCheckAnswer,
        getHint
    };
};
