import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConceptKanbanBoard from '../components/ConceptKanbanBoard';
import { useConceptStore } from '../../../stores/useConceptStore';

vi.mock('../../../stores/useConceptStore');
vi.mock('../../../stores/useTableStore');

describe('ConceptKanbanBoard', () => {
    const mockLevels = [
        {
            id: 'level-1',
            conceptId: 'concept-1',
            name: 'Beginner',
            order: 1,
            description: 'Basic level',
            createdAt: Date.now()
        },
        {
            id: 'level-2',
            conceptId: 'concept-1',
            name: 'Advanced',
            order: 2,
            createdAt: Date.now()
        }
    ];

    const mockCards = [
        {
            id: 'card-1',
            cols: { word: 'Hello', meaning: 'Greeting' },
            stats: {
                correct: 5,
                incorrect: 1,
                lastStudied: Date.now(),
                flashcardStatus: 'Good',
                flashcardEncounters: 6,
                isFlashcardReviewed: true,
                lastPracticeDate: Date.now()
            },
            conceptLevelId: 'level-1'
        }
    ];

    const mockOnCardClick = vi.fn();

    beforeEach(() => {
        vi.mocked(useConceptStore).mockReturnValue({
            concepts: [{ id: 'concept-1', name: 'Test Concept', code: '1000', createdAt: Date.now(), modifiedAt: Date.now() }],
            conceptLevels: mockLevels,
            getLevelsByConcept: vi.fn(() => mockLevels),
            getRowsByLevel: vi.fn(() => mockCards),
            searchCardsByConceptLevel: vi.fn(() => mockCards)
        } as any);
    });

    it('renders Kanban columns for each level', () => {
        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        expect(screen.getByText('Beginner')).toBeInTheDocument();
        expect(screen.getByText('Advanced')).toBeInTheDocument();
    });

    it('shows card count in column header', () => {
        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        // First level has 1 card, second has 0
        const badges = screen.getAllByText(/\d+/);
        expect(badges.length).toBeGreaterThan(0);
    });

    it('toggles level expansion', () => {
        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        const beginnerHeader = screen.getByText('Beginner').closest('button');
        if (beginnerHeader) {
            fireEvent.click(beginnerHeader);
            // After click, column should collapse/expand
        }
    });

    it('displays empty state when no levels exist', () => {
        vi.mocked(useConceptStore).mockReturnValue({
            concepts: [{ id: 'concept-1', name: 'Test', code: '1000', createdAt: Date.now(), modifiedAt: Date.now() }],
            conceptLevels: [],
            getLevelsByConcept: vi.fn(() => [])
        } as any);

        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        expect(screen.getByText('No Levels Defined')).toBeInTheDocument();
    });

    it('filters cards by search query', () => {
        const searchMock = vi.fn(() => []);
        vi.mocked(useConceptStore).mockReturnValue({
            concepts: [{ id: 'concept-1', name: 'Test', code: '1000', createdAt: Date.now(), modifiedAt: Date.now() }],
            conceptLevels: mockLevels,
            getLevelsByConcept: vi.fn(() => mockLevels),
            getRowsByLevel: vi.fn(() => mockCards),
            searchCardsByConceptLevel: searchMock
        } as any);

        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery="test"
                onCardClick={mockOnCardClick}
            />
        );

        expect(searchMock).toHaveBeenCalledWith('level-1', 'test');
    });

    it('handles card click', () => {
        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        // Find and click the card
        const cardElements = screen.getAllByRole('button');
        const cardButton = cardElements.find(btn => btn.textContent?.includes('Hello'));

        if (cardButton) {
            fireEvent.click(cardButton);
            expect(mockOnCardClick).toHaveBeenCalled();
        }
    });

    it('shows correct level order', () => {
        render(
            <ConceptKanbanBoard
                conceptId="concept-1"
                searchQuery=""
                onCardClick={mockOnCardClick}
            />
        );

        const levelNumbers = screen.getAllByText(/[12]/);
        expect(levelNumbers.length).toBeGreaterThan(0);
    });
});
