
export interface TextChunk {
  id: string;
  text: string;
  globalStartIndex: number; // Character index start
  globalWordIndex: number;  // Index in the global wordsAndSpaces array
  tokens: string[]; // Cache tokens to avoid re-splitting
}

// Global tokenizer to ensure consistency
// We capture newlines as specific tokens to handle paragraph breaks naturally
export const splitIntoWords = (text: string) => text.split(/(\s+)/);

export const chunkTextForVirtualization = (text: string): { chunks: TextChunk[], allTokens: string[] } => {
    if (!text) return { chunks: [], allTokens: [] };

    const allTokens = splitIntoWords(text);
    const chunks: TextChunk[] = [];
    
    let currentChunkTokens: string[] = [];
    let currentChunkStartIndex = 0; // Char index
    // The index in allTokens where this chunk starts
    let chunkStartTokenIndex = 0; 
    
    // We iterate tokens and break into chunks whenever we hit a newline.
    // This effectively recreates "paragraphs" but keeps them mapped to the global token array.
    for (let i = 0; i < allTokens.length; i++) {
        const token = allTokens[i];
        currentChunkTokens.push(token);

        // Check if this token contains a newline
        if (token.includes('\n')) {
             const chunkText = currentChunkTokens.join('');
             
             chunks.push({
                 id: `chunk-${chunks.length}`,
                 text: chunkText,
                 globalStartIndex: currentChunkStartIndex,
                 globalWordIndex: chunkStartTokenIndex,
                 tokens: [...currentChunkTokens]
             });
             
             // Update trackers for next chunk
             currentChunkStartIndex += chunkText.length;
             chunkStartTokenIndex = i + 1; // Next chunk starts at next token
             currentChunkTokens = [];
        }
    }
    
    // Push any remaining tokens as the final chunk
    if (currentChunkTokens.length > 0) {
         chunks.push({
             id: `chunk-${chunks.length}`,
             text: currentChunkTokens.join(''),
             globalStartIndex: currentChunkStartIndex,
             globalWordIndex: chunkStartTokenIndex,
             tokens: currentChunkTokens
         });
    }

    return { chunks, allTokens };
};
