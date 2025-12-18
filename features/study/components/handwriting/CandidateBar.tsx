
import React from 'react';
import Icon from '../../../../components/ui/Icon';

interface CandidateBarProps {
  candidates: string[];
  onSelect: (char: string) => void;
  isLoading: boolean;
}

const CandidateBar: React.FC<CandidateBarProps> = ({ candidates, onSelect, isLoading }) => {
  // Desktop: Fixed height matching canvas (220px)
  // Mobile: Auto height but with min-height to reduce shift, or use the grid to structure it.
  
  const containerClasses = `
    w-full lg:w-32 lg:h-[220px] 
    bg-secondary-100/50 dark:bg-secondary-800/50 
    rounded-lg border border-secondary-200 dark:border-secondary-700 
    p-2 
    overflow-y-auto custom-scrollbar
    transition-all duration-300
  `;

  const gridClasses = `
    grid grid-cols-5 lg:grid-cols-2 gap-2
  `;

  if (candidates.length === 0 && !isLoading) {
      // Render an empty placeholder to maintain layout stability on Desktop
      return (
        <div className={`${containerClasses} hidden lg:flex items-center justify-center text-text-subtle opacity-30`}>
            <span className="text-xs text-center">Suggestions</span>
        </div>
      );
  }

  return (
    <div className={containerClasses}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-text-subtle animate-pulse py-4 lg:py-0">
           <Icon name="sparkles" className="w-5 h-5" />
           <span className="text-xs">Reading...</span>
        </div>
      ) : (
        <div className={gridClasses}>
            {candidates.map((char, index) => (
            <button
                key={`${char}-${index}`}
                onClick={() => onSelect(char)}
                className="
                    aspect-square flex items-center justify-center 
                    bg-surface dark:bg-secondary-700 
                    rounded-md shadow-sm border border-secondary-200 dark:border-secondary-600 
                    text-lg font-serif 
                    hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400
                    transition-all active:scale-95
                "
            >
                {char}
            </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default CandidateBar;
