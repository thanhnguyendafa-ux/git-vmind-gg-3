
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardFaceDesign, Table, VocabRow, TypographyDesign, QuestionCard, Relation, StudyMode } from '../../../../../types';
import ExpandableText from '../../../../../components/ui/ExpandableText';
import Icon from '../../../../../components/ui/Icon';
import { resolveVariables } from '../../../../../utils/textUtils';
import { useUIStore } from '../../../../../stores/useUIStore';
import { DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY } from '../../../../tables/designConstants';
import { SmartTextarea, DesignerBlock, QuickInsertHandle } from '../../../../tables/components/RelationSettings/DesignComponents';
import { playSpeech, detectLanguageFromText } from '../../../../../services/audioService';
import { useAudioStore } from '../../../../../stores/useAudioStore';
import { extractVideoID, extractStartTime, extractEndTime } from '../../../../../utils/youtubeUtils';

interface CardFaceProps {
    face: 'front' | 'back';
    design: CardFaceDesign | undefined;
    table: Table | undefined;
    row: VocabRow | undefined;
    isDesignMode: boolean;
    // Callbacks for interactivity (Audio/Image) are passed down, logic moved up
    onPlayAudio?: (text: string, colId: string) => void;
    currentAudioId?: string | null;
    // Design Mode Props
    isMobile?: boolean;
    selectedElementId?: string | null;
    onSelectElement?: (id: string) => void;
    onInsertElement?: (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => void;
    onUpdateElement?: (face: 'front' | 'back', id: string, updates: { typography?: Partial<TypographyDesign>; text?: string }) => void;
    onDeleteElement?: (face: 'front' | 'back', id: string) => void;
    onChangeElementType?: (face: 'front' | 'back', id: string, newType: 'data' | 'label') => void;
    card: QuestionCard;
    relation?: Relation;
    isZoomed?: boolean;
}

const IMAGE_EXT_REGEX = /\.(jpeg|jpg|gif|png|webp|bmp|svg)($|\?)/i;
const URL_CAPTURE_REGEX = /((?:https?:\/\/[^\s]+)|(?:data:image\/[a-zA-Z]+;base64,[^\s]+))/g;

const isImageUrl = (text: string) => {
    if (!text) return false;
    const clean = text.trim();
    if (clean.startsWith('data:image')) return true;
    return clean.startsWith('http') && IMAGE_EXT_REGEX.test(clean);
};

const CardFace: React.FC<CardFaceProps> = ({
    face,
    design,
    table,
    row,
    card,
    isDesignMode,
    onPlayAudio,
    currentAudioId,
    isMobile = false,
    selectedElementId,
    onSelectElement,
    onInsertElement,
    onUpdateElement,
    onDeleteElement,
    onChangeElementType,
    relation,
    isZoomed
}) => {
    const { theme } = useUIStore();
    const [zoomedImgSrc, setZoomedImgSrc] = useState<string | null>(null);
    const { playQueue, audioState } = useAudioStore();
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

    if (!design || !row || !table) return null;

    const elements = design.elementOrder || Object.keys(design.typography);

    // Detect Cloze Mode System Block
    const isClozeMode = relation && (relation.interactionModes?.includes(StudyMode.ClozeTyping) || relation.interactionModes?.includes(StudyMode.ClozeMCQ));

    // --- Empty State (Design Mode Only) ---
    if (elements.length === 0 && isDesignMode) {
        return (
            <div className="p-8 text-center border-2 border-dashed border-secondary-300 dark:border-secondary-700 rounded-lg w-full group relative hover:border-primary-500 transition-colors z-50 pointer-events-auto bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                <p className="text-text-subtle text-sm font-semibold">Empty Card Face</p>
                <p className="text-xs text-text-subtle mt-1">Click + to add elements</p>
                <div className="mt-4 flex justify-center">
                    {onInsertElement && <QuickInsertHandle index={0} onInsert={(idx, type, col) => onInsertElement(face, idx, type, col)} table={table} isFallback={true} isMobile={isMobile} className="relative z-[60]" />}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className={`flex flex-col w-full relative group/container ${design.layout === 'vertical' ? 'flex-col gap-2' : 'flex-row gap-4'}`}>

                {/* Top Drop Zone for Index 0 */}
                {isDesignMode && elements.length > 0 && onInsertElement && (
                    <div className="absolute -top-3 left-0 w-full h-4 z-40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center group/dropzone">
                        <div className="absolute inset-x-0 h-px bg-primary-500/50 group-hover/dropzone:bg-primary-500 transition-colors"></div>
                        <QuickInsertHandle
                            index={0}
                            onInsert={(idx, t, c) => onInsertElement(face, idx, t, c)}
                            table={table}
                            isMobile={isMobile}
                            className="relative z-[70]"
                        />
                    </div>
                )}

                {elements.map((id, index) => {
                    // Determined selection state early for conditional props
                    const isSelected = isDesignMode && id === selectedElementId;

                    let contentNode = null;
                    let typography = defaultTypo;
                    let type: 'data' | 'label' | 'text' | 'divider' = 'data';
                    let elementColId = '';

                    const txtBox = design.textBoxes?.find(t => t.id === id);

                    if (id.startsWith('label-')) {
                        type = 'label';
                        const colId = id.replace('label-', '');
                        elementColId = colId;
                        const col = table.columns.find(c => c.id === colId);
                        if (col) {
                            typography = design.typography[id] || { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
                            contentNode = <div style={typography} className="w-full break-words whitespace-pre-wrap">{col.name}</div>;
                        }
                    } else if (txtBox) {
                        type = txtBox.id.startsWith('txt-divider-') ? 'divider' : 'text';
                        typography = txtBox.typography;

                        if (type === 'divider') {
                            contentNode = <div className="py-2 w-full"><hr className="border-secondary-300 dark:border-secondary-600" /></div>;
                        } else if (isDesignMode) {
                            contentNode = (
                                <SmartTextarea
                                    value={txtBox.text}
                                    onChange={(val) => onUpdateElement?.(face, id, { text: val })}
                                    typography={typography}
                                    table={table}
                                    autoFocus={isSelected}
                                />
                            );
                        } else {
                            const resolvedText = resolveVariables(txtBox.text, row, table.columns);

                            // Check for mixed content (Images in text)
                            const parts = resolvedText.split(URL_CAPTURE_REGEX);
                            const hasImage = parts.some(p => isImageUrl(p));

                            if (hasImage) {
                                contentNode = (
                                    <div className="flex flex-col gap-2 w-full items-center">
                                        {parts.map((part, i) => {
                                            if (isImageUrl(part)) {
                                                return (
                                                    <div
                                                        key={i}
                                                        onClick={(e) => { e.stopPropagation(); setZoomedImgSrc(part); }}
                                                        className="relative max-w-full cursor-zoom-in group"
                                                    >
                                                        <img
                                                            src={part}
                                                            alt="Content"
                                                            className={`${isZoomed ? 'max-h-[80vh] w-auto' : 'max-h-60 w-auto'} object-contain rounded-md shadow-sm border border-secondary-200 dark:border-secondary-700`}
                                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        />
                                                    </div>
                                                );
                                            }
                                            if (!part.trim()) return null;
                                            return (
                                                <div key={i} style={typography} className="w-full break-words whitespace-pre-wrap">
                                                    <ExpandableText text={part} typography={typography} isZoomed={isZoomed} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            } else {
                                contentNode = (
                                    <div className="flex items-start gap-2 w-full">
                                        <div style={typography} className="flex-1 min-w-0 break-words whitespace-pre-wrap">
                                            <ExpandableText text={resolvedText} typography={typography} isZoomed={isZoomed} />
                                        </div>
                                        {onPlayAudio && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onPlayAudio(resolvedText, ''); }}
                                                className="p-1.5 rounded-full text-text-subtle hover:text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors flex-shrink-0 mt-0.5"
                                                title="Read Aloud"
                                            >
                                                <Icon name="volume-up" className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            }
                        }
                    } else {
                        type = 'data';
                        elementColId = id;
                        const col = table.columns.find(c => c.id === id);
                        if (col) {
                            const text = row.cols[id] || (isDesignMode ? `[${col.name} Data]` : '');
                            typography = design.typography[id] || defaultTypo;

                            // Audio Logic: Check Config -> Fallback to Auto-detect
                            const audioConfigForCol = table.columnAudioConfig?.[col.id];
                            const canPlayAudio = text && !isDesignMode;
                            const audioId = `${card.id}-${id}`;
                            const isPlayingThis = audioState.playingId === audioId;

                            const handlePlay = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (onPlayAudio && text) onPlayAudio(text, col.id);
                            };

                            // Image Logic: Configured OR Detected
                            const isConfiguredImage = table.imageConfig?.imageColumnId === col.id;
                            const looksLikeImage = isImageUrl(text);
                            const shouldRenderImage = (isConfiguredImage || looksLikeImage) && text && !isDesignMode;

                            if (shouldRenderImage) {
                                contentNode = (
                                    <div className="flex items-center gap-2 w-full justify-center">
                                        <div
                                            onClick={(e) => { e.stopPropagation(); setZoomedImgSrc(text); }}
                                            className={`${isZoomed ? 'w-full h-auto' : 'w-[35px] h-[35px]'} flex-shrink-0 cursor-zoom-in relative group bg-white dark:bg-black/20 rounded-md border border-secondary-200 dark:border-secondary-700 overflow-hidden shadow-sm`}
                                        >
                                            <img
                                                src={text}
                                                alt="Content"
                                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                                onError={(e) => {
                                                    // Hide broken image container
                                                    e.currentTarget.style.display = 'none';
                                                    // In a real app we might want to unmount or show text fallback here
                                                }}
                                            />
                                            {/* Fallback Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center -z-10 text-secondary-300">
                                                <Icon name="photo" className="w-4 h-4" />
                                            </div>
                                        </div>
                                        {canPlayAudio && (
                                            <button
                                                onClick={handlePlay}
                                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${isPlayingThis ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                                                title="Play Audio"
                                            >
                                                <Icon name={isPlayingThis ? "volume-up" : "volume-down"} className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                );
                            } else {
                                // Video Logic
                                const isConfiguredVideo = table.videoConfig?.videoColumnId === col.id;
                                const videoId = extractVideoID(text);
                                const shouldRenderVideo = (isConfiguredVideo || videoId) && text && !isDesignMode;

                                if (shouldRenderVideo && videoId) {
                                    contentNode = (
                                        <div className="flex flex-col items-center gap-3 w-full">
                                            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-secondary-200 dark:border-secondary-700 bg-black relative">
                                                {(() => {
                                                    const start = extractStartTime(text);
                                                    const end = extractEndTime(text);
                                                    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0${start ? `&start=${Math.floor(start)}` : ''}${end ? `&end=${Math.ceil(end)}` : ''}`;
                                                    return (
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            src={embedUrl}
                                                            title="YouTube video player"
                                                            frameBorder="0"
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                            allowFullScreen
                                                        ></iframe>
                                                    );
                                                })()}
                                            </div>
                                            {canPlayAudio && (
                                                <button
                                                    onClick={handlePlay}
                                                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${isPlayingThis ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                                                    title="Play Audio"
                                                >
                                                    <Icon name={isPlayingThis ? "volume-up" : "volume-down"} className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                } else {
                                    contentNode = (
                                        <div className="flex items-center gap-2 w-full">
                                            <div className="flex-1 min-w-0" style={typography}>
                                                <ExpandableText text={text} typography={typography} isZoomed={isZoomed} />
                                            </div>
                                            {canPlayAudio && (
                                                <button
                                                    onClick={handlePlay}
                                                    className={`p-2 rounded-full transition-colors flex-shrink-0 ${isPlayingThis ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                                                    title="Play Audio"
                                                >
                                                    <Icon name={isPlayingThis ? "volume-up" : "volume-down"} className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                            }
                        }
                    }

                    if (contentNode === null) return null;

                    // --- System Block Check ---
                    // Is this element part of the core question columns in Cloze Mode?
                    const isSystemBlock = isClozeMode && face === 'front' && relation?.questionColumnIds.includes(id);

                    if (isDesignMode) {
                        return (
                            <div key={id} className="relative group/block pl-4">
                                {onInsertElement && <QuickInsertHandle index={index + 1} onInsert={(idx, t, c) => onInsertElement(face, idx, t, c)} table={table} isMobile={isMobile} />}
                                <DesignerBlock
                                    id={id}
                                    isSelected={isSelected || false}
                                    onSelect={() => onSelectElement?.(id)}
                                    typography={typography}
                                    onUpdate={(updates) => onUpdateElement?.(face, id, updates)}
                                    onDelete={() => onDeleteElement?.(face, id)}
                                    type={type}
                                    onChangeType={(type === 'data' || type === 'label') && onChangeElementType && elementColId ? () => onChangeElementType(face, elementColId, type === 'data' ? 'label' : 'data') : undefined}
                                    index={index}
                                    isMobile={isMobile}
                                    isLocked={isSystemBlock}
                                >
                                    {contentNode}
                                </DesignerBlock>
                            </div>
                        );
                    }
                    return <div key={id} className="w-full">{contentNode}</div>;
                })}
            </div>

            {/* Lightbox Portal for Zoomed Image */}
            {zoomedImgSrc && createPortal(
                <div
                    className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
                    onClick={(e) => { e.stopPropagation(); setZoomedImgSrc(null); }}
                >
                    <button
                        onClick={(e) => { e.stopPropagation(); setZoomedImgSrc(null); }}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-[101]"
                    >
                        <Icon name="x" className="w-8 h-8" />
                    </button>
                    <img
                        src={zoomedImgSrc}
                        alt="Zoomed view"
                        className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm cursor-default"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>,
                document.body
            )}
        </>
    );
};

export default CardFace;
