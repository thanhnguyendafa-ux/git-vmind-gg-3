
import React, { useState, useRef, useEffect } from 'react';
import { QuestionCard, McqPayload, TrueFalsePayload, TypingPayload, ScramblePayload, CardFaceDesign, VocabRow, Table, TypographyDesign, TextBox, FlashcardPayload } from '../../../../types';
import ExpandableText from '../../../../components/ui/ExpandableText';
import Icon from '../../../../components/ui/Icon';
import Popover from '../../../../components/ui/Popover';
import { useUIStore } from '../../../../stores/useUIStore';
import { useAudioStore } from '../../../../stores/useAudioStore';
import { DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../../../tables/designConstants';
import { resolveVariables } from '../../../../utils/textUtils';
import { Button } from '../../../../components/ui/Button';

// Import V3 Layouts
import McqLayout from './McqLayout';
import TrueFalseLayout from './TrueFalseLayout';
import TypingLayout from './TypingLayout';
import ScrambleLayout from './ScrambleLayout';

interface UnifiedQuestionCardProps {
  card: QuestionCard;
  onAnswer: (answer: any) => void;
  design?: CardFaceDesign;
  backDesign?: CardFaceDesign;
  row?: VocabRow;
  table?: Table;
  isDesignMode?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (id: string) => void;
  onInsertElement?: (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
  onUpdateElement?: (face: 'front' | 'back', id: string, updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
  onDeleteElement?: (face: 'front' | 'back', id: string) => void;
  onChangeElementType?: (face: 'front' | 'back', id: string, newType: 'data' | 'label') => void;
}

// --- Helper Constants ---
const FONT_SIZES = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '3rem'];

// --- Components ---

const SmartTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    typography: TypographyDesign;
    table?: Table;
    onBlur?: () => void;
}> = ({ value, onChange, typography, table, onBlur }) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cursorIndex, setCursorIndex] = useState<number | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChange(val);

        if (val.slice(pos - 1, pos) === '{') {
            setCursorIndex(pos);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const insertVariable = (colName: string) => {
        if (cursorIndex === null) return;
        const before = value.slice(0, cursorIndex); 
        const after = value.slice(cursorIndex);
        const newVal = before + colName + '}' + after;
        onChange(newVal);
        setShowSuggestions(false);
        setTimeout(() => textareaRef.current?.focus(), 0);
    };

    return (
        <div className="relative w-full pointer-events-auto z-20">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onBlur={onBlur}
                style={{ ...typography, width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', minHeight: '1.5em' }}
                placeholder="Type text... use '{' for variables"
                className="focus:ring-0 p-0 m-0 whitespace-pre-wrap break-words"
            />
            {showSuggestions && table && (
                <div className="absolute z-50 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-xl rounded-lg p-1 w-48 max-h-48 overflow-y-auto top-full left-0 mt-1">
                    <p className="text-xs text-text-subtle px-2 py-1 font-semibold">Insert Variable</p>
                    {table.columns.map(col => (
                        <button
                            key={col.id}
                            onMouseDown={(e) => { e.preventDefault(); insertVariable(col.name); }}
                            className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2"
                        >
                            <Icon name="table-cells" className="w-3 h-3 text-primary-500" />
                            {col.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Floating handle for inserting blocks. High Z-Index.
const QuickInsertHandle: React.FC<{
    index: number;
    onInsert: (index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
    table?: Table;
    isFallback?: boolean; // Only for empty state
    isMobile?: boolean;
}> = ({ index, onInsert, table, isFallback, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className={`absolute z-50 ${isFallback ? 'relative inline-block z-10' : `top-1/2 -translate-y-1/2 ${isMobile ? '-left-5' : 'left-2'}`}`}>
             <Popover
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                trigger={
                    <button 
                        className={`
                            flex items-center justify-center 
                            bg-primary-500 text-white shadow-md hover:scale-110 transition-transform
                            ${isFallback 
                                ? 'w-8 h-8 rounded-full animate-pulse' 
                                : 'w-5 h-5 rounded-full -translate-x-1/2 opacity-100 lg:opacity-0 lg:group-hover/block:opacity-100'
                            }
                        `}
                        title="Insert Block"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <Icon name="plus" className={isFallback ? "w-5 h-5" : "w-3 h-3"} />
                    </button>
                }
                contentClassName="w-60 z-[60]"
            >
                <div className="p-1 space-y-1 max-h-72 overflow-y-auto">
                    {/* Basic Blocks */}
                    <button onClick={() => { onInsert(index, 'text'); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                        <Icon name="file-text" className="w-4 h-4 text-text-subtle"/> Text Block
                    </button>
                    <button onClick={() => { onInsert(index, 'divider'); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                        <Icon name="minus" className="w-4 h-4 text-text-subtle"/> Divider
                    </button>

                    {table && table.columns.length > 0 && (
                        <>
                            <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1" />
                            <p className="text-[10px] font-bold text-text-subtle uppercase px-2 py-1">Inline Rows</p>
                            {table.columns.map(col => (
                                <button key={`inline-${col.id}`} onClick={() => { onInsert(index, 'inline_composite', col.id); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="table-cells" className="w-4 h-4 text-success-500"/>
                                    <span><strong>{col.name}:</strong> [Data]</span>
                                </button>
                            ))}
                            <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-1" />
                            <p className="text-[10px] font-bold text-text-subtle uppercase px-2 py-1">Single Fields</p>
                            {table.columns.map(col => (
                                <button key={`data-${col.id}`} onClick={() => { onInsert(index, 'data', col.id); setIsOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="tag" className="w-4 h-4 text-primary-500"/> Data: {col.name}
                                </button>
                            ))}
                        </>
                    )}
                </div>
            </Popover>
        </div>
    );
};

const DesignerBlock: React.FC<{
    id: string;
    isSelected: boolean;
    onSelect: () => void;
    children: React.ReactNode;
    typography: TypographyDesign;
    onUpdate: (updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
    onDelete: () => void;
    type: 'data' | 'label' | 'text' | 'divider';
    onChangeType?: () => void;
    index: number;
    isMobile: boolean;
}> = ({ id, isSelected, onSelect, children, typography, onUpdate, onDelete, type, onChangeType, index, isMobile }) => {

    const changeFontSize = (direction: 'up' | 'down') => {
        const FONT_SIZES = ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem', '3rem'];
        
        const currentIndex = FONT_SIZES.indexOf(typography.fontSize);
        let nextIndex = currentIndex;
        if (direction === 'up') nextIndex = Math.min(currentIndex + 1, FONT_SIZES.length - 1);
        else nextIndex = Math.max(currentIndex - 1, 0);
        
        if (currentIndex === -1) nextIndex = direction === 'up' ? 2 : 1; 
        
        onUpdate({ typography: { fontSize: FONT_SIZES[nextIndex] } });
    };

    const toggleStyle = (key: 'fontWeight' | 'fontStyle', onVal: string, offVal: string) => {
        onUpdate({ typography: { [key]: typography[key] === onVal ? offVal : onVal } });
    };
    
    const setAlign = (align: 'left' | 'center' | 'right') => {
        onUpdate({ typography: { textAlign: align } });
    };

    // Smart positioning to prevent clipping at the top of the card
    const menuPositionClass = (isMobile && index === 0) 
        ? 'top-full mt-2' // Below block
        : '-top-9';       // Above block (default)

    return (
        <div 
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className={`group/block relative w-full min-h-[1.5rem] py-0.5 transition-all cursor-pointer border border-transparent hover:border-primary-200/50 dark:hover:border-primary-800/50 ${isSelected ? 'bg-primary-50/30 dark:bg-primary-900/10 ring-1 ring-primary-500 z-30' : 'z-10'}`}
        >
             {/* Floating Action Menu - High Z-Index */}
             {isSelected && type !== 'divider' && (
                <div className={`absolute ${menuPositionClass} right-0 z-50 flex items-center gap-0.5 p-0.5 bg-surface dark:bg-secondary-800 text-text-main dark:text-white rounded-md shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-scale-in pointer-events-auto overflow-x-auto max-w-[95vw]`}>
                    <button onClick={() => changeFontSize('down')} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"><span className="text-xs font-bold">A-</span></button>
                    <button onClick={() => changeFontSize('up')} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded"><span className="text-sm font-bold">A+</span></button>
                    <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                    <button onClick={() => toggleStyle('fontWeight', 'bold', 'normal')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.fontWeight === 'bold' ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}><span className="font-bold text-xs">B</span></button>
                    <button onClick={() => toggleStyle('fontStyle', 'italic', 'normal')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.fontStyle === 'italic' ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}><span className="italic text-xs">I</span></button>
                    <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                    <button onClick={() => setAlign('left')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.textAlign === 'left' ? 'text-primary-500' : ''}`}><Icon name="align-left" className="w-3.5 h-3.5 md:w-3 md:h-3" /></button>
                    <button onClick={() => setAlign('center')} className={`p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded ${typography.textAlign === 'center' ? 'text-primary-500' : ''}`}><Icon name="align-center" className="w-3.5 h-3.5 md:w-3 md:h-3" /></button>
                    
                    {onChangeType && (
                         <>
                            <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                            <button onClick={onChangeType} className="p-1 md:p-1.5 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded" title="Switch Data/Label">
                                <Icon name="arrows-right-left" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </button>
                         </>
                    )}
                    
                    <div className="w-px h-3 bg-secondary-300 dark:bg-secondary-600 mx-0.5" />
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1 md:p-1.5 hover:bg-error-50 dark:hover:bg-error-900/20 rounded text-error-500">
                        <Icon name="trash" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                    </button>
                </div>
            )}
            {isSelected && type === 'divider' && (
                 <div className={`absolute ${menuPositionClass} right-0 z-50 flex items-center gap-0.5 p-0.5 bg-surface dark:bg-secondary-800 text-text-main dark:text-white rounded-md shadow-lg border border-secondary-200 dark:border-secondary-700 animate-fade-scale-in pointer-events-auto`}>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 hover:bg-error-50 dark:hover:bg-error-900/20 rounded text-error-500">
                        <Icon name="trash" className="w-3.5 h-3.5 md:w-3 md:h-3" />
                    </button>
                </div>
            )}
            
            {/* The Content */}
            {children}
            
            {/* Insert Indicator (Pass-through for handle component) */}
            <div className="absolute inset-x-0 bottom-0 h-0 group-hover/block:border-b-2 group-hover/block:border-primary-500/30 pointer-events-none" />
        </div>
    );
}


const UnifiedQuestionCard: React.FC<UnifiedQuestionCardProps> = ({ 
  card, 
  onAnswer, 
  design,
  backDesign,
  row, 
  table,
  isDesignMode = false,
  selectedElementId,
  onSelectElement,
  onInsertElement,
  onUpdateElement,
  onDeleteElement,
  onChangeElementType
}) => {
  const { theme } = useUIStore();
  const { playQueue, audioState } = useAudioStore();
  const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
  const [isRevealed, setIsRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      setIsRevealed(false);
  }, [card.id]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePlayAudio = () => {
      const textToPlay = card.content.promptText;
      if (textToPlay) {
          playQueue([{ text: textToPlay, lang: 'en-US' }], card.id);
      }
  };

  // Reusable helper to render any card face based on design config
  const renderFaceContent = (faceDesign: CardFaceDesign | undefined, face: 'front' | 'back') => {
    if (faceDesign && row && table) {
        const elements = faceDesign.elementOrder || Object.keys(faceDesign.typography);
        
        if (elements.length === 0 && isDesignMode) {
             return (
                 <div className="p-8 text-center border-2 border-dashed border-secondary-300 dark:border-secondary-700 rounded-lg w-full group relative hover:border-primary-500 transition-colors z-20 pointer-events-auto">
                     <p className="text-text-subtle text-sm font-semibold">Empty Card Face</p>
                     <p className="text-xs text-text-subtle mt-1">Click + to add elements</p>
                     <div className="mt-4 flex justify-center">
                         {/* Use face-specific insertion */}
                         {onInsertElement && <QuickInsertHandle index={0} onInsert={(idx, type, col) => onInsertElement(face, idx, type, col)} table={table} isFallback={true} isMobile={isMobile} />}
                     </div>
                 </div>
             )
        }

        return (
            <div className={`flex flex-col w-full relative group/container ${faceDesign.layout === 'horizontal' ? 'flex-row' : ''} z-10`}>
                 {elements.map((id, index) => {
                    let contentNode = null;
                    let typography = defaultTypo;
                    let type: 'data' | 'label' | 'text' | 'divider' = 'data';
                    let elementColId = '';
                    
                    const txtBox = faceDesign.textBoxes?.find(t => t.id === id);

                    if (id.startsWith('label-')) {
                         type = 'label';
                         const colId = id.replace('label-', '');
                         elementColId = colId;
                         const col = table.columns.find(c => c.id === colId);
                         if (col) {
                             typography = faceDesign.typography[id] || { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
                             contentNode = <div style={typography} className="w-full break-words whitespace-pre-wrap">{col.name}</div>;
                         }
                    } else if (txtBox) {
                        type = txtBox.id.startsWith('txt-divider-') ? 'divider' : 'text';
                        typography = txtBox.typography;
                        if (type === 'divider') {
                            contentNode = <div className="py-2 w-full"><hr className="border-secondary-300 dark:border-secondary-600"/></div>;
                        } else if (isDesignMode) {
                            contentNode = (
                                <SmartTextarea 
                                    value={txtBox.text} 
                                    onChange={(val) => onUpdateElement?.(face, id, { text: val })}
                                    typography={typography}
                                    table={table}
                                />
                            );
                        } else {
                            contentNode = (
                                <div style={typography} className="w-full break-words whitespace-pre-wrap">
                                    <ExpandableText text={resolveVariables(txtBox.text, row, table.columns)} typography={typography} />
                                </div>
                            );
                        }
                    }
                    else {
                        type = 'data';
                        elementColId = id;
                        const col = table.columns.find(c => c.id === id);
                        if (col) {
                            const content = row.cols[id] || (isDesignMode ? `[${col.name} Data]` : ''); 
                            typography = faceDesign.typography[id] || defaultTypo;
                            contentNode = <div style={typography} className="w-full break-words whitespace-pre-wrap"><ExpandableText text={content} typography={typography} /></div>;
                        }
                    }

                    if (contentNode === null) return null;

                    const isSelected = isDesignMode && id === selectedElementId;

                    return (
                        <React.Fragment key={id}>
                            {isDesignMode ? (
                                <div className="relative group/block pl-4">
                                     {/* Floating Insert Button attached to the block */}
                                    {onInsertElement && <QuickInsertHandle index={index + 1} onInsert={(idx, t, c) => onInsertElement(face, idx, t, c)} table={table} isMobile={isMobile} />}
                                    
                                    <DesignerBlock
                                        id={id}
                                        isSelected={isSelected}
                                        onSelect={() => onSelectElement?.(id)}
                                        typography={typography}
                                        onUpdate={(updates) => onUpdateElement?.(face, id, updates)}
                                        onDelete={() => onDeleteElement?.(face, id)}
                                        type={type}
                                        onChangeType={
                                            (type === 'data' || type === 'label') && onChangeElementType && elementColId 
                                                ? () => onChangeElementType(face, elementColId, type === 'data' ? 'label' : 'data') 
                                                : undefined
                                        }
                                        index={index}
                                        isMobile={isMobile}
                                    >
                                        {contentNode}
                                    </DesignerBlock>
                                </div>
                            ) : (
                                <div className="w-full">{contentNode}</div>
                            )}
                        </React.Fragment>
                    );
                 })}
            </div>
        );
    }

    // Fallback legacy rendering
    const isPlaying = audioState.playingId === card.id && audioState.status === 'playing';
    const text = card.content.promptText;

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
                    text={text} 
                    typography={{ ...defaultTypo, fontSize: '1.25rem', fontWeight: 'bold', textAlign: 'center' }} 
                />
                 <button 
                    onClick={handlePlayAudio}
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
      </div>
    );
  };

  // Render Payload (Interactive Part)
  const renderPayload = () => {
    const handleInteraction = (val: any) => {
        if (!isDesignMode) {
            onAnswer(val);
        }
    };

    switch (card.type) {
      case 'mcq':
        const mcqData = card.payload as McqPayload;
        return <McqLayout options={mcqData.options} onSelect={handleInteraction} />;
      case 'truefalse':
        const tfData = card.payload as TrueFalsePayload;
        return <TrueFalseLayout statement={tfData.displayStatement} onSelect={handleInteraction} />;
      case 'typing':
        const typingData = card.payload as TypingPayload;
        return <TypingLayout hint={typingData.hint} onSubmit={handleInteraction} />;
      case 'scramble':
        const scrambleData = card.payload as ScramblePayload;
        return <ScrambleLayout segments={scrambleData.segments} onAnswer={handleInteraction} />;
      default:
        return <div className="text-error-500">Unsupported question type: {card.type}</div>;
    }
  };
  
  const background = design?.backgroundType === 'image' 
      ? `url("${design.backgroundValue}") center/cover no-repeat`
      : (design?.backgroundType === 'gradient' && design.backgroundValue.includes(',') 
          ? `linear-gradient(${design.gradientAngle}deg, ${design.backgroundValue.split(',')[0]}, ${design.backgroundValue.split(',')[1]})`
          : design?.backgroundValue);

  // --- Split View Logic for Flashcards ---
  if (card.type === 'flashcard') {
    const flashcardPayload = card.payload as FlashcardPayload;
    return (
        <div className="flex flex-col lg:flex-row w-full h-full lg:h-[600px] bg-surface dark:bg-secondary-800 rounded-xl shadow-xl overflow-hidden border border-secondary-200 dark:border-secondary-700">
            {/* Question Area (2/3) */}
            <div className="flex-[2] relative p-6 flex flex-col justify-center items-center border-b lg:border-b-0 lg:border-r border-dashed border-secondary-300 dark:border-secondary-600 bg-surface dark:bg-secondary-800/50">
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background }} />
                <div className="relative z-10 w-full flex-1 overflow-y-auto flex flex-col justify-center">
                    {/* Pass 'front' to renderFaceContent */}
                    {renderFaceContent(design, 'front')}
                </div>
            </div>

            {/* Answer Area (1/3) */}
            <div className="flex-1 relative bg-secondary-50 dark:bg-secondary-900/50 flex flex-col">
                {!isRevealed && !isDesignMode ? (
                    <button 
                        onClick={() => setIsRevealed(true)}
                        className="absolute inset-0 w-full h-full flex items-center justify-center bg-secondary-100/50 dark:bg-black/20 hover:bg-secondary-200/50 dark:hover:bg-black/40 transition-colors z-20 cursor-pointer group"
                    >
                        <div className="text-center">
                             <Icon name="eye" className="w-8 h-8 mx-auto mb-2 text-secondary-400 group-hover:text-primary-500 transition-colors" />
                             <span className="text-sm font-bold text-secondary-500 group-hover:text-primary-500 transition-colors">Tap to Show</span>
                        </div>
                    </button>
                ) : (
                    <div className="flex-1 flex flex-col animate-fadeIn h-full">
                         <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-center items-center text-center">
                             {/* Render Back Face Content with 'back' parameter */}
                             {renderFaceContent(backDesign, 'back')}
                         </div>
                         
                         {/* Action Bar - Sticky Bottom */}
                         <div className="p-3 border-t border-secondary-200 dark:border-secondary-700 bg-surface dark:bg-secondary-800 flex justify-center gap-2 z-30">
                             <Button variant="secondary" size="sm" className="text-error-600" onClick={() => onAnswer(false)}>Incorrect</Button>
                             <Button variant="primary" size="sm" className="bg-success-600 hover:bg-success-700 text-white" onClick={() => onAnswer(true)}>Correct</Button>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
  }
  
  const handleContainerClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDesignMode && onSelectElement) {
          // Deselect when clicking background
          // We pass empty string or null to signify no selection, typically
          onSelectElement('');
      }
  }

  return (
    <div 
        className={`
            relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center 
            min-h-[300px] lg:min-h-[400px]
            rounded-2xl shadow-xl overflow-hidden transition-all duration-300 
            ${isDesignMode ? 'cursor-default' : ''}
            ${isDesignMode ? 'border-2 border-dashed border-secondary-300 dark:border-secondary-600' : 'border border-secondary-200/80 dark:border-secondary-700/50'}
        `}
        onClick={handleContainerClick}
    >
        {/* Layer 0: Background */}
        <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ 
                background: isDesignMode 
                    ? 'repeating-linear-gradient(45deg, #f8fafc 0px, #f8fafc 10px, #f1f5f9 10px, #f1f5f9 20px)' // Blueprint Pattern
                    : background 
            }} 
        />

        {/* Layer 10: Content */}
        <div className="relative z-10 w-full flex flex-col h-full p-4 sm:p-6">
            <div className="flex-1 flex flex-col justify-center w-full overflow-y-auto hide-scrollbar">
                {/* Pass 'front' for standard single-column layout */}
                {renderFaceContent(design, 'front')}
            </div>
            <div className={`w-full mt-auto pt-4 ${isDesignMode ? 'pointer-events-none opacity-50 grayscale' : ''}`}>
                {renderPayload()}
            </div>
        </div>
    </div>
  );
};

export default UnifiedQuestionCard;
