import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConceptAnalytics from '../components/ConceptAnalytics';
import { useConceptStore } from '../../../stores/useConceptStore';

vi.mock('../../../stores/useConceptStore');

describe('ConceptAnalytics', () => {
    const mockLevels = [
        { id: 'l1', name: 'Level 1', order: 1, conceptId: 'c1' },
        { id: 'l2', name: 'Level 2', order: 2, conceptId: 'c1' }
    ];

    const mockCardsL1 = [
        { id: 'card1', stats: { correct: 10, incorrect: 2 }, lastStudied: Date.now() },
        { id: 'card2', stats: { correct: 5, incorrect: 5 }, lastStudied: Date.now() }
    ];

    const mockCardsL2 = [
        { id: 'card3', stats: { correct: 8, incorrect: 0 }, lastStudied: Date.now() }
    ];

    beforeEach(() => {
        vi.mocked(useConceptStore).mockReturnValue({
            getLevelsByConcept: vi.fn(() => mockLevels),
            getRowsByLevel: vi.fn((levelId) => levelId === 'l1' ? mockCardsL1 : mockCardsL2),
        } as any);
    });

    it('renders overall summary cards', () => {
        render(<ConceptAnalytics conceptId="c1" />);

        expect(screen.getByText('Total Cards')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // 2 in L1 + 1 in L2

        expect(screen.getByText('Studied Cards')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // All cards have lastStudied
    });

    it('calculates and displays overall success rate', () => {
        render(<ConceptAnalytics conceptId="c1" />);

        // Total Correct: 10 + 5 + 8 = 23
        // Total Attempts: (10+2) + (5+5) + (8+0) = 12 + 10 + 8 = 30
        // Rate: 23 / 30 * 100 = 76.66%
        expect(screen.getByText('Overall Success')).toBeInTheDocument();
        expect(screen.getByText(/76\.7%/)).toBeInTheDocument();
    });

    it('renders level-wise breakdown', () => {
        render(<ConceptAnalytics conceptId="c1" />);

        expect(screen.getByText('Level 1')).toBeInTheDocument();
        expect(screen.getByText('Level 2')).toBeInTheDocument();

        // Level 1: 15 correct / 22 attempts = 68.2%
        // Level 2: 8 correct / 8 attempts = 100%
        expect(screen.getByText(/68\.2%/)).toBeInTheDocument();
        expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('shows correct card counts per level', () => {
        render(<ConceptAnalytics conceptId="c1" />);

        expect(screen.getByText('2 cards')).toBeInTheDocument(); // Level 1
        expect(screen.getByText('1 card')).toBeInTheDocument();  // Level 2
    });
});
