
import React, { useState, useEffect } from 'react';
import { Button } from '../../../../components/ui/Button';

interface ScrambleLayoutProps {
  segments: string[];
  onAnswer: (answer: string) => void;
}

const ScrambleLayout: React.FC<ScrambleLayoutProps> = ({ segments, onAnswer }) => {
  const [answerParts, setAnswerParts] = useState<string[]>([]);
  const [bankParts, setBankParts] = useState<string[]>([]);

  // Initialize bank parts on mount or when segments change
  useEffect(() => {
    setBankParts([...segments]);
    setAnswerParts([]);
  }, [segments]);

  const moveFromBank = (part: string, index: number) => {
    setAnswerParts(prev => [...prev, part]);
    setBankParts(prev => prev.filter((_, i) => i !== index));
  };

  const moveFromAnswer = (part: string, index: number) => {
    setBankParts(prev => [...prev, part]);
    setAnswerParts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (answerParts.length > 0) {
      onAnswer(answerParts.join(' '));
    }
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn">
      {/* Answer Area */}
      <div className="min-h-[5rem] bg-surface dark:bg-secondary-800 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center border-2 border-dashed border-secondary-300 dark:border-secondary-600 transition-colors">
        {answerParts.length === 0 && (
            <span className="text-text-subtle opacity-50 select-none">Tap words below to build answer</span>
        )}
        {answerParts.map((part, index) => (
          <button 
            key={`${part}-${index}`} 
            onClick={() => moveFromAnswer(part, index)} 
            className="bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 px-3 py-1.5 rounded-lg text-base font-medium shadow-sm hover:-translate-y-0.5 transition-transform"
          >
            {part}
          </button>
        ))}
      </div>

      {/* Word Bank */}
      <div className="min-h-[5rem] p-2 flex flex-wrap gap-2 items-center justify-center">
        {bankParts.map((part, index) => (
          <button 
            key={`${part}-${index}`} 
            onClick={() => moveFromBank(part, index)} 
            className="bg-white dark:bg-secondary-700 text-text-main dark:text-secondary-200 border border-secondary-200 dark:border-secondary-600 px-3 py-1.5 rounded-lg text-base shadow-sm hover:bg-secondary-50 dark:hover:bg-secondary-600 transition-colors"
          >
            {part}
          </button>
        ))}
      </div>

      <Button onClick={handleSubmit} disabled={answerParts.length === 0} className="w-full h-12 text-lg shadow-md">
        Check
      </Button>
    </div>
  );
};

export default ScrambleLayout;
