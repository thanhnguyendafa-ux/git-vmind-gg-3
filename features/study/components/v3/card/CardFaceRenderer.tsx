
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CardFaceDesign, Table, VocabRow, TypographyDesign, QuestionCard, DisplayTier, Relation, StudyMode } from '../../../../../types';
import ExpandableText from '../../../../../components/ui/ExpandableText';
import Icon from '../../../../../components/ui/Icon';
import { useAudioStore } from '../../../../../stores/useAudioStore';
import { resolveVariables } from '../../../../../utils/textUtils';
import { playSpeech, detectLanguageFromText } from '../../../../../services/audioService';
import { useUIStore } from '../../../../../stores/useUIStore';
import { DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY } from '../../../../tables/designConstants';
import { SmartTextarea, DesignerBlock, QuickInsertHandle } from '../../../../tables/components/RelationSettings/DesignComponents';
import { extractVideoID, extractStartTime, extractEndTime } from '../../../../../utils/youtubeUtils';

interface CardFaceRendererProps {
    face: 'front' | 'back';
    design: CardFaceDesign | undefined;
    table: Table | undefined;
    row: VocabRow | undefined;
    card: QuestionCard;
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
    relation?: Relation; // Optional, useful for advanced logic check
}

const CardFaceRenderer: React.FC<CardFaceRendererProps> = ({
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
    relation
}) => {
    const { theme } = useUIStore();
    const { playQueue, audioState } = useAudioStore();
    const [zoomedImgSrc, setZoomedImgSrc] = useState<string | null>(null);
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

    if (!design || !row || !table) return null;

    const elements = design.elementOrder || Object.keys(design.typography);

    // Detect if this is a Cloze System Block context
    // In Cloze mode (Typing/MCQ), the Front Face Question Column is the "System Block".
    // We check if `relation` is provided and if the current element is one of the question columns.
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
                    let contentNode = null;
                    let typography = defaultTypo;
                    let type: 'data' | 'label' | 'text' | 'divider' = 'data';
                    let elementColId = '';

                    const txtBox = design.textBoxes?.find(t => t.id === id);

                    // --- 1. Labels ---
                    if (id.startsWith('label-')) {
                        type = 'label';
                        const colId = id.replace('label-', '');
                        elementColId = colId;
                        const col = table.columns.find(c => c.id === colId);
                        if (col) {
                            typography = design.typography[id] || { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
                            contentNode = <div style={typography} className="w-full break-words whitespace-pre-wrap">{col.name}</div>;
                        }
                    }
                    // --- 2. Text Boxes & Dividers ---
                    else if (txtBox) {
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
                                    autoFocus={isDesignMode && id === selectedElementId}
                                />
                            );
                        } else {
                            const resolvedText = resolveVariables(txtBox.text, row, table.columns);
                            contentNode = (
                                <div className="flex items-start gap-2 w-full">
                                    <div style={typography} className="flex-1 min-w-0 break-words whitespace-pre-wrap">
                                        <ExpandableText text={resolvedText} typography={typography} />
                                    </div>
                                    {onPlayAudio && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const lang = detectLanguageFromText(resolvedText);
                                                onPlayAudio(resolvedText, '');
                                            }}
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
                    // --- 3. Data Columns ---
                    else {
                        type = 'data';
                        elementColId = id;
                        const col = table.columns.find(c => c.id === id);
                        if (col) {
                            const text = row.cols[id] || (isDesignMode ? `[${col.name} Data]` : '');
                            typography = design.typography[id] || defaultTypo;

                            const audioId = `${card.id}-${id}`; // Just for matching playing state
                            const isPlayingThis = currentAudioId === audioId;

                            const handlePlay = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (onPlayAudio && text) onPlayAudio(text, col.id);
                            };

                            const isImageColumn = table.imageConfig?.imageColumnId === col.id;
                            // NEW: Support multiple video columns via videoColumnIds array
                            const isVideoColumn = (table.videoColumnIds && table.videoColumnIds.includes(col.id)) || table.videoConfig?.videoColumnId === col.id;

                            if (isImageColumn && text && !isDesignMode) {
                                contentNode = (
                                    <div className="flex items-center gap-2 w-full justify-center">
                                        <div
                                            onClick={(e) => { e.stopPropagation(); setZoomedImgSrc(text); }}
                                            className="w-[35px] h-[35px] flex-shrink-0 cursor-zoom-in relative group bg-white dark:bg-black/20 rounded-md border border-secondary-200 dark:border-secondary-700 overflow-hidden shadow-sm"
                                        >
                                            <img
                                                src={text}
                                                alt="Content"
                                                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            {/* Fallback Icon */}
                                            <div className="absolute inset-0 flex items-center justify-center -z-10 text-secondary-300">
                                                <Icon name="photo" className="w-4 h-4" />
                                            </div>
                                        </div>
                                        {onPlayAudio && <button onClick={handlePlay} className={`p-2 rounded-full transition-colors flex-shrink-0 ${isPlayingThis ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}><Icon name={isPlayingThis ? "volume-up" : "volume-down"} className="w-4 h-4" /></button>}
                                    </div>
                                );
                            } else if (isVideoColumn && text && !isDesignMode) {
                                const videoId = extractVideoID(text);
                                const start = extractStartTime(text);
                                const end = extractEndTime(text);

                                // Import EmbeddedVideoPlayer at top
                                const EmbeddedVideoPlayer = React.lazy(() => import('./EmbeddedVideoPlayer'));

                                contentNode = (
                                    <React.Suspense fallback={
                                        <div className="w-full max-w-[200px] aspect-video bg-secondary-100 dark:bg-secondary-800 rounded-lg flex items-center justify-center">
                                            <Icon name="spinner" className="w-6 h-6 animate-spin text-secondary-400" />
                                        </div>
                                    }>
                                        <EmbeddedVideoPlayer
                                            videoId={videoId}
                                            startTime={start}
                                            endTime={end}
                                            isMobile={isMobile}
                                        />
                                    </React.Suspense>
                                );
                            } else {
                                contentNode = (
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="flex-1 min-w-0" style={typography}>
                                            <ExpandableText text={text} typography={typography} />
                                        </div>
                                        {onPlayAudio && text && !isDesignMode && (
                                            <button onClick={handlePlay} className={`p-2 rounded-full transition-colors flex-shrink-0 ${isPlayingThis ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/20' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}><Icon name={isPlayingThis ? "volume-up" : "volume-down"} className="w-4 h-4" /></button>
                                        )}

                                    </div>
                                );
                            }
                        }
                    }

                    if (contentNode === null) return null;

                    const isSelected = isDesignMode && id === selectedElementId;

                    // --- System Block Check ---
                    // Is this element part of the core question columns in Cloze Mode?
                    const isSystemBlock = isClozeMode && face === 'front' && relation?.questionColumnIds.includes(id);

                    // --- Wrap in DesignerBlock if editing ---
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
                                    onChangeType={
                                        (type === 'data' || type === 'label') && onChangeElementType && elementColId
                                            ? () => onChangeElementType(face, elementColId, type === 'data' ? 'label' : 'data')
                                            : undefined
                                    }
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

            {/* Lightbox Portal for Zoomed Media (Image or Video) */}
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
                    {(() => {
                        const videoId = extractVideoID(zoomedImgSrc);
                        if (videoId) {
                            const start = extractStartTime(zoomedImgSrc);
                            const end = extractEndTime(zoomedImgSrc);
                            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1${start ? `&start=${Math.floor(start)}` : ''}${end ? `&end=${Math.ceil(end)}` : ''}`;
                            return (
                                <div className="w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={embedUrl}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            );
                        }
                        return (
                            <img
                                src={zoomedImgSrc}
                                alt="Zoomed view"
                                className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm cursor-default"
                                onClick={(e) => e.stopPropagation()}
                            />
                        );
                    })()}
                    <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none px-4">
                        <span className="inline-block px-3 py-1 bg-black/50 text-white/80 text-xs rounded-full backdrop-blur-md font-mono max-w-full truncate">
                            {zoomedImgSrc}
                        </span>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default CardFaceRenderer;
