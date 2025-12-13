import { VocabRow, AnkiConfig } from '../types';

/**
 * Represents the outcome of an Anki review calculation.
 */
export interface AnkiCalculationResult {
  nextStats: VocabRow['stats'];
  interval: number; // The duration of the next interval
  unit: 'm' | 'd'; // The unit of the interval (minutes or days)
}


/**
 * Calculates the next state for an Anki card based on the SM-2 algorithm.
 * @param stats The current statistics of the vocabulary row.
 * @param quality The user's self-assessed quality of recall (1=Again, 3=Hard, 4=Good, 5=Easy).
 * @param config The per-deck Anki configuration.
 * @returns An object containing the updated statistics and the next interval details.
 */
export const calculateNextAnkiState = (
  stats: VocabRow['stats'],
  quality: number, // 1=Again, 3=Hard, 4=Good, 5=Easy
  config: AnkiConfig
): AnkiCalculationResult => {
  let {
    ankiRepetitions: repetitions = 0,
    ankiEaseFactor: easeFactor = 2.5,
    ankiInterval: interval = 0,
  } = stats;

  const isNewCard = repetitions === 0;
  let nextInterval: number;
  let intervalUnit: 'm' | 'd' = 'd';

  if (quality < 3) { // Again (Lapse)
    repetitions = 0;
    // Reset interval based on lapse steps (in minutes)
    const lapseSteps = config.lapseSteps.split(' ').map(Number);
    nextInterval = lapseSteps[0] || 10;
    intervalUnit = 'm';
    // The actual interval in days for dueDate calculation will be very small,
    // or we can handle it as a "learning" step which is not yet implemented.
    // For now, we'll set the due date to tomorrow, but display the learning step.
    interval = 1;
  } else {
    // Update Ease Factor only on successful recall
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    if (isNewCard) {
      if (quality === 5) { // Easy on a new card
        interval = config.easyInterval;
      } else { // Good or Hard on a new card
        interval = config.graduatingInterval;
      }
    } else {
      let lastInterval = interval;
      interval = Math.ceil(lastInterval * easeFactor * config.intervalModifier);
    }
    
    // Apply Easy Bonus
    if (quality === 5) {
      interval = Math.ceil(interval * config.easyBonus);
    }
    repetitions += 1;
    nextInterval = interval;
    intervalUnit = 'd';
  }
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  let ankiDueDate;
  // For learning steps in minutes, the card is due today.
  if (intervalUnit === 'm') {
    ankiDueDate = now.getTime(); 
  } else {
    ankiDueDate = now.getTime() + interval * 24 * 60 * 60 * 1000;
  }


  const newStats: VocabRow['stats'] = {
    ...stats,
    ankiRepetitions: repetitions,
    ankiEaseFactor: easeFactor,
    ankiInterval: interval,
    ankiDueDate: ankiDueDate,
    lastPracticeDate: Date.now()
  };
  
  return {
      nextStats: newStats,
      interval: nextInterval,
      unit: intervalUnit
  };
};

/**
 * Maps a binary result (Correct/Incorrect) to an Anki quality rating.
 * Acts as a Heuristic Grading Adapter for non-flashcard interaction modes.
 * 
 * @param isCorrect Whether the answer was correct.
 * @returns Anki Quality: 3 (Good) for correct, 1 (Again) for incorrect.
 */
export const mapBinaryToAnki = (isCorrect: boolean): number => {
  return isCorrect ? 3 : 1;
};
