
import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TextChunk } from '../../../utils/textChunker';
import ReadingParagraph from './ReadingParagraph';
import { ReadingThemeMode } from '../readingConstants';
import { Bookmark } from '../../../types';

interface VirtualReadingContainerProps {
    chunks: TextChunk[];
    wordsToHighlight: Set<string>;
    onWordClick: (index: number, e: React.MouseEvent<HTMLSpanElement>, word: string) => void;
    phraseSelection: { start: number | null, end: number | null };
    isPhraseMode: boolean;
    initialScrollOffset?: number;
    onScroll: (offset: number) => void;
    targetCharIndex?: number | null; // For deep linking
    scrollRef: React.RefObject<HTMLDivElement>;
    fontClass: string;
    fontSize: number;
    themeMode: ReadingThemeMode;
    bookmarks: Bookmark[]; // New prop
}

const VirtualReadingContainer: React.FC<VirtualReadingContainerProps> = ({
    chunks,
    wordsToHighlight,
    onWordClick,
    phraseSelection,
    isPhraseMode,
    initialScrollOffset = 0,
    onScroll,
    targetCharIndex,
    scrollRef,
    fontClass,
    fontSize,
    themeMode = 'default',
    bookmarks
}) => {
    // The scroll container is passed from parent (ReadingContent) via ref
    
    const rowVirtualizer = useVirtualizer({
        count: chunks.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 50, // Estimate paragraph height
        overscan: 5,
        initialOffset: initialScrollOffset
    });

    // Handle Scroll Events
    React.useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;
        
        const handleScroll = () => {
            onScroll(element.scrollTop);
        };
        
        element.addEventListener('scroll', handleScroll);
        return () => element.removeEventListener('scroll', handleScroll);
    }, [scrollRef, onScroll]);

    // Re-measure when font size changes to prevent layout overlap/gaps
    React.useEffect(() => {
        rowVirtualizer.measure();
    }, [fontSize, rowVirtualizer]);

    // 1. Calculate Target Token Index based on Character Index (Deep Linking)
    const targetTokenIndex = React.useMemo(() => {
        if (typeof targetCharIndex !== 'number' || chunks.length === 0) return null;
        
        const chunk = chunks.find(c => 
            c.globalStartIndex <= targetCharIndex && 
            (c.globalStartIndex + c.text.length) > targetCharIndex
        );
        
        if (!chunk) return null;

        let charCount = chunk.globalStartIndex;
        for (let i = 0; i < chunk.tokens.length; i++) {
            const tokenLen = chunk.tokens[i].length;
            // Check if target index falls within this token's range
            if (targetCharIndex >= charCount && targetCharIndex < charCount + tokenLen) {
                return chunk.globalWordIndex + i;
            }
            charCount += tokenLen;
        }
        return null;
    }, [targetCharIndex, chunks]);

    // 2. Two-Phase Scroll Logic (Macro -> Micro)
    React.useEffect(() => {
        if (targetTokenIndex !== null && chunks.length > 0) {
            // Find the chunk containing the token
            const chunkIndex = chunks.findIndex(c => 
                targetTokenIndex >= c.globalWordIndex && 
                targetTokenIndex < (c.globalWordIndex + c.tokens.length)
            );

            if (chunkIndex !== -1) {
                // Phase 1: Macro Scroll (Virtualizer)
                rowVirtualizer.scrollToIndex(chunkIndex, { align: 'center' });
                
                // Phase 2: Micro Scroll (DOM Target)
                // Use a retrying mechanism to wait for Virtualizer to render the DOM node
                const attemptScroll = (attempts: number) => {
                    const domId = `word-${targetTokenIndex}`;
                    const element = document.getElementById(domId);
                    
                    if (element) {
                         element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                         // Add a temporary highlight class
                         element.classList.add('ring-2', 'ring-offset-2', 'ring-yellow-500', 'rounded-sm');
                         setTimeout(() => {
                             element.classList.remove('ring-2', 'ring-offset-2', 'ring-yellow-500', 'rounded-sm');
                         }, 2000);
                    } else if (attempts > 0) {
                        setTimeout(() => attemptScroll(attempts - 1), 100);
                    }
                };
                attemptScroll(10);
            }
        }
    }, [targetTokenIndex, chunks, rowVirtualizer]);


    const proseClasses: Record<ReadingThemeMode, string> = {
        default: 'prose dark:prose-invert',
        paper: 'prose-paper',
        clean: 'prose-clean',
        night: 'prose-night',
    };
    
    // Custom prose styles for themes
    const proseStyle = `
        .prose-paper { color: #4A3C31; }
        .prose-clean { color: #333333; }
        .prose-night { color: #D1D1D6; }
    `;
    
    return (
        <>
            <style>{proseStyle}</style>
            <div
                className={`relative w-full ${proseClasses[themeMode]}`}
                style={{ 
                    height: `${rowVirtualizer.getTotalSize()}px`, 
                    fontSize: `${fontSize}rem`,
                }}
            >
                {rowVirtualizer.getVirtualItems().map(virtualItem => {
                    const chunk = chunks[virtualItem.index];
                    if (!chunk) return null;

                    const chunkBookmarks = (bookmarks || []).filter(b => 
                        b.startIndex >= chunk.globalStartIndex && 
                        b.startIndex < (chunk.globalStartIndex + chunk.text.length)
                    );
                    
                    return (
                        <div
                            key={chunk.id}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                        >
                            <ReadingParagraph
                                chunk={chunk}
                                wordsToHighlight={wordsToHighlight}
                                onWordClick={onWordClick}
                                phraseSelection={phraseSelection}
                                isPhraseMode={isPhraseMode}
                                bookmarks={chunkBookmarks}
                                highlightIndex={targetTokenIndex}
                            />
                        </div>
                    );
                })}
            </div>
        </>
    );
};

export default VirtualReadingContainer;
