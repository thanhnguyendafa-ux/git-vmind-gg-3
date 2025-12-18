
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { QuestionCard, CardFaceDesign, VocabRow, Table, TypographyDesign, Relation } from '../../../../types';
import QuestionCardDesigner from './QuestionCardDesigner';
import QuestionCardPlayer from './QuestionCardPlayer';
import ExpandableText from '../../../../components/ui/ExpandableText';
import Icon from '../../../../components/ui/Icon';
import Popover from '../../../../components/ui/Popover';
import { useUIStore } from '../../../../stores/useUIStore';
import { DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY, UNIFIED_THEMES, applyThemeToRelation } from '../../../tables/designConstants';
import { useCardAudio } from '../../hooks/useCardAudio';
import CardPayloadRenderer from './card/CardPayloadRenderer';
import CardFace from './card/CardFace'; // Import CardFace for the Zoom View
import { useAudioStore } from '../../../../stores/useAudioStore';
import { detectLanguageFromText } from '../../../../services/audioService';

interface UnifiedQuestionCardProps {
  card: QuestionCard;
  onAnswer: (answer: any) => void;
  design?: CardFaceDesign;
  backDesign?: CardFaceDesign;
  row?: VocabRow;
  table?: Table;
  relation?: Relation;
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
  onViewInfo?: () => void;
  hideFlashcardButtons?: boolean;
  
  // Interaction Feedback (Optional support for visual feedback on the card itself)
  feedback?: 'correct' | 'incorrect' | null;
  userAnswer?: any;
  
  // V2.6: Magic Wand
  onRelationUpdate?: (newRelation: Relation) => Promise<void>;
}

const UnifiedQuestionCard: React.FC<UnifiedQuestionCardProps> = (props) => {
    const { theme, showToast } = useUIStore();
    const { playQueue, audioState } = useAudioStore();
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isZoomed, setIsZoomed] = useState(false);

    // Determine Active Theme for Interaction Styling
    const currentTheme = React.useMemo(() => {
        if (!props.design) return null;
        // Simple matching by background value (works for solid/gradient presets)
        return UNIFIED_THEMES.find(t => t.background.value === props.design?.backgroundValue);
    }, [props.design]);
    
    const themeButtonStyle = currentTheme?.interaction;

    // Handle Escape key to close zoom & Body Scroll Lock
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isZoomed) {
                setIsZoomed(false);
            }
        };

        if (isZoomed) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        } else {
            // Unlock body scroll
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isZoomed]);

    // Audio Handler for Zoom View
    const handleZoomPlayAudio = (text: string, colId: string) => {
        const lang = props.table?.columnAudioConfig?.[colId]?.language || detectLanguageFromText(text);
        const audioId = `${props.card.id}-${colId}`;
        playQueue([{ text, lang }], audioId);
    };
    
    // Magic Wand Handler
    const handleMagicWand = async () => {
        if (!props.relation || !props.onRelationUpdate) return;
        
        // Pick a random theme, excluding the current one if possible
        let availableThemes = UNIFIED_THEMES;
        if (currentTheme) {
            availableThemes = UNIFIED_THEMES.filter(t => t.id !== currentTheme.id);
        }
        
        if (availableThemes.length === 0) availableThemes = UNIFIED_THEMES;
        
        const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)];
        
        const newRelation = applyThemeToRelation(props.relation, randomTheme);
        
        // Optimistic UI update handled by parent via prop, but we can assume it works fast.
        await props.onRelationUpdate(newRelation);
        showToast(`Theme applied: ${randomTheme.name}`, 'success');
        setIsMenuOpen(false);
    };
    
    // Legacy support for non-designer questions (simple text mode)
    if (!props.design && !props.isDesignMode) {
        // We reuse the audio hook here for simple cards
        const { isPlaying, playSequence } = useCardAudio(props.card, props.table, props.row, props.relation);
        
        return (
            <div className="w-full flex flex-col items-center justify-center p-4 min-h-[50vh]">
                {props.card.content.image && (
                    <div className="w-full max-h-48 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
                        <img src={props.card.content.image} alt="Question" className="h-full object-contain" />
                    </div>
                )}
                <div className="text-center w-full relative group mb-6">
                    <div className="flex items-center justify-center gap-2">
                        <ExpandableText 
                            text={props.card.content.promptText} 
                            typography={{ ...defaultTypo, fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center' }} 
                        />
                        <button 
                            onClick={playSequence}
                            className={`p-2 rounded-full transition-colors ${isPlaying ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                            title="Play Audio"
                        >
                            <Icon name="volume-up" className="w-6 h-6" />
                        </button>
                    </div>
                    {props.card.content.answerLabel && (
                        <div className="mt-3">
                            <span className="font-mono text-sm text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-3 py-1 rounded-full opacity-90">
                                {props.card.content.answerLabel}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="w-full max-w-xl">
                     <CardPayloadRenderer 
                        card={props.card}
                        onAnswer={props.onAnswer}
                        onViewInfo={props.onViewInfo}
                        hideFlashcardButtons={props.hideFlashcardButtons}
                    />
                </div>
            </div>
        );
    }

    // Modern Designer-based Rendering
    if (props.isDesignMode) {
        return <QuestionCardDesigner {...props} />;
    }

    return (
        <div className="relative w-full">
            {/* Header Controls Overlay */}
            {!props.isDesignMode && (
                <div className="absolute top-2 right-2 z-40 flex items-center gap-1">
                     {/* Magic Wand (Theme Randomizer) */}
                     {props.onRelationUpdate && (
                        <button
                            onClick={handleMagicWand}
                            className="p-1.5 rounded-full text-text-subtle/50 hover:text-primary-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="Magic Theme"
                        >
                            <Icon name="sparkles" className="w-4 h-4" />
                        </button>
                    )}

                    {/* Zoom */}
                     <button
                        onClick={() => setIsZoomed(true)}
                        className="p-1.5 rounded-full text-text-subtle/50 hover:text-text-main hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Maximize Question"
                     >
                        <Icon name="arrows-pointing-out" className="w-4 h-4" />
                     </button>

                    {/* Menu */}
                    <Popover
                        isOpen={isMenuOpen}
                        setIsOpen={setIsMenuOpen}
                        trigger={
                            <button className="p-1.5 rounded-full text-text-subtle/50 hover:text-text-main hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                                <Icon name="dots-horizontal" className="w-4 h-4" />
                            </button>
                        }
                        contentClassName="w-40"
                    >
                        <div className="py-1">
                             {props.onEdit && (
                                <button onClick={() => { props.onEdit?.(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="pencil" className="w-3.5 h-3.5" /> Edit Data
                                </button>
                             )}
                             {props.onViewInfo && (
                                <button onClick={() => { props.onViewInfo?.(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2">
                                    <Icon name="file-text" className="w-3.5 h-3.5" /> Info
                                </button>
                             )}
                        </div>
                    </Popover>
                </div>
            )}
            
            <QuestionCardPlayer 
                {...props} 
                themeButtonStyle={themeButtonStyle}
                feedback={props.feedback}
                userAnswer={props.userAnswer}
            />
            
            {/* Zoom View Portal */}
            {isZoomed && createPortal(
                <div className="fixed inset-0 z-[100] bg-background dark:bg-secondary-900 flex flex-col p-4 animate-fadeIn overflow-hidden">
                    <button
                        onClick={() => setIsZoomed(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-secondary-100 dark:bg-secondary-800 hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-main dark:text-secondary-100 z-[101]"
                        title="Close Zoom"
                    >
                        <Icon name="x" className="w-6 h-6" />
                    </button>
                    
                    <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto hide-scrollbar pb-20">
                         <div className="w-full max-w-4xl p-6">
                            <CardFace
                                face="front"
                                design={props.design}
                                table={props.table}
                                row={props.row}
                                card={props.card}
                                isDesignMode={false}
                                onPlayAudio={handleZoomPlayAudio}
                                currentAudioId={null} 
                                isZoomed={true}
                            />
                         </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default UnifiedQuestionCard;
