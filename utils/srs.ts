import { VocabRow, AnkiConfig, AnkiState } from '../types';

/**
 * Represents the outcome of an Anki review calculation.
 */
export interface AnkiCalculationResult {
  nextStats: VocabRow['stats'];
  nextState: AnkiState;
  nextStep: number;
  dueInMinutes: number; // For UI display (e.g. "<1m", "10m", "4d")
  interval: number; // The logic interval stored
}

/**
 * Calculates the next state for an Anki card based on the SM-2 algorithm.
 * Handles extensive state transitions (New -> Learning -> Review) and minute-level steps.
 * 
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
  // Extract current state with defaults
  let {
    ankiState: currentState = 'New',
    ankiStep: currentStep = 0,
    ankiEaseFactor: easeFactor = 2.5,
    ankiInterval: interval = 0,
    ankiLapses: lapses = 0,
    ankiRepetitions: repetitions = 0,
  } = stats as any; // Cast to avoid strict undefined checks on optional fields if necessary

  // If stats are fresh/migrated without state, infer it
  if (!stats.ankiState) {
    if (stats.ankiRepetitions && stats.ankiRepetitions > 0) currentState = 'Review';
    else currentState = 'New';
  }

  let nextState: AnkiState = currentState;
  let nextStep = currentStep;
  let nextInterval = interval;
  let nextEase = easeFactor;
  let nextLapses = lapses;
  let nextDueTimestamp = 0;

  let dueInMinutes = 0; // Helper for return value

  // --- Logic Branching ---

  if (currentState === 'New') {
    if (quality === 1) { // Again
      nextState = 'Learning';
      nextStep = 0;
      dueInMinutes = config.learningSteps[0] || 1;
    } else if (quality === 3) { // Hard (treat as learning step 0 usually, or just step 0)
      nextState = 'Learning';
      nextStep = 0;
      dueInMinutes = (config.learningSteps[0] || 1); // Simple fallback
    } else if (quality === 4) { // Good
      if (config.learningSteps.length > 1) {
        nextState = 'Learning';
        nextStep = 1;
        dueInMinutes = config.learningSteps[1];
      } else {
        nextState = 'Review';
        nextInterval = config.graduatingInterval;
        dueInMinutes = nextInterval * 24 * 60;
      }
    } else if (quality === 5) { // Easy
      nextState = 'Review';
      nextInterval = config.easyInterval;
      dueInMinutes = nextInterval * 24 * 60;
    }
  }
  else if (currentState === 'Learning' || currentState === 'Relearning') {
    const steps = currentState === 'Learning' ? config.learningSteps : config.lapseSteps;

    if (quality === 1) { // Again
      nextStep = 0;
      dueInMinutes = steps[0] || 1;
    } else if (quality === 3) { // Hard
      // Repeat step? Or avg? Anki: "repeat current step" usually
      dueInMinutes = steps[currentStep] || 1;
    } else if (quality === 4) { // Good
      if (currentStep < steps.length - 1) {
        nextStep++;
        dueInMinutes = steps[nextStep];
      } else {
        // Graduate
        nextState = 'Review';
        nextInterval = config.graduatingInterval; // Or 1 day if coming from Relearning? Anki creates 'new interval' logic
        if (currentState === 'Relearning') nextInterval = Math.max(1, config.graduatingInterval); // Simplify
        dueInMinutes = nextInterval * 24 * 60;
      }
    } else if (quality === 5) { // Easy
      nextState = 'Review';
      nextInterval = config.easyInterval;
      dueInMinutes = nextInterval * 24 * 60;
    }
  }
  else if (currentState === 'Review') {
    if (quality === 1) { // Again (Lapse)
      nextState = 'Relearning';
      nextLapses += 1;
      nextEase = Math.max(1.3, easeFactor - 0.2);
      nextInterval = Math.max(1, Math.ceil(interval * config.newIntervalPercent)); // Interval reset
      nextStep = 0;
      dueInMinutes = config.lapseSteps[0] || 10;
    } else {
      // Success (Hard/Good/Easy)
      if (quality === 3) { // Hard
        nextEase = Math.max(1.3, easeFactor - 0.15);
        nextInterval = Math.ceil(interval * 1.2);
      } else if (quality === 4) { // Good
        nextInterval = Math.ceil(interval * easeFactor * config.intervalModifier);
      } else if (quality === 5) { // Easy
        nextEase = easeFactor + 0.15;
        nextInterval = Math.ceil(interval * easeFactor * config.intervalModifier * config.easyBonus);
      }
      dueInMinutes = nextInterval * 24 * 60;
    }
  }

  // Calculate distinct DueDate
  const now = Date.now();
  if (nextState === 'Review') {
    // Due dates for Review cards are usually purely date-based (storing due DATE).
    // Anki adds days to the current date (or the original due date? simplified to current date for now).
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    nextDueTimestamp = today.getTime() + (nextInterval * 24 * 60 * 60 * 1000);
  } else {
    // Learning/Relearning/New -> Learning rules use minutes from NOW.
    nextDueTimestamp = now + (dueInMinutes * 60 * 1000);
  }

  const newStats: VocabRow['stats'] = {
    ...stats,
    ankiState: nextState,
    ankiStep: nextStep,
    ankiEaseFactor: nextEase,
    ankiInterval: nextInterval,
    ankiLapses: nextLapses,
    ankiRepetitions: repetitions + 1,
    ankiDueDate: nextDueTimestamp,
    lastPracticeDate: now
  };

  return {
    nextStats: newStats,
    nextState,
    nextStep,
    dueInMinutes,
    interval: nextInterval
  };
};

/**
 * Maps a binary result (Correct/Incorrect) to an Anki quality rating.
 */
export const mapBinaryToAnki = (isCorrect: boolean): number => {
  return isCorrect ? 3 : 1; // 3=Hard (Pass), 1=Again (Fail) - Conservative
};
