import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnkiSessionScreen from '../AnkiSessionScreen';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { Screen, StudyMode } from '../../../types';

// Mock the child components to simplify testing
vi.mock('../../study/components/v3/UnifiedQuestionCard', () => ({
    default: ({ onAnswer }: any) => <div data-testid="unified-card"><button onClick={() => onAnswer('test')}>Answer</button></div>
}));
vi.mock('../../study/components/AnswerFeedbackPanel', () => ({
    default: () => <div data-testid="feedback-panel">Feedback</div>
}));
vi.mock('../../tables/components/RelationSettingsModal', () => ({
    default: ({ isOpen, onSave }: any) => isOpen ? (
        <div data-testid="relation-settings-modal">
            <button onClick={() => onSave({ id: 'r1', name: 'Updated' })}>Save</button>
        </div>
    ) : null
}));
vi.mock('../../components/ui/Icon', () => ({
    default: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>
}));
vi.mock('../../utils/studySessionGenerator', () => ({
    createQuestion: () => ({ id: 'q1', type: 'flashcard' }),
    convertQuestionToCard: () => ({ id: 'c1', type: 'flashcard' }),
    validateAnswer: () => true
}));

describe('AnkiSessionScreen Controls', () => {
    // Setup Mock Data
    const mockSession = {
        id: 'anki-1',
        startTime: Date.now(),
        config: {},
        newQueue: [],
        learnQueue: [],
        reviewQueue: [],
        learningQueue: [],
        history: [],
        currentCard: {
            rowId: 'row1',
            tableId: 't1',
            relationId: 'r1',
            state: 'New'
        }
    };

    const mockTable = {
        id: 't1',
        name: 'Test Table',
        rows: [{ id: 'row1', data: { front: 'Hello' } }],
        relations: [{
            id: 'r1',
            name: 'Basic',
            compatibleModes: [StudyMode.Flashcards],
            design: { front: {}, back: {} }
        }]
    };

    beforeEach(() => {
        // Reset Stores
        useSessionStore.setState({ activeAnkiSession: mockSession as any });
        useTableStore.setState({ tables: [mockTable] as any });
        useUIStore.setState({ isAnkiAutoplayEnabled: false });

        // Spy on toast
        useUIStore.getState().showToast = vi.fn();
    });

    it('TC: Render Layout - Edit Design and AutoPlay buttons exist', () => {
        render(<AnkiSessionScreen />);

        // Check for Edit Design Button (pencil icon)
        expect(screen.getByTestId('icon-pencil')).toBeInTheDocument();

        // Check for AutoPlay Button (volume-up icon)
        expect(screen.getByTestId('icon-volume-up')).toBeInTheDocument();
    });

    it('TC: AutoPlay Toggle - Clicking toggles state', () => {
        render(<AnkiSessionScreen />);

        const autoPlayBtn = screen.getByTitle('Enable Autoplay');
        expect(useUIStore.getState().isAnkiAutoplayEnabled).toBe(false);

        fireEvent.click(autoPlayBtn);

        expect(useUIStore.getState().isAnkiAutoplayEnabled).toBe(true);
        expect(screen.getByTitle('Disable Autoplay')).toBeInTheDocument();
    });

    it('TC: Edit Design - Clicking opens modal and saves', async () => {
        render(<AnkiSessionScreen />);

        // 1. Open Modal
        const editBtn = screen.getByTitle('Edit Card Design');
        fireEvent.click(editBtn);

        expect(screen.getByTestId('relation-settings-modal')).toBeInTheDocument();

        // 2. Save Change
        const saveBtn = screen.getByText('Save');
        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(screen.queryByTestId('relation-settings-modal')).not.toBeInTheDocument();
        });

        // 3. Verify Toast
        expect(useUIStore.getState().showToast).toHaveBeenCalledWith("Card design updated.", "success");

        // 4. Verify Table Store Update (Deep check not strictly needed if toast called, but good to know)
        const updatedTable = useTableStore.getState().tables.find(t => t.id === 't1');
        // Because of our mock passing { id: 'r1', name: 'Updated' }, we expect the name to change
        // Note: The mock passed specific object, real logic merges/replaces.
        // Our mock implementation in test was: `onClick={() => onSave({ ... })}`
        // And the implementation in component was: `updateTable({ ...rels })`
        // So let's check if the relation name updated.
        const updatedRel = updatedTable?.relations.find(r => r.id === 'r1');
        // The mock modal passed `name: 'Updated'`, so implementation should have saved it.
        // However, implementation map logic: `r.id === updatedRel.id ? updatedRel : r`
        // Since we passed a lightweight object `{ id: 'r1', name: 'Updated' }` in the mock, checking specifically for that.
        expect(updatedRel?.name).toBe('Updated');
    });
});
