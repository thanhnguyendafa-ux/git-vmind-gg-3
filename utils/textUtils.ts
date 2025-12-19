

import { VocabRow, Column } from '../types';

export const CONTEXT_WORD_COUNT = 7;

/**
 * Extracts a context snippet around a selected text within a larger body of text.
 * @param fullText The entire text content.
 * @param selectionText The specific text that was selected.
 * @param selectionStartIndex The character index where the selection starts in the fullText.
 * @param wordCount The number of words to include before and after the selection.
 * @returns A formatted string with the context snippet.
 */
export function extractContextSnippet(
  fullText: string,
  selectionText: string,
  selectionStartIndex: number,
  wordCount: number
): string {
  if (!fullText || !selectionText) {
    return selectionText;
  }

  // Text before and after the selection
  const beforeText = fullText.substring(0, selectionStartIndex);
  const afterText = fullText.substring(selectionStartIndex + selectionText.length);

  // Split into words, removing empty strings from multiple spaces
  const beforeWords = beforeText.split(/\s+/).filter(Boolean);
  const afterWords = afterText.split(/\s+/).filter(Boolean);

  // Get the desired number of context words
  const contextBefore = beforeWords.slice(-wordCount);
  const contextAfter = afterWords.slice(0, wordCount);

  const beforePart = contextBefore.join(' ');
  const afterPart = contextAfter.join(' ');

  let finalSnippet = `[${selectionText}]`;

  if (beforePart) {
    finalSnippet = `${beforePart} ${finalSnippet}`;
  }
  if (afterPart) {
    finalSnippet = `${finalSnippet} ${afterPart}`;
  }

  // Add ellipses if there is more text beyond the context window
  if (beforeWords.length > wordCount) {
    finalSnippet = `... ${finalSnippet}`;
  }
  if (afterWords.length > wordCount) {
    finalSnippet = `${finalSnippet} ...`;
  }

  return finalSnippet;
}

/**
 * Finds a specified number of sentences before and after a selection in a larger text.
 * @param fullText The entire body of text.
 * @param selectionStartIndex The character index where the selection begins.
 * @param selectionLength The length of the selected text.
 * @param sentencesBefore The number of sentences to capture before the selection.
 * @param sentencesAfter The number of sentences to capture after the selection.
 * @returns An object containing the text before, after, and the full combined context.
 */
export function findContextSentences(
  fullText: string,
  selectionStartIndex: number,
  selectionLength: number,
  sentencesBefore: number,
  sentencesAfter: number
): { contextBefore: string; contextAfter: string; fullContext: string } {
  // Split by sentence-ending punctuation followed by a space or end of string.
  // The capturing group `([.?!])` keeps the delimiter.
  const sentences = fullText.split(/(?<=[.?!])\s+/);

  let charCount = 0;
  let selectionSentenceIndex = -1;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceStart = charCount;
    const sentenceEnd = charCount + sentence.length;

    if (selectionStartIndex >= sentenceStart && (selectionStartIndex + selectionLength) <= sentenceEnd) {
      selectionSentenceIndex = i;
      break;
    }
    charCount = sentenceEnd + 1; // +1 for the space delimiter
  }

  if (selectionSentenceIndex === -1) {
    // Fallback if selection spans sentences or logic fails
    return { contextBefore: '', contextAfter: '', fullContext: `[...` };
  }

  const start = Math.max(0, selectionSentenceIndex - sentencesBefore);
  const end = Math.min(sentences.length, selectionSentenceIndex + sentencesAfter + 1);

  const contextSentences = sentences.slice(start, end);

  // Reconstruct the context and find the relative start of the selection
  const tempFullContext = contextSentences.join(' ');
  const selectionSentence = sentences[selectionSentenceIndex];
  const relativeSelectionStart = selectionStartIndex - (fullText.indexOf(selectionSentence));

  const contextStartIndexInFull = fullText.indexOf(contextSentences[0]);
  const selectionGlobalStartIndexInContext = selectionStartIndex - contextStartIndexInFull;

  const contextBefore = tempFullContext.substring(0, selectionGlobalStartIndexInContext);
  const contextAfter = tempFullContext.substring(selectionGlobalStartIndexInContext + selectionLength);
  const fullContext = tempFullContext;

  return { contextBefore, contextAfter, fullContext };
}

/**
 * Replaces variable placeholders like {Column Name} in a text string with values from a row.
 * @param text The text containing placeholders.
 * @param row The vocabulary row containing data.
 * @param columns The list of columns to look up names.
 * @returns The interpolated string.
 */
export function resolveVariables(text: string, row: VocabRow | null | undefined, columns: Column[] | undefined): string {
  if (!text) return '';
  if (!row || !columns) return text;

  // Replace {Column Name} with the actual value from the row
  return text.replace(/{([^}]+)}/g, (match, colName) => {
    const trimmedColName = colName.trim().toLowerCase();

    // Case-insensitive matching for robustness
    const column = columns.find(c => c.name.trim().toLowerCase() === trimmedColName);

    if (column) {
      const value = row.cols[column.id];
      // If the column exists but the value is null/undefined, treat as empty
      if (value === undefined || value === null) return '';
      return String(value);
    }

    // If no column found, return a placeholder that prevents logic breakage 
    // instead of the raw curly braces which can break scanners.
    return `[Missing: ${colName.trim()}]`;
  });
}

/**
 * Replaces variable placeholders in a URL template string, ensuring values are URL-encoded.
 * @param template The URL template string containing placeholders.
 * @param row The vocabulary row containing data.
 * @param columns The list of columns to look up names.
 * @returns The interpolated, URL-safe string.
 */
export function resolveUrlTemplate(template: string, row: VocabRow | null | undefined, columns: Column[] | undefined): string {
  if (!template || !row || !columns) return template;

  return template.replace(/{([^}]+)}/g, (match, colName) => {
    const column = columns.find(c => c.name.toLowerCase() === colName.trim().toLowerCase());
    if (column) {
      const value = row.cols[column.id] || '';
      return encodeURIComponent(value);
    }
    return match;
  });
}

/**
 * Evaluates an answer formula string using row data.
 * This is the logic engine for the "Puzzle Master" architecture.
 * @param formula The template string, e.g., "{Word} - {Definition}".
 * @param row The data row.
 * @param columns The table columns schema.
 * @returns The resolved answer string.
 */
export function evaluateFormula(formula: string, row: VocabRow, columns: Column[]): string {
  if (!formula) return '';

  // Use the same variable resolution logic as display text
  const resolved = resolveVariables(formula, row, columns);

  // Clean up any leftover or empty formatting (optional but good for UX)
  // e.g., if formula is "{Word} ({Phonetic})" and phonetic is empty, we might get "Apple ()"
  // Simple cleanup for empty parens:
  return resolved.replace(/\(\s*\)/g, '').trim();
}