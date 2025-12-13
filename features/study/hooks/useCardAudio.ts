
import { useEffect, useState } from 'react';
import { useAudioStore, SpeechRequest } from '../../../stores/useAudioStore';
import { useUIStore } from '../../../stores/useUIStore';
import { QuestionCard, CardFaceDesign, Table, VocabRow, Relation } from '../../../types';
import { resolveVariables } from '../../../utils/textUtils';
import { DEFAULT_TYPOGRAPHY } from '../../tables/designConstants';
import { detectLanguageFromText } from '../../../services/audioService';

export const useCardAudio = (
  card: QuestionCard,
  table: Table | undefined,
  row: VocabRow | undefined,
  currentRelation: Relation | undefined
) => {
  const { isConfidenceAutoplayEnabled } = useUIStore();
  const { playQueue, stopQueue, audioState } = useAudioStore();
  const [audioSequence, setAudioSequence] = useState<SpeechRequest[]>([]);

  const isPlaying = audioState.playingId === card.id && audioState.status === 'playing';

  useEffect(() => {
    // We need at least table and row to build a sequence. 
    // If relation is missing, we can't map columns, so we rely on fallback.
    if (!table || !row || !currentRelation) {
      setAudioSequence([]);
      stopQueue();
      return;
    }

    const sequence: SpeechRequest[] = [];
    
    // Helper: Determine language (Config > Auto-detect)
    const getLang = (colId: string, content: string): string => {
        const configLang = table.columnAudioConfig?.[colId]?.language;
        if (configLang) return configLang;
        return detectLanguageFromText(content);
    };
    
    const addText = (text: string | undefined, colId?: string) => {
        if (text && text.trim()) {
            const lang = colId ? getLang(colId, text) : detectLanguageFromText(text);
            sequence.push({ text: text.trim(), lang });
        }
    };
    
    const faceDesign = currentRelation.design?.front;
    const columnIds = currentRelation.questionColumnIds;

    const getElements = (design: CardFaceDesign | undefined, cols: string[]) => {
        // If no specific design, use column order (Blueprint mode)
        const elementOrder = design?.elementOrder && design.elementOrder.length > 0 
            ? design.elementOrder 
            : cols;
        
        elementOrder.forEach(id => {
            const column = table.columns.find(c => c.id === id);
            if (column) {
                const text = String(row.cols[id] || '');
                // Heuristic: don't read labels (usually styled italic in templates)
                const style = design?.typography[id];
                if (style?.fontStyle !== 'italic') { 
                    addText(text, id);
                }
            } else {
                const txtBox = design?.textBoxes?.find(t => t.id === id);
                if (txtBox) {
                    // Heuristic: don't read instructions
                    if (txtBox.typography.fontStyle !== 'italic') {
                        const resolvedText = resolveVariables(txtBox.text, row, table.columns);
                        addText(resolvedText);
                    }
                }
            }
        });
    };

    getElements(faceDesign, columnIds);
    setAudioSequence(sequence);

    // Autoplay Logic
    if (isConfidenceAutoplayEnabled && sequence.length > 0) {
        playQueue(sequence, card.id);
    }
    
    return () => {
        stopQueue();
    };
  }, [card.id, table, row, currentRelation, isConfidenceAutoplayEnabled, playQueue, stopQueue]);

  const playSequence = () => {
      // FIX: Priority Inversion. 
      // Always prefer the constructed sequence (which respects column settings)
      // over the raw promptText (which relies on flaky auto-detect).
      if (audioSequence.length > 0) {
          playQueue(audioSequence, card.id);
      } else if (card.content.promptText) {
          // Fallback only if sequence is empty
          const lang = detectLanguageFromText(card.content.promptText);
          playQueue([{ text: card.content.promptText, lang }], card.id);
      }
  };

  return { isPlaying, playSequence };
};
