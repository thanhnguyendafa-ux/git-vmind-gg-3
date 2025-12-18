
import * as React from 'react';
import { CardFaceDesign } from '../../../../../types';
import { useUIStore } from '../../../../../stores/useUIStore';
import CardTagDisplay from '../../CardTagDisplay';

interface CardFrameProps {
    children: React.ReactNode; // The Left Content (Card Face)
    rightContent?: React.ReactNode; // The Right Content (Interaction Area)
    design?: CardFaceDesign;
    isDesignMode?: boolean;
    tags?: string[];
    tagCounts?: Map<string, number>;
    feedback?: 'correct' | 'incorrect' | null;
    onClick?: (e: React.MouseEvent) => void;
    layout?: 'single' | 'split';
}

const CardFrame: React.FC<CardFrameProps> = ({ 
    children, 
    rightContent,
    design, 
    isDesignMode, 
    tags, 
    tagCounts, 
    feedback, 
    onClick,
    layout = 'single'
}) => {
    const { theme } = useUIStore();
    
    const background = design?.backgroundType === 'image' 
      ? `url("${design.backgroundValue}") center/cover no-repeat`
      : (design?.backgroundType === 'gradient' && design.backgroundValue.includes(',') 
          ? `linear-gradient(${design.gradientAngle}deg, ${design.backgroundValue.split(',')[0]}, ${design.backgroundValue.split(',')[1]})`
          : design?.backgroundValue || (theme === 'dark' ? '#1f2937' : '#ffffff'));

    const designModeClass = isDesignMode ? 'cursor-default border-2 border-dashed border-secondary-300 dark:border-secondary-600' : 'border border-secondary-200/80 dark:border-secondary-700/50 shadow-xl';
    
    const ringClass = feedback === 'correct'
        ? 'ring-4 ring-success-500/50'
        : feedback === 'incorrect'
        ? 'ring-4 ring-error-500/50'
        : '';

    // Layout Logic
    // Mobile: Fluid Vertical Stack (Scrollable)
    // Desktop: Split Horizontal Panel (Fixed Height)
    const containerClasses = isDesignMode 
        ? "h-full flex flex-col lg:flex-row overflow-hidden" // Design mode stays fixed
        : "min-h-[60vh] lg:h-full flex flex-col lg:flex-row overflow-visible lg:overflow-hidden";

    return (
        <div 
            onClick={onClick}
            className={`
                relative w-full rounded-2xl transition-all duration-300 max-w-none
                ${designModeClass} ${ringClass} ${containerClasses}
            `}
        >
            {/* Background Layer - Fixed absolute to cover entire scrollable area */}
            <div 
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ 
                    background: isDesignMode 
                        ? 'repeating-linear-gradient(45deg, #f8fafc 0px, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)' 
                        : background,
                    backgroundAttachment: 'local' // Ensures bg scrolls with content if needed
                }} 
            />
             {(background?.toString().includes('url') || false) && !isDesignMode && <div className="absolute inset-0 bg-black/30 pointer-events-none z-0" />}

            {/* Left Panel: Card Context / Question */}
            {/* Mobile: Grows with content. Desktop: Flex-1, scrollable internally. */}
            <div className={`relative z-10 flex flex-col w-full ${isDesignMode ? 'h-full overflow-y-auto' : 'lg:h-full lg:flex-1 lg:overflow-y-auto'} lg:min-h-0`}>
                <div className="flex-1 flex flex-col">
                    {children}
                </div>
                
                {tags && tagCounts && (
                     <div className="mt-auto p-4 z-20 pointer-events-none">
                        <CardTagDisplay tags={tags} tagCounts={tagCounts} />
                     </div>
                )}
            </div>

            {/* Right Panel: Interaction / Answer */}
            {/* Mobile: Sticky Bottom Sheet. Desktop: Fixed Sidebar. */}
            {layout === 'split' && rightContent && (
                <div className={`
                    relative z-20 w-full flex-shrink-0 flex flex-col
                    border-t lg:border-t-0 lg:border-l border-secondary-200/50 dark:border-secondary-700/50
                    bg-surface/95 dark:bg-black/80 backdrop-blur-xl lg:backdrop-blur-md lg:bg-secondary-50/90 lg:dark:bg-black/40
                    sticky bottom-0 lg:relative lg:w-[320px] lg:h-full
                `}>
                    {/* Gradient mask on mobile to smooth the transition if content scrolls behind */}
                    <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-surface/20 to-transparent pointer-events-none lg:hidden" />
                    
                    {rightContent}
                </div>
            )}
        </div>
    );
};

export default CardFrame;
