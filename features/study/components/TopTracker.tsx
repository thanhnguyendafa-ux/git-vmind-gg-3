import React from 'react';
import { Question, SessionItemState } from '../../../types';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

interface TopTrackerProps {
    questions: Question[];
    itemStates: Record<string, SessionItemState>;
    showWords: boolean;
    onToggleShowWords: () => void;
}

const getStateStyle = (state: SessionItemState): { color: string; label: string } => {
  switch (state) {
    case SessionItemState.Fail:
      return { color: 'bg-error-500', label: 'Incorrect' }; // Red
    case SessionItemState.Pass1:
      return { color: 'bg-warning-500', label: 'Correct (1/2)' }; // Yellow
    case SessionItemState.Pass2:
      return { color: 'bg-success-500', label: 'Mastered' }; // Green
    case SessionItemState.Unseen:
    default:
      return { color: 'bg-secondary-300 dark:bg-secondary-600', label: 'Unseen' }; // Gray
  }
};


const TopTracker: React.FC<TopTrackerProps> = ({ questions, itemStates, showWords, onToggleShowWords }) => {
    return (
        <div className="w-full max-w-4xl lg:max-w-7xl mx-auto px-4 mb-4">
            <div className="flex justify-end mb-2 h-9 items-center">
                <Button variant="ghost" size="sm" onClick={onToggleShowWords}>
                    {showWords ? 'Hide Words' : 'Show Words'}
                </Button>
            </div>
            <div className="flex items-end gap-1.5" style={{ minHeight: showWords ? '2.5rem' : '0.5rem' }}>
                {questions.map((q, index) => {
                    const state = itemStates[q.rowId] || SessionItemState.Unseen;
                    const { color: barColor, label: stateLabel } = getStateStyle(state);
                    const title = `${q.questionText}: ${stateLabel}`;

                    return (
                        <div key={`${q.rowId}-${index}`} className="relative flex-1 transition-all duration-300" title={title}>
                            {showWords && (
                                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-max max-w-[150px] animate-fade-in-up" style={{ animationDelay: `${index * 20}ms`}}>
                                    <span className="block px-2 py-1 bg-secondary-800 text-white text-[10px] rounded-md truncate shadow-lg">
                                        {q.questionText}
                                    </span>
                                </div>
                            )}
                            <div className={`h-2 rounded-full transition-colors duration-500 ${barColor}`} />
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default TopTracker;
