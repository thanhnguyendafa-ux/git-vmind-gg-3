
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../components/ui/Button';

interface TypingLayoutProps {
  hint?: string;
  onSubmit: (value: string) => void;
}

const TypingLayout: React.FC<TypingLayoutProps> = ({ hint, onSubmit }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full animate-fadeIn">
      {hint && (
        <div className="text-center text-sm text-text-subtle bg-secondary-100 dark:bg-secondary-800/50 py-2 px-3 rounded-lg inline-block mx-auto w-full">
            <span className="font-bold opacity-70">Hint: </span>
            <span className="italic">{hint}</span>
        </div>
      )}
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type your answer here..."
        rows={2}
        className="w-full bg-surface dark:bg-secondary-800 border-2 border-secondary-300 dark:border-secondary-600 rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm placeholder:text-secondary-400"
      />
      <Button type="submit" disabled={!input.trim()} className="w-full h-12 text-lg shadow-md">
        Check Answer
      </Button>
    </form>
  );
};

export default TypingLayout;
