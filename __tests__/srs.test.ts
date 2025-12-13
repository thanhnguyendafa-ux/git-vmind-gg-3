// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateNextAnkiState } from '../utils/srs';
import { VocabRow, AnkiConfig } from '../types';

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;
declare var vi: any;


const defaultConfig: AnkiConfig = {
    newCardsPerDay: 20,
    learningSteps: "1 10",
    graduatingInterval: 1,
    easyInterval: 4,
    maxReviewsPerDay: 200,
    easyBonus: 1.3,
    intervalModifier: 1.0,
    lapseSteps: "10",
    newIntervalPercent: 0,
};

const newCardStats: VocabRow['stats'] = {
    correct: 0,
    incorrect: 0,
    lastStudied: null,
    flashcardStatus: 'New' as any,
    flashcardEncounters: 0,
    isFlashcardReviewed: false,
    lastPracticeDate: null,
};

// Mock Date.now() to control time-based calculations
const T_ZERO = new Date('2024-01-01T00:00:00.000Z').getTime();
vi.spyOn(Date, 'now').mockImplementation(() => T_ZERO);

const getDaysFromNow = (days: number) => {
    const now = new Date(T_ZERO);
    now.setHours(0, 0, 0, 0);
    return now.getTime() + days * 24 * 60 * 60 * 1000;
};


describe('calculateNextAnkiState', () => {

    describe('For a New Card', () => {
        it('should handle "Again" (quality < 3) by resetting repetitions and setting interval to 1 day', () => {
            const { nextStats } = calculateNextAnkiState(newCardStats, 1, defaultConfig);
            expect(nextStats.ankiRepetitions).toBe(0);
            // FIX: The interval for a lapsed card is reset to the graduating interval (default 1 day), but its due date is set to today to re-enter the learning queue.
            expect(nextStats.ankiInterval).toBe(1);
            expect(nextStats.ankiEaseFactor).toBe(2.5); // Ease factor is not changed on failure
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(0));
        });

        it('should handle "Good" (quality = 4) by graduating the card with the graduating interval', () => {
            const { nextStats } = calculateNextAnkiState(newCardStats, 4, defaultConfig);
            expect(nextStats.ankiRepetitions).toBe(1);
            expect(nextStats.ankiInterval).toBe(defaultConfig.graduatingInterval);
            expect(nextStats.ankiEaseFactor).toBeCloseTo(2.5);
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(defaultConfig.graduatingInterval));
        });

        it('should handle "Easy" (quality = 5) by graduating the card with the easy interval', () => {
            const { nextStats } = calculateNextAnkiState(newCardStats, 5, defaultConfig);
            expect(nextStats.ankiRepetitions).toBe(1);
            expect(nextStats.ankiInterval).toBe(defaultConfig.easyInterval);
            expect(nextStats.ankiEaseFactor).toBeCloseTo(2.65);
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(defaultConfig.easyInterval));
        });
    });

    describe('For a Review Card', () => {
        const reviewCardStats: VocabRow['stats'] = {
            ...newCardStats,
            ankiRepetitions: 3,
            ankiEaseFactor: 2.36,
            ankiInterval: 10,
        };

        it('should handle "Again" (quality < 3) by resetting repetitions and interval (lapse)', () => {
            const { nextStats } = calculateNextAnkiState(reviewCardStats, 1, defaultConfig);
            expect(nextStats.ankiRepetitions).toBe(0);
            expect(nextStats.ankiInterval).toBe(1); // Lapses to 1 day
            expect(nextStats.ankiEaseFactor).toBe(2.36); // Ease factor not changed
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(0));
        });

        it('should handle "Hard" (quality = 3) by increasing interval and lowering ease factor', () => {
            const { nextStats } = calculateNextAnkiState(reviewCardStats, 3, defaultConfig);
            const expectedInterval = Math.ceil(10 * (2.36 - 0.14) * 1.0);
            expect(nextStats.ankiRepetitions).toBe(4);
            expect(nextStats.ankiInterval).toBe(expectedInterval);
            expect(nextStats.ankiEaseFactor).toBeCloseTo(2.36 - 0.14);
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(expectedInterval));
        });

        it('should handle "Good" (quality = 4) by increasing interval and slightly lowering ease factor', () => {
            const { nextStats } = calculateNextAnkiState(reviewCardStats, 4, defaultConfig);
            const expectedInterval = Math.ceil(10 * 2.36 * 1.0);
            expect(nextStats.ankiRepetitions).toBe(4);
            expect(nextStats.ankiInterval).toBe(expectedInterval);
            expect(nextStats.ankiEaseFactor).toBeCloseTo(2.36);
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(expectedInterval));
        });

        it('should handle "Easy" (quality = 5) by increasing interval, applying bonus, and increasing ease factor', () => {
            const { nextStats } = calculateNextAnkiState(reviewCardStats, 5, defaultConfig);
            const expectedBaseInterval = Math.ceil(10 * (2.36 + 0.15) * 1.0);
            const expectedFinalInterval = Math.ceil(expectedBaseInterval * defaultConfig.easyBonus);

            expect(nextStats.ankiRepetitions).toBe(4);
            expect(nextStats.ankiInterval).toBe(expectedFinalInterval);
            expect(nextStats.ankiEaseFactor).toBeCloseTo(2.36 + 0.15);
            expect(nextStats.ankiDueDate).toBe(getDaysFromNow(expectedFinalInterval));
        });
    });
    
    describe('Edge Cases', () => {
        it('should not let ease factor drop below 1.3', () => {
            const lowEaseStats: VocabRow['stats'] = { ...newCardStats, ankiRepetitions: 5, ankiEaseFactor: 1.3, ankiInterval: 20 };
            const { nextStats } = calculateNextAnkiState(lowEaseStats, 3, defaultConfig);
            expect(nextStats.ankiEaseFactor).toBe(1.3);
        });

        it('should respect the interval modifier', () => {
            const modifiedConfig: AnkiConfig = { ...defaultConfig, intervalModifier: 1.5 };
            const reviewCardStats: VocabRow['stats'] = { ...newCardStats, ankiRepetitions: 2, ankiEaseFactor: 2.5, ankiInterval: 5 };
            const { nextStats } = calculateNextAnkiState(reviewCardStats, 4, modifiedConfig);
            
            // Expected: 5 (last interval) * 2.5 (ease) * 1.5 (modifier) = 18.75 -> ceil -> 19
            expect(nextStats.ankiInterval).toBe(19);
        });
    });
});