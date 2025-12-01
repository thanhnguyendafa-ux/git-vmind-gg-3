

import React from 'react';
import { Question, Relation, Table, VocabRow, CardFaceDesign, TypographyDesign, DisplayTier, StudyMode } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import ExpandableText from '../../../components/ui/ExpandableText';
import { DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../../tables/designConstants';
import CardTagDisplay from './CardTagDisplay';

interface QuestionCardProps {
    question: Question;
    relation: Relation;
    table: Table;
    row: VocabRow;
    tags: string[];
    tagCounts: Map<string, number>;
    feedback?: 'correct' | 'incorrect' | null;
    forceFlipped?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, relation, table, row, tags, tagCounts, feedback, forceFlipped }) => {
    const { theme } = useUIStore();
    const design = relation.design?.front;
    const backDesign = relation.design?.back;
    
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
    const { displayTiers = {} } = relation;
    
    const getTier = (id: string) => displayTiers[id] || DisplayTier.Primary;

    const getCardStyle = (faceDesign?: CardFaceDesign): React.CSSProperties => {
        if (!faceDesign) {
            return { background: theme === 'dark' ? '#1f2937' : '#ffffff' };
        }
        let background = faceDesign.backgroundValue;
        if (faceDesign.backgroundType === 'gradient' && faceDesign.backgroundValue.includes(',')) {
            const [color1, color2] = faceDesign.backgroundValue.split(',');
            background = `linear-gradient(${faceDesign.gradientAngle}deg, ${color1 || '#ffffff'}, ${color2 || '#e0e0e0'})`;
        } else if (faceDesign.backgroundType === 'image') {
            background = `url("${faceDesign.backgroundValue}") center/cover no-repeat, #f0f0f0`;
        }
        return { background };
    };
    
    const currentFaceDesign = forceFlipped ? backDesign : design;
    const cardStyle = getCardStyle(currentFaceDesign);
    const isTrueFalse = question.type === StudyMode.TrueFalse;

    // Universal helper to render a card face based strictly on the Design Configuration.
    const renderFace = (
        faceDesign: CardFaceDesign | undefined,
        columnIds: string[],
        colsData: Record<string, string>,
        containerClass: string = "h-full"
    ) => {
        // Fallback design if none exists
        const effectiveDesign = faceDesign || {
            backgroundType: 'solid' as const,
            backgroundValue: 'var(--color-surface)',
            gradientAngle: 135,
            typography: {},
            layout: 'vertical' as const,
            elementOrder: [...columnIds], 
            textBoxes: [],
        };

        // Ensure typography exists
        columnIds.forEach(id => {
            if (!effectiveDesign.typography[id]) {
                effectiveDesign.typography[id] = defaultTypo;
            }
        });

        const elementsToRender = effectiveDesign.elementOrder && effectiveDesign.elementOrder.length > 0 
            ? effectiveDesign.elementOrder 
            : columnIds;

        return (
             <div className={`flex items-center justify-center w-full ${containerClass} p-4 ${effectiveDesign.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}>
                {elementsToRender.map((id, index) => {
                    // Case 1: Column Label (New)
                    if (id.startsWith('label-')) {
                        const colId = id.replace('label-', '');
                        const col = table.columns.find(c => c.id === colId);
                        if (col) {
                             const typography = effectiveDesign.typography[id] || { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7 };
                             return <div key={`${id}-${index}`} className="w-full"><ExpandableText text={col.name} typography={typography} /></div>;
                        }
                        return null;
                    }

                    // Case 2: Static Text Box
                    const txtBox = effectiveDesign.textBoxes?.find(t => t.id === id);
                    if (txtBox) {
                         return <div key={`${id}-${index}`} className="w-full"><ExpandableText text={txtBox.text} typography={txtBox.typography} /></div>;
                    }

                    // Case 3: Column Data
                    const col = table.columns.find(c => c.id === id);
                    if (col) {
                        const tier = getTier(col.id);
                        if (tier === DisplayTier.Hidden) return null;

                        const typography = effectiveDesign.typography[id] || defaultTypo;
                        const text = colsData[id] || ''; 
                        
                        const element = <ExpandableText text={text} typography={typography} />;
                        
                        if (tier === DisplayTier.Secondary) {
                            return <div key={`${id}-${index}`} className="w-full truncate-1-line opacity-80 scale-90">{element}</div>;
                        }
                        return <div key={`${id}-${index}`} className="w-full">{element}</div>;
                    }

                    return null;
                })}
             </div>
        );
    };

    const renderTrueFalseQuestionFace = () => {
        const frontContent = renderFace(design, relation.questionColumnIds, row.cols, "h-auto min-h-[6rem]");
        const proposedCols = question.proposedCols || row.cols;
        const backContent = renderFace(backDesign, relation.answerColumnIds, proposedCols, "h-auto min-h-[6rem]");

        return (
            <div className="w-full h-full flex flex-col overflow-y-auto hide-scrollbar">
                <div className="flex-1 flex flex-col justify-end pb-4">
                     {frontContent}
                </div>
                <div className="w-full px-8 flex-shrink-0 opacity-50">
                    <div className="border-b-2 border-dashed border-secondary-400 dark:border-secondary-500" />
                </div>
                <div className="flex-1 flex flex-col justify-start pt-4">
                    {backContent}
                </div>
            </div>
        );
    };
    
    let contentToRender;

    if (isTrueFalse) {
        contentToRender = renderTrueFalseQuestionFace();
    } else if (forceFlipped) {
        contentToRender = renderFace(backDesign, relation.answerColumnIds, row.cols);
    } else {
        contentToRender = renderFace(design, relation.questionColumnIds, row.cols);
    }

    const ringClass = feedback === 'correct'
        ? 'ring-4 ring-success-500/50'
        : feedback === 'incorrect'
        ? 'ring-4 ring-error-500/50'
        : '';
        
    const containerStyle = isTrueFalse ? getCardStyle(design) : cardStyle;

    return (
        <div style={containerStyle} className={`w-full min-h-[24rem] rounded-xl shadow-lg border border-secondary-200/80 dark:border-secondary-700/50 flex flex-col justify-center items-center relative overflow-hidden transition-all duration-300 ${ringClass}`}>
            {(containerStyle.background?.toString().includes('url') || false) && <div className="absolute inset-0 bg-black/30 pointer-events-none" />}
            
            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-10">
                {contentToRender}
                
                {/* NEW: Answer Label for Front Face (Legacy) */}
                {!isTrueFalse && !forceFlipped && question.answerLabel && (
                    <div className="mt-4 animate-fadeIn">
                        <span className="font-mono text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-1 rounded opacity-90">
                            {question.answerLabel}
                        </span>
                    </div>
                )}
            </div>
            <CardTagDisplay tags={tags} tagCounts={tagCounts} />
        </div>
    );
};

export default QuestionCard;