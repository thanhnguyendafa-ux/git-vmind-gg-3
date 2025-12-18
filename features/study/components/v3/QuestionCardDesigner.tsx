
import React from 'react';
import { QuestionCard, CardFaceDesign, VocabRow, Table, Relation, TypographyDesign } from '../../../../types';
import CardFrame from './card/CardFrame';
import CardFace from './card/CardFace';
import CardPayloadRenderer from './card/CardPayloadRenderer';

interface QuestionCardDesignerProps {
  card: QuestionCard;
  design?: CardFaceDesign;
  backDesign?: CardFaceDesign;
  row?: VocabRow;
  table?: Table;
  relation?: Relation;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onInsertElement?: (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
  onUpdateElement?: (face: 'front' | 'back', id: string, updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
  onDeleteElement?: (face: 'front' | 'back', id: string) => void;
  onChangeElementType?: (face: 'front' | 'back', id: string, newType: 'data' | 'label') => void;
  isMobile?: boolean;
}

const QuestionCardDesigner: React.FC<QuestionCardDesignerProps> = ({
  card, design, backDesign, row, table, relation,
  selectedElementId, onSelectElement, onInsertElement, onUpdateElement, onDeleteElement, onChangeElementType, isMobile
}) => {
  const isFlashcard = card.type === 'flashcard';
  
  const renderRightPanel = () => (
      <div className="h-full flex flex-col">
          {/* If Flashcard, show Back Face editor here */}
          {isFlashcard ? (
               <div className="flex-1 flex flex-col justify-center w-full p-4 overflow-y-auto hide-scrollbar">
                    <div className="text-xs font-bold text-text-subtle uppercase mb-2 text-center">Back Face</div>
                    <CardFace
                        face="back"
                        design={backDesign}
                        table={table}
                        row={row}
                        card={card}
                        relation={relation}
                        isDesignMode={true}
                        isMobile={isMobile}
                        selectedElementId={selectedElementId}
                        onSelectElement={onSelectElement}
                        onInsertElement={onInsertElement}
                        onUpdateElement={onUpdateElement}
                        onDeleteElement={onDeleteElement}
                        onChangeElementType={onChangeElementType}
                    />
               </div>
          ) : (
               /* If Interactive, show Input Preview */
               <div className="flex-1 flex flex-col justify-center p-6 opacity-80 pointer-events-none grayscale">
                    <div className="text-xs font-bold text-text-subtle uppercase mb-4 text-center">Input Area Preview</div>
                    <CardPayloadRenderer 
                        card={card}
                        onAnswer={() => {}}
                        isDesignMode={true}
                        isSidebar={true}
                    />
               </div>
          )}
      </div>
  );

  return (
    <CardFrame 
        design={design} 
        isDesignMode={true} 
        layout="split"
        rightContent={renderRightPanel()}
    >
        {/* Front Face Designer (Left) */}
        <div className="flex-1 flex flex-col justify-center w-full overflow-y-auto hide-scrollbar p-4 sm:p-8">
            <div className="text-xs font-bold text-text-subtle uppercase mb-2 text-center lg:hidden">Front Face</div>
            <CardFace
                face="front"
                design={design}
                table={table}
                row={row}
                card={card}
                relation={relation}
                isDesignMode={true}
                isMobile={isMobile}
                selectedElementId={selectedElementId}
                onSelectElement={onSelectElement}
                onInsertElement={onInsertElement}
                onUpdateElement={onUpdateElement}
                onDeleteElement={onDeleteElement}
                onChangeElementType={onChangeElementType}
            />
        </div>
    </CardFrame>
  );
};

export default QuestionCardDesigner;
