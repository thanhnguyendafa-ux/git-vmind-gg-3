
import React from 'react';
import Icon from '../../../../components/ui/Icon';
import { ThemeButtonStyle } from '../../../../features/tables/designConstants';

interface TrueFalseLayoutProps {
  statement: string;
  onSelect: (answer: boolean) => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
  themeButtonStyle?: ThemeButtonStyle;
  feedback?: 'correct' | 'incorrect' | null;
  correctAnswer?: boolean;
  userAnswer?: boolean;
}

const TrueFalseLayout: React.FC<TrueFalseLayoutProps> = ({ statement, onSelect, isImmersive, isSidebar, themeButtonStyle, feedback, correctAnswer, userAnswer }) => {
  const buttonHeight = isImmersive ? "h-24" : "h-20";
  const textClass = isImmersive ? "text-xl" : "text-lg";
  
  // In sidebar mode, stack buttons vertically. Otherwise horizontal.
  const containerFlexClass = isSidebar ? "flex flex-col" : "flex flex-row";

  const getButtonStyle = (isTrueButton: boolean) => {
      let styleClass = '';
      
      // Determine selection state
      const isSelected = userAnswer === isTrueButton;
      const isTargetCorrect = correctAnswer === isTrueButton;

      if (themeButtonStyle) {
          // Base
           styleClass = `${themeButtonStyle.background} ${themeButtonStyle.backdrop || ''} ${themeButtonStyle.border} ${themeButtonStyle.text} ${themeButtonStyle.radius} ${themeButtonStyle.shadow} ${themeButtonStyle.font || ''}`;
           
           if (!feedback) {
               styleClass += ` ${themeButtonStyle.hover} ${themeButtonStyle.active}`;
           }

           // Feedback Overrides
           if (feedback && isSelected) {
               if (isTargetCorrect) {
                   styleClass = `${themeButtonStyle.success} ${themeButtonStyle.radius} ${themeButtonStyle.font || ''}`;
               } else {
                   styleClass = `${themeButtonStyle.error} ${themeButtonStyle.radius} ${themeButtonStyle.font || ''}`;
               }
           }
      } else {
          // Fallback System Colors
          if (isTrueButton) {
               styleClass = "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-300 border-2 border-success-200 dark:border-success-800 hover:bg-success-200 dark:hover:bg-success-900/50 shadow-sm";
          } else {
               styleClass = "bg-error-100 dark:bg-error-900/30 text-error-700 dark:text-error-300 border-2 border-error-200 dark:border-error-800 hover:bg-error-200 dark:hover:bg-error-900/50 shadow-sm";
          }
          
          if (!feedback) {
              styleClass += " active:scale-95 hover:shadow-md";
          }

          if (feedback && isSelected) {
               // Intensify color on selection result
               if (isTrueButton) styleClass = "bg-success-500 text-white border-success-600 shadow-md";
               else styleClass = "bg-error-500 text-white border-error-600 shadow-md";
          }
      }
      
      // Dim unselected buttons during feedback
      if (feedback && !isSelected) {
          styleClass += " opacity-50 cursor-not-allowed";
      }

      return styleClass;
  };

  return (
    <div className="space-y-4 w-full animate-fadeIn">
        <div className={`text-center p-4 rounded-lg border ${themeButtonStyle ? themeButtonStyle.background + ' ' + themeButtonStyle.border + ' ' + themeButtonStyle.text : 'bg-secondary-100 dark:bg-secondary-800/50 border-secondary-200 dark:border-secondary-700 text-text-main dark:text-secondary-100'}`}>
            <p className={`font-semibold ${isImmersive ? 'text-xl' : 'text-lg'}`}>{statement}</p>
        </div>
        <div className={`${containerFlexClass} gap-4 w-full`}>
          <button 
            onClick={() => !feedback && onSelect(false)}
            disabled={!!feedback}
            className={`flex-1 ${buttonHeight} flex flex-col items-center justify-center gap-1 transition-all duration-200 ${getButtonStyle(false)}`}
            aria-label="False"
          >
            <Icon name="x" className="w-6 h-6" strokeWidth={3} />
            <span className={`font-bold ${textClass}`}>False</span>
          </button>

          <button 
            onClick={() => !feedback && onSelect(true)}
            disabled={!!feedback}
            className={`flex-1 ${buttonHeight} flex flex-col items-center justify-center gap-1 transition-all duration-200 ${getButtonStyle(true)}`}
            aria-label="True"
          >
            <Icon name="check" className="w-6 h-6" strokeWidth={3} />
            <span className={`font-bold ${textClass}`}>True</span>
          </button>
        </div>
    </div>
  );
};

export default TrueFalseLayout;
