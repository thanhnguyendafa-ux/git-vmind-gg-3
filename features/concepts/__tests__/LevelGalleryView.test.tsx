import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LevelGalleryView from '../LevelGalleryView';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import { VocabRow, Concept, ConceptLevel } from '../../../types';

// Mock stores
vi.mock('../../../stores/useConceptStore');
vi.mock('../../../stores/useTableStore');

describe('LevelGalleryView', () => {
    const mockOnClose = vi.fn();
    const mockOnNavigate = vi.fn();

    const mockConcept: Concept = {
        id: 'c1',
        code: '9999',
        name: 'Test Concept',
        createdAt: 0,
        modifiedAt: 0
    };

    const mockLevels: ConceptLevel[] = [
        { id: 'l1', conceptId: 'c1', name: 'Level 1', order: 1, createdAt: 0 },
        { id: 'l2', conceptId: 'c1', name: 'Level 2', order: 2, createdAt: 0 }
    ];

    const mockRow: VocabRow = {
        id: 'r1',
        tableId: 't1',
        cols: { 'c1': 'Word 1' },
        conceptLevelId: 'l1',
        stats: { correct: 0, incorrect: 0, lastStudied: null }
    } as any;

    const mockRow2: VocabRow = {
        id: 'r2',
        tableId: 't1',
        cols: { 'c1': 'Word 2' },
        conceptLevelId: 'l2',
        stats: { correct: 0, incorrect: 0, lastStudied: null }
    } as any;

    beforeEach(() => {
        vi.clearAllMocks();

        (useConceptStore as any).mockReturnValue({
            concepts: [mockConcept],
            conceptLevels: mockLevels,
            getLevelsByConcept: () => mockLevels,
            getRowsByLevel: (levelId: string) => {
                if (levelId === 'l1') return [mockRow];
                if (levelId === 'l2') return [mockRow2];
                return [];
            }
        });

        (useTableStore as any).mockReturnValue({
            tables: [{
                id: 't1',
                rows: [mockRow, mockRow2]
            }]
        });
    });

    it('renders the gallery with concept info', () => {
        render(<LevelGalleryView currentRowId="r1" onClose={mockOnClose} onNavigateToRow={mockOnNavigate} />);

        expect(screen.getByText('Test Concept')).toBeDefined();
        expect(screen.getByText('9999')).toBeDefined();
        expect(screen.getByText('Level 1')).toBeDefined();
        expect(screen.getByText('Level 2')).toBeDefined();
    });

    it('shows cards for the current level', () => {
        render(<LevelGalleryView currentRowId="r1" onClose={mockOnClose} onNavigateToRow={mockOnNavigate} />);
        expect(screen.getByText('Word 1')).toBeDefined();
    });

    it('navigates when card is clicked', () => {
        render(<LevelGalleryView currentRowId="r1" onClose={mockOnClose} onNavigateToRow={mockOnNavigate} />);

        const card = screen.getByText('Word 1');
        fireEvent.click(card);

        expect(mockOnNavigate).toHaveBeenCalledWith('r1');
        expect(mockOnClose).toHaveBeenCalled();
    });
});
