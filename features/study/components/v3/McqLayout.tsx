
import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { playSpeech, stopSpeech } from '../../../../services/audioService';
import { ThemeButtonStyle } from '../../../../features/tables/designConstants';

interface McqLayoutProps {
  options: string[];
  onSelect: (option: string) => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
  themeButtonStyle?: ThemeButtonStyle;
  feedback?: 'correct' | 'incorrect' | null;
  correctAnswers?: string[];
  userAnswer?: string;
}

const McqLayout: React.FC<McqLayoutProps> = ({ options, onSelect, isImmersive, isSidebar, themeButtonStyle, feedback, correctAnswers, userAnswer }) => {
  // Mobile: Single column for readability & touch targets.
  // Tablet/Desktop: 2 columns if space permits.
  // Sidebar: Single column forced.
  const gridClasses = isSidebar
    ? "grid grid-cols-1 gap-3 w-full animate-fadeIn"
    : "grid grid-cols-1 sm:grid-cols-2 gap-3 w-full animate-fadeIn";

  const buttonSizeClasses = isImmersive ? "py-4 text-lg" : "py-3 text-sm sm:text-base";

  return (
    <div className={gridClasses}>
      {options.map((option, index) => {
        const isSelected = userAnswer === option;
        const isCorrect = correctAnswers?.includes(option);
        
        let customClass = '';
        
        if (themeButtonStyle) {
            // Base Theme Style
            customClass = `${themeButtonStyle.background} ${themeButtonStyle.backdrop || ''} ${themeButtonStyle.border} ${themeButtonStyle.text} ${themeButtonStyle.radius} ${themeButtonStyle.shadow} ${themeButtonStyle.font || ''}`;
            
            // Interaction State (Only apply hover if not answered)
            if (!feedback) {
                customClass += ` ${themeButtonStyle.hover} ${themeButtonStyle.active}`;
            }

            // Feedback State overrides
            if (feedback && isSelected) {
                if (isCorrect) {
                     customClass = `${themeButtonStyle.success} ${themeButtonStyle.radius} ${themeButtonStyle.font || ''}`;
                } else {
                     customClass = `${themeButtonStyle.error} ${themeButtonStyle.radius} ${themeButtonStyle.font || ''}`;
                }
            } else if (feedback && isCorrect) {
                 // Highlight correct answer if user missed it
                 customClass = `${themeButtonStyle.success} ${themeButtonStyle.radius} ${themeButtonStyle.font || ''} ring-2 ring-offset-2 ring-green-500`;
            }
        } else {
             // Fallback Default Style
             customClass = "bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-text-main dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-700 active:scale-[0.98] shadow-sm";
             
             if (feedback && isSelected) {
                 customClass = isCorrect 
                    ? "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200 border-success-500" 
                    : "bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-200 border-error-500";
             } else if (feedback && isCorrect) {
                 customClass = "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200 border-success-500 ring-2 ring-offset-1 ring-success-400";
             }
        }

        return (
            <button 
            key={index} 
            onClick={() => !feedback && onSelect(option)}
            onMouseEnter={() => {
                if (!feedback) {
                    stopSpeech();
                    playSpeech(option);
                }
            }}
            disabled={!!feedback}
            className={`
                h-auto min-h-[3.5rem] flex items-center text-left whitespace-normal px-4 transition-all duration-200 
                ${buttonSizeClasses} ${customClass}
            `}
            >
            <span className="font-bold mr-3 opacity-50 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-black/10 dark:bg-white/10 text-xs">
                {String.fromCharCode(65 + index)}
            </span>
            <span className="leading-snug flex-1">{option}</span>
            </button>
        );
      })}
    </div>
  );
};

export default McqLayout;
