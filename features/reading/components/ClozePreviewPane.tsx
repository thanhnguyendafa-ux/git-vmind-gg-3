
import React, { useMemo, useState } from 'react';
import { StudyMode, QuestionCard, TypingPayload, McqPayload } from '../../../types';
import CardFrame from '../../study/components/v3/card/CardFrame';
import CardPayloadRenderer from '../../study/components/v3/card/CardPayloadRenderer';
import { DEFAULT_TYPOGRAPHY } from '../../tables/designConstants';
import ExpandableText from '../../../components/ui/ExpandableText';
import Icon from '../../../components/ui/Icon';

interface ClozePreviewPaneProps {
    contextBefore: string;
    contextAfter: string;
    clozeAnswer: string;
    clozeType: StudyMode.ClozeTyping | StudyMode.ClozeMCQ;
    hintType: 'wordCount' | 'none';
    extraInfo: string;
}

const ClozePreviewPane: React.FC<ClozePreviewPaneProps> = ({ 
    contextBefore, 
    contextAfter, 
    clozeAnswer, 
    clozeType, 
    hintType,
    extraInfo 
}) => {
    // Font Size Control State
    const [fontSize, setFontSize] = useState(1.125); // Default 1.125rem (text-lg)

    const handleFontSizeChange = (delta: number) => {
        setFontSize(prev => Math.min(3, Math.max(0.75, prev + delta)));
    };

    // Construct the mock card object for the renderer
    const card = useMemo<QuestionCard>(() => {
        const id = 'preview-cloze-card';
        const wordCount = clozeAnswer.split(/\s+/).filter(Boolean).length;
        const hint = hintType === 'wordCount' ? `{${wordCount} ${wordCount === 1 ? 'word' : 'words'}}` : undefined;
        
        let payload;
        
        if (clozeType === StudyMode.ClozeMCQ) {
            payload = {
                options: [clozeAnswer, "Distractor A", "Distractor B", "Distractor C"], // Mock options
                correctAnswers: [clozeAnswer]
            } as McqPayload;
            return {
                id,
                rowId: 'preview',
                type: 'mcq',
                content: { promptText: 'Cloze Preview' },
                payload
            };
        } else {
             payload = {
                acceptableAnswers: [clozeAnswer],
                caseSensitive: false,
                hint
            } as TypingPayload;
            return {
                id,
                rowId: 'preview',
                type: 'typing',
                content: { promptText: 'Cloze Preview' },
                payload
            };
        }
    }, [clozeAnswer, clozeType, hintType]);

    // Construct the visual text
    const displayText = (
        <span>
            {contextBefore}
            <span className="font-bold text-primary-500 mx-1 border-b-2 border-dashed border-primary-400">[ ... ]</span>
            {contextAfter}
        </span>
    );
    
    // Custom Right Panel Content for the Split Layout
    const renderRightPanel = () => (
        <div className="h-full flex flex-col justify-center p-6">
            <CardPayloadRenderer
                card={card}
                onAnswer={() => {}}
                isDesignMode={true} // Use design mode to show input/buttons statically
                isSidebar={true}
            />
            {extraInfo && (
                <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                    <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase opacity-80">
                        <Icon name="info" className="w-3 h-3" />
                        <span>Extra Info</span>
                    </div>
                    <p className="line-clamp-3 italic">{extraInfo}</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full h-full max-h-[600px] relative">
             <CardFrame 
                layout="split"
                isDesignMode={true} // Disables interactions
                rightContent={renderRightPanel()}
            >
                {/* Font Size Controls */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/80 dark:bg-black/40 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-success-200 dark:border-success-800/50">
                    <button 
                        onClick={() => handleFontSizeChange(-0.125)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-success-100 hover:bg-success-200 text-success-700 dark:bg-success-900/50 dark:text-success-300 transition-colors"
                        title="Decrease font size"
                    >
                        <Icon name="minus" className="w-3 h-3" />
                    </button>
                    
                    <span className="text-[10px] font-bold text-success-700 dark:text-success-400 px-1 w-8 text-center select-none">
                        Aa
                    </span>

                    <button 
                        onClick={() => handleFontSizeChange(0.125)}
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-success-500 hover:bg-success-600 text-white shadow-sm transition-colors"
                        title="Increase font size"
                    >
                        <Icon name="plus" className="w-3 h-3" />
                    </button>
                </div>

                {/* Front Face (Text Content) */}
                <div className="flex-1 flex flex-col justify-center items-center w-full p-8 text-center overflow-auto custom-scrollbar">
                    <div 
                        className="font-serif leading-relaxed text-text-main dark:text-secondary-100 transition-all duration-200"
                        style={{ fontSize: `${fontSize}rem` }}
                    >
                         {displayText}
                    </div>
                </div>
            </CardFrame>
        </div>
    );
};

export default ClozePreviewPane;
