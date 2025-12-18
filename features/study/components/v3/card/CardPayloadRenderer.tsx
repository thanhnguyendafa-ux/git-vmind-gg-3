
import React from 'react';
import { QuestionCard, McqPayload, TrueFalsePayload, TypingPayload, ScramblePayload, FlashcardPayload, StrokePayload } from '../../../../../types';
import McqLayout from '../McqLayout';
import TrueFalseLayout from '../TrueFalseLayout';
import TypingLayout from '../TypingLayout';
import ScrambleLayout from '../ScrambleLayout';
import StrokeLayout from '../StrokeLayout';
import { Button } from '../../../../../components/ui/Button';
import Icon from '../../../../../components/ui/Icon';
import { ThemeButtonStyle } from '../../../../tables/designConstants';

interface CardPayloadRendererProps {
  card: QuestionCard;
  onAnswer: (answer: any) => void;
  isDesignMode?: boolean;
  isImmersive?: boolean;
  isSidebar?: boolean;
  isRevealed?: boolean;
  onReveal?: () => void;
  onEdit?: () => void;
  onViewInfo?: () => void; // Added prop
  hideFlashcardButtons?: boolean;
  themeButtonStyle?: ThemeButtonStyle;
  feedback?: 'correct' | 'incorrect' | null;
  userAnswer?: any;
}

const CardPayloadRenderer: React.FC<CardPayloadRendererProps> = ({
  card,
  onAnswer,
  isDesignMode,
  isImmersive,
  isSidebar,
  isRevealed,
  onReveal,
  onEdit,
  onViewInfo,
  hideFlashcardButtons,
  themeButtonStyle,
  feedback,
  userAnswer
}) => {
  
  const handleInteraction = (val: any) => {
      if (!isDesignMode) {
          onAnswer(val);
      }
  };

  switch (card.type) {
    case 'flashcard':
        // Flashcards are handled via split-view logic in UnifiedQuestionCard, 
        // but if payload renderer is called, we can provide the Answer Buttons here if revealed.
        if (isDesignMode) return <div className="text-center opacity-50">Answer Buttons (Interactive)</div>;
        
        if (!isRevealed) {
             return (
                <button 
                    onClick={onReveal}
                    className="w-full h-full flex flex-col items-center justify-center bg-secondary-100/50 dark:bg-black/20 hover:bg-secondary-200/50 dark:hover:bg-black/40 transition-colors z-20 cursor-pointer group rounded-xl"
                >
                     <Icon name="eye" className="w-8 h-8 mb-2 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                     <span className="text-sm font-bold text-secondary-500 group-hover:text-primary-500 transition-colors">Tap to Show</span>
                </button>
            );
        }
        
        return (
             <div className="flex flex-col gap-3 w-full rounded-b-xl p-3 border-t border-secondary-200 dark:border-secondary-700 bg-surface dark:bg-secondary-800 z-30">
                 {/* Reflection Actions */}
                 <div className="flex justify-between items-center px-1">
                     <div className="flex gap-2">
                         {onEdit && (
                            <button onClick={onEdit} className="text-xs font-semibold text-text-subtle hover:text-text-main flex items-center gap-1 transition-colors">
                                <Icon name="pencil" className="w-3.5 h-3.5" /> Edit
                            </button>
                         )}
                         {onViewInfo && (
                            <button onClick={onViewInfo} className="text-xs font-semibold text-text-subtle hover:text-text-main flex items-center gap-1 transition-colors">
                                <Icon name="file-text" className="w-3.5 h-3.5" /> Info
                            </button>
                         )}
                     </div>
                 </div>

                 {!hideFlashcardButtons && (
                     <div className="flex gap-2">
                        <Button variant="secondary" size="sm" className="flex-1 text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20" onClick={() => onAnswer(false)}>Incorrect</Button>
                        <Button variant="primary" size="sm" className="flex-1 bg-success-600 hover:bg-success-700 text-white" onClick={() => onAnswer(true)}>Correct</Button>
                     </div>
                 )}
             </div>
        );

    case 'mcq':
      const mcqData = card.payload as McqPayload;
      return (
        <McqLayout 
            options={mcqData.options} 
            onSelect={handleInteraction} 
            isImmersive={isImmersive} 
            isSidebar={isSidebar} 
            themeButtonStyle={themeButtonStyle}
            feedback={feedback}
            correctAnswers={mcqData.correctAnswers}
            userAnswer={userAnswer}
        />
      );
    
    case 'truefalse':
      const tfData = card.payload as TrueFalsePayload;
      return (
        <TrueFalseLayout 
            statement={tfData.displayStatement} 
            onSelect={handleInteraction} 
            isImmersive={isImmersive} 
            isSidebar={isSidebar} 
            themeButtonStyle={themeButtonStyle}
            feedback={feedback}
            correctAnswer={tfData.isStatementCorrect}
            userAnswer={userAnswer}
        />
      );
    
    case 'typing':
      const typingData = card.payload as TypingPayload;
      // We pass the first acceptable answer as context for the handwriting engine
      const context = typingData.acceptableAnswers && typingData.acceptableAnswers.length > 0 
          ? typingData.acceptableAnswers[0] 
          : undefined;

      return (
        <TypingLayout 
            hint={typingData.hint} 
            onSubmit={handleInteraction} 
            isImmersive={isImmersive} 
            isSidebar={isSidebar} 
            correctAnswerContext={context}
        />
      );
    
    case 'scramble':
      const scrambleData = card.payload as ScramblePayload;
      return <ScrambleLayout segments={scrambleData.segments} onAnswer={handleInteraction} isImmersive={isImmersive} isSidebar={isSidebar} />;

    case 'stroke':
      const strokeData = card.payload as StrokePayload;
      if (isDesignMode) {
          return (
              <div className="w-full aspect-square bg-secondary-100 dark:bg-secondary-800 rounded-xl border-2 border-dashed border-secondary-300 flex items-center justify-center flex-col gap-2">
                  <Icon name="brush" className="w-8 h-8 text-secondary-400" />
                  <span className="text-xs text-secondary-500 font-medium">Stroke Canvas Preview</span>
                  <span className="text-xs font-mono text-primary-500">{strokeData.character}</span>
              </div>
          );
      }
      return (
          <StrokeLayout 
              character={strokeData.character} 
              meaning={strokeData.meaning} 
              onComplete={() => onAnswer(true)} // Stroke mode is pass/fail via completion
              isImmersive={isImmersive}
              isSidebar={isSidebar}
              hideMeaning={true} // Hide duplicate question text since card face shows it
              onViewInfo={onViewInfo}
          />
      );
    
    default:
      return <div className="text-error-500">Unsupported question type</div>;
  }
};

export default CardPayloadRenderer;
