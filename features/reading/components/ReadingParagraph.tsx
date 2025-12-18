
import * as React from 'react';
import { TextChunk } from '../../../utils/textChunker';
import { Bookmark } from '../../../types';
import Icon from '../../../components/ui/Icon';

interface ReadingParagraphProps {
    chunk: TextChunk;
    wordsToHighlight: Set<string>;
    onWordClick: (index: number, e: React.MouseEvent<HTMLSpanElement>, word: string) => void;
    phraseSelection: { start: number | null, end: number | null };
    isPhraseMode: boolean;
    searchMatchIndices?: Set<number>;
    bookmarks?: Bookmark[];
    highlightIndex?: number | null; // NEW: Prop for deep linking target
}

const ReadingParagraph: React.FC<ReadingParagraphProps> = React.memo(({ 
    chunk, 
    wordsToHighlight, 
    onWordClick, 
    phraseSelection, 
    isPhraseMode,
    bookmarks,
    highlightIndex
}) => {
    // We use the pre-calculated tokens from the chunk to avoid re-splitting
    const tokens = chunk.tokens;
    const globalBaseIndex = chunk.globalWordIndex;
    
    const hasBookmark = bookmarks && bookmarks.length > 0;

    return (
        <div className="reading-paragraph mb-0 min-h-[1em] relative group/paragraph">
            {hasBookmark && (
                <div className="absolute -left-6 top-1 text-warning-500" title="Bookmarked">
                    <Icon name="bookmark" className="w-5 h-5" variant="filled" />
                </div>
            )}
            
            {tokens.map((word, localIndex) => {
                // Determine true global index for this word
                const globalIndex = globalBaseIndex + localIndex;
                const domId = `word-${globalIndex}`; // Step 1: DOM Identity

                if (/^\s+$/.test(word)) {
                    return <span key={localIndex}>{word}</span>;
                }
                
                // --- Phrase Mode 2.0 Visual Logic ---
                const isAnchor = isPhraseMode && phraseSelection.start === globalIndex && phraseSelection.end === null;
                const isRange = phraseSelection.start !== null && phraseSelection.end !== null && globalIndex >= phraseSelection.start && globalIndex <= phraseSelection.end;
                const isTarget = globalIndex === highlightIndex; // Step 3: Visual Anchoring Check

                const normalizedWord = word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
                const shouldHighlightLinked = wordsToHighlight.has(normalizedWord);
                
                const cursorClass = isPhraseMode ? 'cursor-alias' : 'cursor-pointer';
                
                let selectionClass = 'hover:bg-secondary-200/60 dark:hover:bg-secondary-700/60'; 
                
                if (isAnchor) {
                    selectionClass = 'ring-2 ring-primary-500 bg-primary-100 dark:bg-primary-900/30 animate-pulse z-20 rounded-md';
                } else if (isRange) {
                    selectionClass = 'bg-primary-200/50 dark:bg-primary-900/40 rounded-sm';
                }
                
                // Step 3: Apply Visual Highlight
                if (isTarget) {
                    selectionClass = `${selectionClass} bg-yellow-200 dark:bg-yellow-900/60 ring-2 ring-yellow-400 dark:ring-yellow-600 rounded z-10 transition-colors duration-1000`;
                }

                return (
                    <span
                        key={localIndex}
                        id={domId}
                        onClick={(e) => onWordClick(globalIndex, e, word)}
                        className={`
                            px-0.5 rounded-sm transition-all duration-200 ease-out border border-transparent ${cursorClass} ${selectionClass}
                        `}
                    >
                        {shouldHighlightLinked && !isRange && !isAnchor && !isTarget
                            ? <span className="border-b-2 border-dotted border-primary-400/80">{word}</span>
                            : word
                        }
                    </span>
                );
            })}
        </div>
    );
});

export default ReadingParagraph;
