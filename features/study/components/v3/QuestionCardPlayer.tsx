
import React, { useState, useEffect } from 'react';
import { QuestionCard, CardFaceDesign, VocabRow, Table, Relation } from '../../../../types';
import CardFrame from './card/CardFrame';
import CardFace from './card/CardFace';
import CardPayloadRenderer from './card/CardPayloadRenderer';
import { useCardAudio } from '../../hooks/useCardAudio';
import { useAudioStore } from '../../../../stores/useAudioStore';
import { playSpeech, detectLanguageFromText } from '../../../../services/audioService';
import { ThemeButtonStyle } from '../../../../features/tables/designConstants';

interface QuestionCardPlayerProps {
  card: QuestionCard;
  onAnswer: (answer: any) => void;
  design?: CardFaceDesign;
  backDesign?: CardFaceDesign;
  row?: VocabRow;
  table?: Table;
  relation?: Relation;
  onEdit?: () => void;
  onReveal?: () => void;
  onViewInfo?: () => void;
  hideFlashcardButtons?: boolean;
  themeButtonStyle?: ThemeButtonStyle;
  feedback?: 'correct' | 'incorrect' | null;
  userAnswer?: any;
}

const QuestionCardPlayer: React.FC<QuestionCardPlayerProps> = ({
  card, onAnswer, design, backDesign, row, table, relation,
  onEdit, onReveal, onViewInfo, hideFlashcardButtons, themeButtonStyle,
  feedback, userAnswer
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const { playQueue, audioState } = useAudioStore();
  
  // Audio Orchestration
  const { isPlaying, playSequence } = useCardAudio(card, table, row, relation);

  useEffect(() => {
      setIsRevealed(false);
      setIsPanelCollapsed(false); // Reset collapse state on new card
  }, [card.id]);

  const handleReveal = () => {
      setIsRevealed(true);
      if (onReveal) onReveal();
  };
  
  const handlePlayAudio = (text: string, colId: string) => {
      // Simplified trigger from visual components
      const lang = table?.columnAudioConfig?.[colId]?.language || detectLanguageFromText(text);
      const audioId = `${card.id}-${colId}`;
      playQueue([{ text, lang }], audioId);
  };
  
  const currentAudioId = audioState.playingId;

  // --- UI Components ---
  
  const ToggleHandle = () => (
      <div 
          onClick={() => setIsPanelCollapsed(prev => !prev)}
          className="w-full flex items-center justify-center py-2 cursor-pointer group hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0 select-none z-10"
          title={isPanelCollapsed ? "Expand Answer Area" : "Collapse Answer Area"}
      >
           <div className={`
              w-12 h-1.5 rounded-full bg-secondary-300 dark:bg-secondary-600 
              group-hover:bg-secondary-400 dark:group-hover:bg-secondary-500 
              transition-all duration-300
              ${isPanelCollapsed ? 'opacity-50' : 'opacity-100'}
           `} />
      </div>
  );

  // Determine Right Panel Content
  const renderRightPanel = () => {
      // 1. Interaction Area (Payload)
      // For Flashcards, this is the "Reveal" button or the "Back Face + Buttons"
      if (card.type === 'flashcard') {
          if (!isRevealed) {
              return (
                  <div className="flex flex-col h-full w-full">
                      <ToggleHandle />
                      <div className={`
                          flex-1 flex flex-col justify-center p-6
                          transition-all duration-300 ease-in-out
                          ${isPanelCollapsed ? 'max-h-0 opacity-0 overflow-hidden py-0' : 'max-h-[80vh] opacity-100'}
                      `}>
                          <CardPayloadRenderer
                              card={card}
                              onAnswer={onAnswer}
                              isRevealed={isRevealed}
                              onReveal={handleReveal}
                              onEdit={onEdit}
                              onViewInfo={onViewInfo}
                              hideFlashcardButtons={hideFlashcardButtons}
                              isSidebar={true}
                              themeButtonStyle={themeButtonStyle}
                          />
                      </div>
                  </div>
              );
          }
          // If revealed, show Back Face and Buttons
          return (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                   <div className="flex-1 overflow-y-auto hide-scrollbar p-6 flex flex-col justify-center items-center text-center">
                      <CardFace 
                          face="back" 
                          design={backDesign} 
                          table={table} 
                          row={row} 
                          card={card}
                          isDesignMode={false} 
                          onPlayAudio={handlePlayAudio}
                          currentAudioId={currentAudioId}
                      />
                   </div>
                   <div className="flex-shrink-0 border-t border-secondary-200/50 dark:border-secondary-700/50">
                        <ToggleHandle />
                        <div className={`
                             transition-all duration-300 ease-in-out
                             ${isPanelCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-60 opacity-100 p-4'}
                        `}>
                            <CardPayloadRenderer
                                card={card}
                                onAnswer={onAnswer}
                                isRevealed={isRevealed}
                                onReveal={handleReveal}
                                onEdit={onEdit}
                                onViewInfo={onViewInfo}
                                hideFlashcardButtons={hideFlashcardButtons}
                                isSidebar={true}
                                themeButtonStyle={themeButtonStyle}
                            />
                        </div>
                   </div>
              </div>
          );
      }

      // 2. Interactive Questions (MCQ, Typing, etc.)
      return (
          <div className="flex flex-col h-full w-full">
               <ToggleHandle />
               <div className={`
                    flex-1 flex flex-col justify-center
                    transition-all duration-300 ease-in-out
                    ${isPanelCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[80vh] opacity-100'}
               `}>
                   <div className="p-6 h-full flex flex-col justify-center">
                        <CardPayloadRenderer
                            card={card}
                            onAnswer={onAnswer}
                            isRevealed={isRevealed}
                            onReveal={handleReveal}
                            onEdit={onEdit}
                            onViewInfo={onViewInfo}
                            hideFlashcardButtons={hideFlashcardButtons}
                            isSidebar={true}
                            themeButtonStyle={themeButtonStyle}
                            feedback={feedback}
                            userAnswer={userAnswer}
                        />
                   </div>
               </div>
          </div>
      );
  };

  return (
      <CardFrame 
        design={design} 
        layout="split" // Always use split layout for Gemini 3 Standard
        rightContent={renderRightPanel()}
      >
          {/* Front Face (Left Panel) */}
          <div className="flex-1 flex flex-col justify-center w-full overflow-y-auto hide-scrollbar p-4 sm:p-8">
              <CardFace 
                  face="front" 
                  design={design} 
                  table={table} 
                  row={row} 
                  card={card}
                  isDesignMode={false} 
                  onPlayAudio={handlePlayAudio}
                  currentAudioId={currentAudioId}
              />
          </div>
      </CardFrame>
  );
};

export default QuestionCardPlayer;
