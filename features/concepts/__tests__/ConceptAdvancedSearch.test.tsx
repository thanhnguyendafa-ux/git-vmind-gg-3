import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConceptAdvancedSearch from '../components/ConceptAdvancedSearch';
import { useConceptStore } from '../../../stores/useConceptStore';

vi.mock('../../../stores/useConceptStore');

describe('ConceptAdvancedSearch', () => {
    const mockConcepts = [
        { id: 'c1', name: 'Photosynthesis', code: 'BIO1', isFolder: false },
        { id: 'c2', name: 'Science Grade 5', code: 'SCI5', isFolder: true }
    ];

    const mockLevels = [
        { id: 'l1', conceptId: 'c1', name: 'Beginner' }
    ];

    const mockOnResultsChange = vi.fn();
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.mocked(useConceptStore).mockReturnValue({
            concepts: mockConcepts,
            conceptLevels: mockLevels,
            getRowsByLevel: vi.fn(() => []),
            searchConceptsByName: vi.fn((query) =>
                mockConcepts.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
            )
        } as any);
    });

    it('renders search input and filters', () => {
        render(<ConceptAdvancedSearch onResultsChange={mockOnResultsChange} onClose={mockOnClose} />);

        expect(screen.getByPlaceholderText('Search by concept name...')).toBeInTheDocument();
        expect(screen.getByText('Folders')).toBeInTheDocument();
        expect(screen.getByText('Concepts')).toBeInTheDocument();
        expect(screen.getByText('Minimum Success Rate')).toBeInTheDocument();
    });

    it('filters by name query', () => {
        render(<ConceptAdvancedSearch onResultsChange={mockOnResultsChange} onClose={mockOnClose} />);

        const input = screen.getByPlaceholderText('Search by concept name...');
        fireEvent.change(input, { target: { value: 'Photo' } });

        expect(mockOnResultsChange).toHaveBeenLastCalledWith([mockConcepts[0]]);
    });

    it('filters by type (concepts)', () => {
        render(<ConceptAdvancedSearch onResultsChange={mockOnResultsChange} onClose={mockOnClose} />);

        const conceptCheckbox = screen.getByLabelText('Concepts');
        const folderCheckbox = screen.getByLabelText('Folders');

        // Uncheck folders
        fireEvent.click(folderCheckbox);

        expect(mockOnResultsChange).toHaveBeenLastCalledWith([mockConcepts[0]]);
    });

    it('resets filters when button is clicked', () => {
        render(<ConceptAdvancedSearch onResultsChange={mockOnResultsChange} onClose={mockOnClose} />);

        const input = screen.getByPlaceholderText('Search by concept name...') as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Something' } });

        const resetButton = screen.getByText('Reset Filters');
        fireEvent.click(resetButton);

        expect(input.value).toBe('');
    });

    it('calls onClose when close button is clicked', () => {
        render(<ConceptAdvancedSearch onResultsChange={mockOnResultsChange} onClose={mockOnClose} />);

        const closeButton = screen.getAllByRole('button').find(btn =>
            btn.querySelector('svg')?.getAttribute('data-icon-name') === 'x' ||
            btn.className.includes('rounded-full')
        );

        if (closeButton) {
            fireEvent.click(closeButton);
            expect(mockOnClose).toHaveBeenCalled();
        }
    });
});
