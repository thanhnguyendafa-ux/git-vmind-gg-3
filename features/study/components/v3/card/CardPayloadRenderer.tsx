
import React from 'react';
import { QuestionCard, McqPayload, TrueFalsePayload, TypingPayload, ScramblePayload, FlashcardPayload, StrokePayload } from '../../../../../types';
import McqLayout from '../McqLayout';
import TrueFalseLayout from '../TrueFalseLayout';
import TypingLayout from '../TypingLayout';
import ScrambleLayout from '../ScrambleLayout';
import StrokeLayout from '../StrokeLayout';
import { Button } from '../../../../../components/ui/Button';
import Icon from '../../../../../components/ui/Icon';

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
  hideFlashcardButtons
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
             <div className="p-3 border-t border-secondary-200 dark:border-secondary-700 bg-surface dark:bg-secondary-800 flex justify-center gap-2 z-30 w-full rounded-b-xl">
                 {onEdit && (
                    <Button variant="ghost" size="sm" onClick={onEdit} className="text-text-subtle hover:text-text-main" title="Edit">
                        <Icon name="pencil" className="w-4 h-4" />
                    </Button>
                 )}
                 {!hideFlashcardButtons && (
                     <>
                        <Button variant="secondary" size="sm" className="text-error-600" onClick={() => onAnswer(false)}>Incorrect</Button>
                        <Button variant="primary" size="sm" className="bg-success-600 hover:bg-success-700 text-white" onClick={() => onAnswer(true)}>Correct</Button>
                     </>
                 )}
             </div>
        );

    case 'mcq':
      const mcqData = card.payload as McqPayload;
      return <McqLayout options={mcqData.options} onSelect={handleInteraction} isImmersive={isImmersive} isSidebar={isSidebar} />;
    
    case 'truefalse':
      const tfData = card.payload as TrueFalsePayload;
      return <TrueFalseLayout statement={tfData.displayStatement} onSelect={handleInteraction} isImmersive={isImmersive} isSidebar={isSidebar} />;
    
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
