
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StudyMode, Relation, FlashcardStatus } from '../../../types';

// Mocking math.random for deterministic testing
const mockMath = Object.create(global.Math);
mockMath.random = vi.fn(() => 0.5);
global.Math = mockMath;

describe('Anki Mode Selection Logic', () => {
    
    // We are testing the logic that will be inside AnkiSessionScreen. 
    // Since we can't easily unit test a React component's internal useMemo without rendering it or extracting the logic,
    // and extracting the logic is cleaner, let's assume we will extract this logic into a helper or just emulate it here 
    // to ensure our "algorithm" is correct before pasting it in. 
    // Ideally, this logic should be in a utility function, but for this task we are modifying the component directly.
    // So we will write a test that simulates the logic we ARE ABOUT TO WRITE.
    
    const selectMode = (relation: Relation) => {
        let modesToUse = relation.interactionModes || [];
        if (modesToUse.length === 0) {
            modesToUse = relation.compatibleModes || [StudyMode.Flashcards];
        }

        let mode: StudyMode;
        if (relation.design?.isRandom && modesToUse.length > 1) {
            mode = modesToUse[Math.floor(Math.random() * modesToUse.length)];
        } else {
            mode = modesToUse[0] || StudyMode.Flashcards;
        }
        return mode;
    };

    it('should default to Flashcards if no modes specified', () => {
        const relation: Relation = {
            id: 'r1',
            name: 'test',
            questionColumnIds: [],
            answerColumnIds: [],
            interactionModes: [],
            compatibleModes: [],
        };
        expect(selectMode(relation)).toBe(StudyMode.Flashcards);
    });

    it('should use the single specified interaction mode', () => {
        const relation: Relation = {
            id: 'r1',
            name: 'test',
            questionColumnIds: [],
            answerColumnIds: [],
            interactionModes: [StudyMode.Typing],
            compatibleModes: [StudyMode.Flashcards], // Should be ignored if interactionModes is present
        };
        expect(selectMode(relation)).toBe(StudyMode.Typing);
    });

    it('should pick first mode if isRandom is false', () => {
         const relation: Relation = {
            id: 'r1',
            name: 'test',
            questionColumnIds: [],
            answerColumnIds: [],
            interactionModes: [StudyMode.MultipleChoice, StudyMode.Typing],
            design: {
                front: {} as any, back: {} as any,
                isRandom: false
            }
        };
        expect(selectMode(relation)).toBe(StudyMode.MultipleChoice);
    });

    it('should pick randomly if isRandom is true', () => {
        // Mock random to return 0.99 -> index 1
        mockMath.random.mockReturnValue(0.99);
        
        const relation: Relation = {
            id: 'r1',
            name: 'test',
            questionColumnIds: [],
            answerColumnIds: [],
            interactionModes: [StudyMode.MultipleChoice, StudyMode.Typing],
            design: {
                front: {} as any, back: {} as any,
                isRandom: true
            }
        };
        
        expect(selectMode(relation)).toBe(StudyMode.Typing);
        
        // Mock random to return 0.0 -> index 0
        mockMath.random.mockReturnValue(0.0);
        expect(selectMode(relation)).toBe(StudyMode.MultipleChoice);
    });
});
