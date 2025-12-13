import { VocabRow } from '../types';

// --- Stat Calculation Helpers ---
// These functions derive advanced stats from the basic VocabRow stats.

export const getRankPoint = (row: VocabRow): number => {
    return (row.stats.correct || 0) - (row.stats.incorrect || 0);
};

export const getLevel = (row: VocabRow): number => {
    const rankPoint = getRankPoint(row);
    if (rankPoint > 31) return 6;
    if (rankPoint > 15) return 5;
    if (rankPoint > 7) return 4;
    if (rankPoint > 3) return 3;
    if (rankPoint > 0) return 2;
    return 1;
};

export const getTotalAttempts = (row: VocabRow): number => {
    return (row.stats.correct || 0) + (row.stats.incorrect || 0);
};

export const getSuccessRate = (row: VocabRow): number => {
    const attempts = getTotalAttempts(row);
    return attempts > 0 ? (row.stats.correct || 0) / attempts : 0;
};

export const getFailureRate = (row: VocabRow): number => {
    const attempts = getTotalAttempts(row);
    return attempts > 0 ? (row.stats.incorrect || 0) / attempts : 0;
};

// --- Priority Score Calculation ---

/**
 * Calculates a priority score (0-1) for a vocabulary row, determining how urgently it needs to be reviewed.
 * Higher scores mean higher priority.
 * @param row The vocabulary row to score.
 * @param maxInQueue The maximum number of times any word in the current candidate pool has been in a queue.
 * @returns A priority score between 0 and 1.
 */
export const getPriorityScore = (row: VocabRow, maxInQueue: number): number => {
    // 1. Rank Component (20%)
    const rankPoint = getRankPoint(row);
    // Updated to match user specification: 1 / (RankPoint + 1)
    const rankComponent = 1 / (rankPoint + 1);

    // 2. Failure Component (20%)
    const failureComponent = getFailureRate(row);

    // 3. Level Component (10%)
    const level = getLevel(row);
    const levelComponent = 1 / (level + 1);

    // 4. Practice Date Component (20%) - Updated to match user specification's step-function g()
    const daysSincePractice = row.stats.lastPracticeDate
        ? (Date.now() - row.stats.lastPracticeDate) / (1000 * 3600 * 24)
        : 999; // Unseen words get max priority.
    
    let practiceDateComponentValue = 0;
    if (daysSincePractice < 2) {
        practiceDateComponentValue = 0.1; // low priority
    } else if (daysSincePractice <= 4) {
        practiceDateComponentValue = 0.5; // medium priority
    } else if (daysSincePractice <= 9) {
        practiceDateComponentValue = 0.8; // high priority
    } else { // 10 or more days
        practiceDateComponentValue = 1.0; // max priority
    }
    const practiceDateComponent = practiceDateComponentValue;

    // 5. Quit Queue Component (20%)
    const quitQueueComponent = row.stats.wasQuit ? 1.0 : 0.0;

    // 6. In Queue Component (10%)
    const inQueueCount = row.stats.inQueueCount || 0;
    const inQueueComponent = maxInQueue > 0 ? 1 - (inQueueCount / maxInQueue) : 1.0;

    // Weighted sum of all components
    const score = 
        rankComponent * 0.20 +
        failureComponent * 0.20 +
        levelComponent * 0.10 +
        practiceDateComponent * 0.20 +
        quitQueueComponent * 0.20 +
        inQueueComponent * 0.10;

    return Math.min(1, Math.max(0, score)); // Clamp score between 0 and 1
};
