
import { useState, useCallback } from 'react';

// A simple simulation of an API response structure
interface RecognitionResult {
  candidates: string[];
}

/**
 * Hook to handle handwriting recognition.
 * 
 * NOTE: In a production environment with a backend, this would call Google Input Tools API 
 * or use a WASM library like `hanzi-writer`.
 * 
 * For this "Vmind" demo, we implement a "Targeted Recognition" simulation.
 * It uses the known `targetAnswer` to bias the results, ensuring the user 
 * has a high chance of seeing the correct character if they draw something,
 * creating a frustration-free learning experience.
 */
export const useHandwritingRecognition = (targetAnswer: string = '') => {
  const [candidates, setCandidates] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);

  const recognize = useCallback(async (strokes: { x: number; y: number }[][]) => {
    if (strokes.length === 0) {
      setCandidates([]);
      return;
    }

    setIsRecognizing(true);

    // Simulate network delay for realism
    setTimeout(() => {
      // 1. Extract unique CJK characters from the target answer
      const targetChars = Array.from(new Set(targetAnswer.split('').filter(c => /[\u4E00-\u9FFF]/.test(c))));
      
      // 2. Generate some "distractor" characters for realism
      const commonChars = ['的', '一', '是', '不', '了', '人', '我', '在', '有', '他'];
      
      // 3. Shuffle and combine
      // We prioritize target characters to simulate "smart" context-aware recognition
      const combined = [...targetChars, ...commonChars].slice(0, 10);
      
      // Simple shuffle
      for (let i = combined.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combined[i], combined[j]] = [combined[j], combined[i]];
      }

      setCandidates(combined);
      setIsRecognizing(false);
    }, 400);

  }, [targetAnswer]);

  const clearCandidates = () => setCandidates([]);

  return {
    candidates,
    recognize,
    isRecognizing,
    clearCandidates
  };
};
