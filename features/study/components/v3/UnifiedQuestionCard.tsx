
import React, { useState, useEffect } from 'react';
import { QuestionCard, CardFaceDesign, VocabRow, Table, TypographyDesign, FlashcardPayload, Relation } from '../../../../types';
import ExpandableText from '../../../../components/ui/ExpandableText';
import Icon from '../../../../components/ui/Icon';
import { useUIStore } from '../../../../stores/useUIStore';
import { DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../../../tables/designConstants';

// Refactored Imports
import { useCardAudio } from '../../hooks/useCardAudio';
import CardFaceRenderer from './card/CardFaceRenderer';
import CardPayloadRenderer from './card/CardPayloadRenderer';
import { SmartTextarea, DesignerBlock, QuickInsertHandle } from '../../../tables/components/RelationSettings/DesignComponents';

interface UnifiedQuestionCardProps {
  card: QuestionCard;
  onAnswer: (answer: any) => void;
  design?: CardFaceDesign;
  backDesign?: CardFaceDesign;
  row?: VocabRow;
  table?: Table;
  relation?: Relation; // Added Relation prop
  isDesignMode?: boolean;
  // Design Mode Props
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onInsertElement?: (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
  onUpdateElement?: (face: 'front' | 'back', id: string, updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
  onDeleteElement?: (face: 'front' | 'back', id: string) => void;
  onChangeElementType?: (face: 'front' | 'back', id: string, newType: 'data' | 'label') => void;
  onEdit?: () => void;
  onReveal?: () => void;
  onViewInfo?: () => void; // Added prop
  hideFlashcardButtons?: boolean;
}

const UnifiedQuestionCard: React.FC<UnifiedQuestionCardProps> = (props) => {
  const { 
      card, onAnswer, design, backDesign, row, table, relation,
      isDesignMode = false, onSelectElement, onEdit, onReveal, onViewInfo, hideFlashcardButtons
  } = props;
  
  const { theme, isImmersive } = useUIStore();
  const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
  
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  // Hook now receives the relation correctly
  const { isPlaying, playSequence } = useCardAudio(card, table, row, relation);

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
        setIsLargeScreen(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      setIsRevealed(false);
  }, [card.id]);

  const isSidebar = isLargeScreen && !isDesignMode;

  const handleContainerClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDesignMode && onSelectElement) {
          onSelectElement('');
      }
  };

  const handleReveal = () => {
      setIsRevealed(true);
      if (onReveal) {
          onReveal();
      }
  };
  
  const background = design?.backgroundType === 'image' 
      ? `url("${design.backgroundValue}") center/cover no-repeat`
      : (design?.backgroundType === 'gradient' && design.backgroundValue.includes(',') 
          ? `linear-gradient(${design.gradientAngle}deg, ${design.backgroundValue.split(',')[0]}, ${design.backgroundValue.split(',')[1]})`
          : design?.backgroundValue);

  // --- Flashcard Layout ---
  if (card.type === 'flashcard') {
    return (
        <div className={`flex flex-col lg:flex-row w-full h-full bg-surface dark:bg-secondary-800 rounded-xl shadow-xl overflow-hidden border border-secondary-200 dark:border-secondary-700 transition-all duration-300 ease-in-out w-full h-full max-w-none`}>
            {/* Question Area */}
            <div className="flex-1 relative p-6 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-dashed border-secondary-300 dark:border-secondary-600 bg-surface dark:bg-secondary-800/50">
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background }} />
                <div className="relative z-10 w-full flex-1 overflow-y-auto flex flex-col justify-center">
                    <CardFaceRenderer face="front" {...props} isMobile={isMobile} />
                </div>
            </div>

            {/* Answer Area (Payload + Back Face) */}
            <div className="flex-1 relative bg-secondary-50 dark:bg-secondary-900/50 flex flex-col">
                <CardPayloadRenderer 
                    card={card}
                    onAnswer={onAnswer}
                    isDesignMode={isDesignMode}
                    isRevealed={isRevealed}
                    onReveal={handleReveal}
                    onEdit={onEdit}
                    onViewInfo={onViewInfo}
                    hideFlashcardButtons={hideFlashcardButtons}
                />
                {(isRevealed || isDesignMode) && (
                     <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center items-center text-center">
                         <CardFaceRenderer face="back" {...props} design={backDesign} isMobile={isMobile} />
                     </div>
                )}
            </div>
        </div>
    );
  }

  // --- Standard Question Layout ---
  // Legacy support for non-designer questions (e.g. simple text)
  if (!design && !isDesignMode) {
      return (
        <div className="mb-6 w-full flex flex-col items-center gap-4 z-10">
            {card.content.image && (
                <div className="w-full max-h-48 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2">
                    <img src={card.content.image} alt="Question" className="h-full object-contain" />
                </div>
            )}
            <div className="text-center w-full relative group">
                <div className="flex items-center justify-center gap-2">
                    <ExpandableText 
                        text={card.content.promptText} 
                        typography={{ ...defaultTypo, fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center' }} 
                    />
                    <button 
                        onClick={playSequence}
                        className={`p-2 rounded-full transition-colors ${isPlaying ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                        title="Play Audio"
                    >
                        <Icon name={isPlaying ? "volume-up" : "volume-down"} className="w-5 h-5" />
                    </button>
                </div>
                {card.content.answerLabel && (
                    <div className="mt-3">
                        <span className="font-mono text-sm text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-1 rounded opacity-90">
                            {card.content.answerLabel}
                        </span>
                    </div>
                )}
                {card.content.context && <p className="text-sm text-text-subtle mt-2 italic">{card.content.context}</p>}
            </div>
            
            {/* Standard Payload Render */}
            <div className="w-full max-w-2xl mt-4">
                 <CardPayloadRenderer 
                    card={card}
                    onAnswer={onAnswer}
                    isDesignMode={isDesignMode}
                    isImmersive={isImmersive}
                    isSidebar={isSidebar}
                    onViewInfo={onViewInfo}
                    hideFlashcardButtons={hideFlashcardButtons}
                />
            </div>
        </div>
      )
  }

  // --- Designed Question Layout ---
  return (
    <div 
        onClick={handleContainerClick}
        className={`
            relative flex flex-col h-full rounded-2xl shadow-xl overflow-hidden transition-all duration-300 w-full h-full max-w-none
            ${isDesignMode ? 'cursor-default border-2 border-dashed border-secondary-300 dark:border-secondary-600' : 'border border-secondary-200/80 dark:border-secondary-700/50'}
        `}
    >
      {/* Background Layer */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ 
            background: isDesignMode 
                ? 'repeating-linear-gradient(45deg, #f8fafc 0px, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)' 
                : background 
        }} 
      />
      
      {/* Content Container */}
      <div className="relative z-10 w-full flex flex-col lg:flex-row h-full">
          {/* Question Face */}
          <div className="flex-1 flex flex-col justify-center w-full lg:w-3/5 xl:w-2/3 overflow-y-auto hide-scrollbar p-4 sm:p-6 lg:border-r border-secondary-200/50 dark:border-secondary-700/50">
              <CardFaceRenderer face="front" {...props} isMobile={isMobile} />
          </div>
          
          {/* Answer Payload */}
          <div className={`w-full lg:w-2/5 xl:w-1/3 mt-auto lg:mt-0 pt-4 lg:pt-0 p-4 sm:p-6 flex flex-col justify-center bg-secondary-50/30 dark:bg-black/10 lg:bg-transparent ${isDesignMode ? 'pointer-events-none opacity-50 grayscale' : ''}`}>
              <CardPayloadRenderer 
                    card={card}
                    onAnswer={onAnswer}
                    isDesignMode={isDesignMode}
                    isImmersive={isImmersive}
                    isSidebar={isSidebar}
                    onViewInfo={onViewInfo}
                    hideFlashcardButtons={hideFlashcardButtons}
              />
          </div>
      </div>
    </div>
  );
};

export default UnifiedQuestionCard;
