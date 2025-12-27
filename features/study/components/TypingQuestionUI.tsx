import React, { useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';

interface TypingQuestionUIProps {
    userInput: string;
    setUserInput: (value: string) => void;
    onSubmit: () => void;
}

const TypingQuestionUI: React.FC<TypingQuestionUIProps> = ({ userInput, setUserInput, onSubmit }) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        // Auto-focus the input
        inputRef.current?.focus();
    }, []);

    // Auto-expand logic
    useEffect(() => {
        const textarea = inputRef.current;
        if (!textarea) return;

        // Reset height to compute correctly
        textarea.style.height = 'auto';
        // Set new height based on scrollHeight, cap at 150px
        const newHeight = Math.min(textarea.scrollHeight, 150);
        textarea.style.height = `${newHeight}px`;
    }, [userInput]);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
            <div className="relative">
                <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type your answer..."
                    rows={1}
                    className="w-full bg-secondary-100 dark:bg-secondary-700 border-2 border-secondary-300 dark:border-secondary-600 rounded-lg px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none overflow-y-auto"
                    style={{ minHeight: '44px' }}
                />
            </div>
            <Button type="submit" disabled={!userInput.trim()} className="w-full h-12 text-base font-bold">
                Check Answer
            </Button>
        </form>
    );
};

export default TypingQuestionUI;
