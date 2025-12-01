
// This is a test file for a framework like Jest or Vitest.
// A test runner needs to be configured in the project to execute these tests.

declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;

// Mock global test functions if they don't exist, for robustness.
if (typeof describe === 'undefined') { (globalThis as any).describe = (name: string, fn: () => void) => fn(); }
if (typeof it === 'undefined') { (globalThis as any).it = (name: string, fn: () => void) => fn(); }
if (typeof expect === 'undefined') {
    const customExpect = (actual: any) => ({
        toBe: (expected: any) => {
            if (actual !== expected) throw new Error(`TEST FAILED: Expected ${actual} to be ${expected}`);
        },
        toEqual: (expected: any) => {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
        },
        toBeGreaterThanOrEqual: (expected: number) => {
             if (actual < expected) throw new Error(`TEST FAILED: Expected ${actual} to be >= ${expected}`);
        },
        toContain: (expected: any) => {
             if (!actual.includes(expected)) throw new Error(`TEST FAILED: Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        },
        not: {
            toBe: (expected: any) => {
                if (actual === expected) throw new Error(`TEST FAILED: Expected ${actual} not to be ${expected}`);
            }
        },
        toHaveLength: (expected: number) => {
            if (actual.length !== expected) throw new Error(`TEST FAILED: Expected length to be ${expected}, but got ${actual.length}`);
        },
    });
    (globalThis as any).expect = (actual: any) => {
        const matchers = customExpect(actual);
        if (actual instanceof Set) {
            (matchers as any).has = (expected: any) => {
                if (actual.has(expected) !== true) {
                    throw new Error(`TEST FAILED: Expected Set to have value ${expected}`);
                }
                return {
                    toBe: (bool: boolean) => {
                        if (actual.has(expected) !== bool) {
                            throw new Error(`TEST FAILED: Expected Set.has(${expected}) to be ${bool}`);
                        }
                    }
                }
            }
        }
        return matchers;
    };
}


// FIX: Removed generateScrambleSession as it is obsolete.
import { generateStudySession, regenerateQuestionForRow } from '../utils/studySessionGenerator';
// FIX: Removed ScrambleSessionSettings as it is obsolete.
import { Table, StudySettings, StudyMode, VocabRow, FlashcardStatus, Question, CriteriaSort } from '../types';

// Mock Data
const mockTable: Table = {
    id: 't1',
    name: 'Test Table',
    columns: [
        { id: 'c1', name: 'Word' },
        { id: 'c2', name: 'Definition' },
        { id: 'c3', name: 'Sentence' },
    ],
    rows: Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        cols: {
            'c1': `Word ${i}`,
            'c2': `Definition ${i}`,
            'c3': `Sentence containing word ${i}.`,
        },
        stats: {
            correct: i,
            incorrect: 10 - i,
            lastStudied: Date.now() - (10 - i) * 1000 * 3600 * 24, // r0 is oldest (10 days ago), r9 is newest (1 day ago)
            flashcardStatus: FlashcardStatus.New,
            flashcardEncounters: 0,
            isFlashcardReviewed: false,
            lastPracticeDate: Date.now() - (10 - i) * 1000 * 3600 * 24,
        },
    })),
    relations: [
        { id: 'rel1', name: 'Word -> Def', questionColumnIds: ['c1'], answerColumnIds: ['c2'], compatibleModes: [StudyMode.MultipleChoice, StudyMode.Typing] },
        { id: 'rel2', name: 'Def -> Word', questionColumnIds: ['c2'], answerColumnIds: ['c1'], compatibleModes: [StudyMode.MultipleChoice, StudyMode.Typing] },
        { id: 'rel3', name: 'Sentence Scramble', questionColumnIds: ['c3'], answerColumnIds: [], compatibleModes: [StudyMode.Scrambled], scrambleConfig: { splitCount: 4 } },
    ],
};

const mockTables = [mockTable];

describe('studySessionGenerator', () => {

    describe('generateStudySession', () => {
        it('should generate the correct number of questions', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions.length).toBe(5);
        });

        it('should only generate questions of the selected modes', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            questions.forEach(q => {
                expect(q.type).toBe(StudyMode.Typing);
            });
        });

        it('should handle manual word selection', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'manual',
                manualWordIds: ['r1', 'r3', 'r5'],
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions.length).toBe(3);
            const questionRowIds = new Set(questions.map(q => q.rowId));
            expect(questionRowIds.has('r1')).toBe(true);
            expect(questionRowIds.has('r3')).toBe(true);
            expect(questionRowIds.has('r5')).toBe(true);
        });

        it('should generate multiple choice questions with options', () => {
             const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.MultipleChoice],
                wordSelectionMode: 'auto',
                wordCount: 1,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions[0].type).toBe(StudyMode.MultipleChoice);
            expect(questions[0].options?.length).toBeGreaterThanOrEqual(2);
            expect(questions[0].options).toContain(questions[0].correctAnswer);
        });
        
        it('should respect criteria-based sorting (lastPracticeDate)', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 3,
                criteriaSorts: [{ field: 'lastPracticeDate', direction: 'asc' }],
            };
            // `lastPracticeDate` is older for lower index `i`. So we expect r0, r1, r2.
            const questions = generateStudySession(mockTables, settings);
            const questionRowIds = questions.map(q => q.rowId);
            
            // The final list is shuffled, so we check if the generated questions are from the correct pool.
            const topThreeLeastRecent = ['r0', 'r1', 'r2'];
            questionRowIds.forEach(id => {
                expect(topThreeLeastRecent.includes(id)).toBe(true);
            });
        });
        
        it('should respect criteria-based sorting (priorityScore)', () => {
            const priorityMockTable: Table = {
                ...mockTable,
                rows: [
                    // Low priority: high correct, recent practice
                    { id: 'lp1', cols: { 'c1': 'easy', 'c2': 'def' }, stats: { correct: 10, incorrect: 1, lastPracticeDate: Date.now() - 1000 * 3600 * 24, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                    // High priority: high incorrect, old practice, was quit
                    { id: 'hp1', cols: { 'c1': 'hard', 'c2': 'def' }, stats: { correct: 1, incorrect: 10, lastPracticeDate: Date.now() - 1000 * 3600 * 24 * 30, wasQuit: true, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                    // Medium priority
                    { id: 'mp1', cols: { 'c1': 'medium', 'c2': 'def' }, stats: { correct: 5, incorrect: 5, lastPracticeDate: Date.now() - 1000 * 3600 * 24 * 7, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                ]
            };
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Typing],
                wordSelectionMode: 'auto',
                wordCount: 1,
                criteriaSorts: [{ field: 'priorityScore', direction: 'desc' }],
            };
            const questions = generateStudySession([priorityMockTable], settings);
            expect(questions).toHaveLength(1);
            expect(questions[0].rowId).toBe('hp1'); // The high priority one should be selected.
        });

        it('should return an empty array if no compatible modes are found', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel1' }],
                modes: [StudyMode.Scrambled], // rel1 is not compatible with Scrambled
                wordSelectionMode: 'auto',
                wordCount: 5,
            };
            const questions = generateStudySession(mockTables, settings);
            expect(questions).toEqual([]);
        });
    });

    // --- NEW: Test suite for sorting presets ---
    describe('Preset Sorting', () => {
        const presetTestTable: Table = {
            ...mockTable,
            rows: [
                { id: 'weakWord', cols: { c1: 'weak' }, stats: { correct: 1, incorrect: 10, lastPracticeDate: Date.now() - 86400000 * 5, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                { id: 'oldWord', cols: { c1: 'old' }, stats: { correct: 5, incorrect: 5, lastPracticeDate: Date.now() - 86400000 * 30, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                { id: 'newWord', cols: { c1: 'new' }, stats: { correct: 0, incorrect: 0, lastPracticeDate: null, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                { id: 'quitWord', cols: { c1: 'quit' }, stats: { correct: 3, incorrect: 3, lastPracticeDate: Date.now() - 86400000 * 3, wasQuit: true, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                { id: 'masteredWord', cols: { c1: 'mastered' }, stats: { correct: 20, incorrect: 1, lastPracticeDate: Date.now() - 86400000 * 1, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } },
                { id: 'highLevelWeakWord', cols: { c1: 'almost' }, stats: { correct: 10, incorrect: 3, lastPracticeDate: Date.now() - 86400000 * 2, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false } }, // Level 4, 76% success
            ]
        };
        const presetTestTables = [presetTestTable];
        const baseSettings: Omit<StudySettings, 'criteriaSorts'> = {
            sources: [{ tableId: 't1', relationId: 'rel1' }],
            modes: [StudyMode.Typing],
            wordSelectionMode: 'auto',
            wordCount: 1,
        };

        it('Weakest Links preset should select the word with the lowest success rate', () => {
            const criteriaSorts: CriteriaSort[] = [ { field: 'successRate', direction: 'asc' }, { field: 'failed', direction: 'desc' }, { field: 'lastPracticeDate', direction: 'asc' }];
            const questions = generateStudySession(presetTestTables, { ...baseSettings, criteriaSorts });
            expect(questions[0].rowId).toBe('weakWord'); // 1/11 = ~9% success rate
        });

        it('Spaced Repetition preset should select the word practiced longest ago', () => {
            const criteriaSorts: CriteriaSort[] = [ { field: 'lastPracticeDate', direction: 'asc' }, { field: 'wasQuit', direction: 'desc' }, { field: 'successRate', direction: 'asc' }];
            const questions = generateStudySession(presetTestTables, { ...baseSettings, criteriaSorts });
            expect(questions[0].rowId).toBe('oldWord'); // 30 days ago
        });
        
        it('New Words First preset should select a word with 0 attempts', () => {
            const criteriaSorts: CriteriaSort[] = [ { field: 'totalAttempts', direction: 'asc' }, { field: 'lastPracticeDate', direction: 'asc' }, { field: 'random', direction: 'asc' }];
            const questions = generateStudySession(presetTestTables, { ...baseSettings, criteriaSorts });
            expect(questions[0].rowId).toBe('newWord'); // 0 attempts
        });
        
        it('Final Polish preset should select the high-level but still weak word', () => {
            const criteriaSorts: CriteriaSort[] = [ { field: 'level', direction: 'desc' }, { field: 'successRate', direction: 'asc' }, { field: 'lastPracticeDate', direction: 'desc' }];
            const questions = generateStudySession(presetTestTables, { ...baseSettings, criteriaSorts });
             // 'masteredWord' is level 5 but high success. 'highLevelWeakWord' is level 4 with lower success.
            expect(questions[0].rowId).toBe('highLevelWeakWord');
        });

        it("Vmind's Choice (priority score) should select the quit word over the old word", () => {
            const criteriaSorts: CriteriaSort[] = [ { field: 'priorityScore', direction: 'desc' }, { field: 'totalAttempts', direction: 'desc' }, { field: 'random', direction: 'asc' }];
            const questions = generateStudySession(presetTestTables, { ...baseSettings, criteriaSorts });
            // 'quitWord' has a massive 20% weight, likely trumping the date component of 'oldWord'
            expect(questions[0].rowId).toBe('quitWord');
        });
    });

    describe('regenerateQuestionForRow', () => {
        it('should generate a new question for the same row', () => {
            const allRows = mockTable.rows;
            const settings: StudySettings = {
                 sources: [{ tableId: 't1', relationId: 'rel1' }],
                 modes: [StudyMode.Typing, StudyMode.MultipleChoice],
                 randomizeModes: true,
                 wordSelectionMode: 'auto',
                 wordCount: 1,
            };
            const originalQuestion: Question = {
                rowId: 'r1',
                tableId: 't1',
                relationId: 'rel1',
                questionSourceColumnNames: ['Word'],
                questionText: 'Word 1',
                correctAnswer: 'Definition 1',
                type: StudyMode.Typing,
            };

            const newQuestion = regenerateQuestionForRow(originalQuestion, allRows, mockTables, settings);
            expect(newQuestion).not.toBeNull();
            expect(newQuestion.rowId).toBe('r1');
            // It could be the same type, but it should be a new object.
            expect(newQuestion).not.toBe(originalQuestion);
        });
    });

    describe('generateStudySession with Scramble Mode', () => {
        it('should generate scramble questions with shuffled parts when configured', () => {
            const settings: StudySettings = {
                sources: [{ tableId: 't1', relationId: 'rel3' }],
                modes: [StudyMode.Scrambled],
                wordSelectionMode: 'auto',
                wordCount: 10,
            };

            const questions = generateStudySession(mockTables, settings);
            expect(questions.length).toBe(10);
            
            const q1 = questions.find(q => q.rowId === 'r0');
            expect(q1?.type).toBe(StudyMode.Scrambled);
            expect(q1?.correctAnswer).toBe('Sentence containing word 0.');
            expect(q1?.scrambledParts?.length).toBe(4);
            expect(q1?.scrambledParts?.sort()).toEqual(['Sentence', 'containing', 'word', '0.'].sort());
        });
    });

    // FIX: Removed obsolete test suite for the deleted `generateScrambleSession` function.
});
