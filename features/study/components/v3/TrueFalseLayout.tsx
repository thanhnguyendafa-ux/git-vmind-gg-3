
import React from 'react';
import Icon from '../../../../components/ui/Icon';

interface TrueFalseLayoutProps {
  statement: string;
  onSelect: (answer: boolean) => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
}

const TrueFalseLayout: React.FC<TrueFalseLayoutProps> = ({ statement, onSelect, isImmersive, isSidebar }) => {
  const buttonHeight = isImmersive ? "h-24" : "h-20";
  const textClass = isImmersive ? "text-xl" : "text-lg";
  
  // In sidebar mode, stack buttons vertically. Otherwise horizontal.
  const containerFlexClass = isSidebar ? "flex flex-col" : "flex flex-row";

  return (
    <div className="space-y-4 w-full animate-fadeIn">
        <div className="text-center p-4 rounded-lg bg-secondary-100 dark:bg-secondary-800/50">
            <p className={`font-semibold text-text-main dark:text-secondary-100 ${isImmersive ? 'text-xl' : 'text-lg'}`}>{statement}</p>
        </div>
        <div className={`${containerFlexClass} gap-4 w-full`}>
          <button 
            onClick={() => onSelect(false)}
            className={`flex-1 ${buttonHeight} flex flex-col items-center justify-center gap-1 rounded-xl bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300 font-bold ${textClass} shadow-sm hover:shadow-md border-2 border-error-200 dark:border-error-800 active:scale-95 transition-all duration-200 hover:bg-error-200 dark:hover:bg-error-900/50`}
            aria-label="False"
          >
            <Icon name="x" className="w-6 h-6" strokeWidth={3} />
            <span>False</span>
          </button>

          <button 
            onClick={() => onSelect(true)}
            className={`flex-1 ${buttonHeight} flex flex-col items-center justify-center gap-1 rounded-xl bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 font-bold ${textClass} shadow-sm hover:shadow-md border-2 border-success-200 dark:border-success-800 active:scale-95 transition-all duration-200 hover:bg-success-200 dark:hover:bg-success-900/50`}
            aria-label="True"
          >
            <Icon name="check" className="w-6 h-6" strokeWidth={3} />
            <span>True</span>
          </button>
        </div>
    </div>
  );
};

export default TrueFalseLayout;
