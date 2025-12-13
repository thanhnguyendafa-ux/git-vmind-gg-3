import React, { useEffect, useRef } from 'react';
import { Question } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface ClozeTypingQuestionUIProps {
    userInput: string;
    setUserInput: (value: string) => void;
    onSubmit: () => void;
    question: Question;
}

const ClozeTypingQuestionUI: React.FC<ClozeTypingQuestionUIProps> = ({ userInput, setUserInput, onSubmit, question }) => {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, [question]);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
            <div className="p-4 rounded-lg bg-secondary-100 dark:bg-secondary-700/50 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-lg leading-relaxed">
                <span className="text-text-main dark:text-secondary-200">{question.contextBefore}</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    className="inline-block h-10 px-2 rounded-md border-2 border-dashed border-secondary-400 dark:border-secondary-500 bg-transparent text-center font-semibold text-primary-600 dark:text-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    style={{ width: `${Math.max(100, (question.correctAnswer?.length || 10) * 12)}px` }}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                />
                <span className="text-text-main dark:text-secondary-200">{question.contextAfter}</span>
            </div>
            {question.clozeHint && (
                <p className="text-center text-sm text-text-subtle italic">{question.clozeHint}</p>
            )}
            <Button type="submit" disabled={!userInput.trim()} className="w-full">
                Check
            </Button>
        </form>
    );
};

export default ClozeTypingQuestionUI;
