
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../../../components/ui/Button';
import Icon from '../../../../components/ui/Icon';
import HandwritingInputPanel from '../handwriting/HandwritingInputPanel';
import { useCJKDetection } from '../../hooks/useCJKDetection';

interface TypingLayoutProps {
  hint?: string;
  onSubmit: (value: string) => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
  correctAnswerContext?: string; 
}

const TypingLayout: React.FC<TypingLayoutProps> = ({ hint, onSubmit, isImmersive, isSidebar, correctAnswerContext }) => {
  const [input, setInput] = useState('');
  const [isHandwritingMode, setIsHandwritingMode] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Detect if we should offer handwriting
  const hasCJK = useCJKDetection(correctAnswerContext);

  useEffect(() => {
    if (!isHandwritingMode) {
        inputRef.current?.focus();
    }
  }, [isHandwritingMode]);

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

  const handleCharacterSelect = (char: string) => {
      setInput(prev => prev + char);
      setIsHandwritingMode(false);
  };

  // Adjust rows: In sidebar, more rows are better for visibility since width is constrained
  const textareaRows = isImmersive ? 4 : (isSidebar ? 6 : 2);
  const textareaClasses = `w-full bg-surface dark:bg-secondary-800 border-2 border-secondary-300 dark:border-secondary-600 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm placeholder:text-secondary-400 ${isImmersive ? 'text-xl' : 'text-lg'}`;

  return (
    <div className="flex flex-col w-full h-full animate-fadeIn gap-6">
      {/* Compact Header / Toolbar */}
      <div className="flex justify-between items-center bg-secondary-50 dark:bg-secondary-900/50 p-1.5 rounded-lg border border-secondary-200 dark:border-secondary-700/50">
          <div className="flex-1 min-w-0 px-2">
            {hint ? (
                <div className="text-xs text-text-subtle truncate">
                    <span className="font-bold opacity-70 mr-1">Hint:</span>
                    <span className="italic">{hint}</span>
                </div>
            ) : <span className="text-xs text-text-subtle italic opacity-50">Type answer</span>}
          </div>

          {hasCJK && (
              <button 
                type="button"
                onClick={() => setIsHandwritingMode(!isHandwritingMode)}
                className={`p-1.5 px-3 rounded-md border transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm ${isHandwritingMode ? 'bg-primary-100 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-white dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-text-subtle hover:text-text-main'}`}
                title={isHandwritingMode ? "Switch to Keyboard" : "Switch to Handwriting"}
              >
                  <Icon name={isHandwritingMode ? "keyboard" : "pencil"} className="w-3.5 h-3.5" />
                  <span>{isHandwritingMode ? "Keyboard" : "Write"}</span>
              </button>
          )}
      </div>

      <div className="flex-1 flex flex-col justify-center min-h-0">
        {isHandwritingMode ? (
            <div className="flex flex-col items-center gap-4 w-full">
                <div 
                    className={`${textareaClasses} min-h-[3rem] flex items-center bg-white dark:bg-secondary-800 cursor-text border-primary-500/50`}
                    onClick={() => setIsHandwritingMode(false)}
                    title="Click to use keyboard"
                >
                    {input || <span className="opacity-40 italic text-base">Written text appears here...</span>}
                    <span className="w-0.5 h-5 bg-primary-500 animate-pulse ml-1 inline-block"></span>
                </div>
                
                <div className="w-full flex justify-center mx-auto">
                    <HandwritingInputPanel 
                        onSelectCharacter={handleCharacterSelect} 
                        expectedAnswer={correctAnswerContext}
                        isSidebar={isSidebar} // Pass this down to resize canvas
                    />
                </div>
            </div>
        ) : (
            <form onSubmit={handleSubmit} className="w-full">
                <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your answer here..."
                    rows={textareaRows}
                    className={textareaClasses}
                />
            </form>
        )}
      </div>

      <Button onClick={() => input.trim() && onSubmit(input)} disabled={!input.trim()} className="w-full h-11 text-base shadow-md mt-auto">
        Check Answer
      </Button>
    </div>
  );
};

export default TypingLayout;
