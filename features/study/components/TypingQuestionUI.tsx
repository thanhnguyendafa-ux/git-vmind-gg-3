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
        // Auto-focus the input when the component mounts or question changes
        inputRef.current?.focus();
    }, []);

    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-3">
            <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                rows={2}
                className="w-full bg-secondary-100 dark:bg-secondary-700 border-2 border-secondary-300 dark:border-secondary-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            />
            <Button type="submit" disabled={!userInput.trim()} className="w-full">
                Check
            </Button>
        </form>
    );
};

export default TypingQuestionUI;
