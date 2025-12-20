import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConceptLinksScreen from '../ConceptLinksScreen';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';

// Mock stores
vi.mock('../../../stores/useConceptStore');
vi.mock('../../../stores/useTableStore');
vi.mock('../utils/ConceptLinksSample', () => ({
    createPhotosynthesisSample: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { createPhotosynthesisSample } from '../utils/ConceptLinksSample';

describe('ConceptLinksScreen', () => {
    const mockConcepts = [
        {
            id: 'concept-1',
            code: '1000',
            name: 'Mathematics',
            description: 'Math concepts',
            createdAt: Date.now(),
            modifiedAt: Date.now()
        },
        {
            id: 'concept-2',
            code: '2000',
            name: 'Science',
            description: 'Science concepts',
            parentId: 'concept-1',
            createdAt: Date.now(),
            modifiedAt: Date.now()
        }
    ];

    const mockLevels = [
        {
            id: 'level-1',
            conceptId: 'concept-1',
            name: 'Beginner',
            order: 1,
            createdAt: Date.now()
        },
        {
            id: 'level-2',
            conceptId: 'concept-1',
            name: 'Intermediate',
            order: 2,
            createdAt: Date.now()
        }
    ];

    beforeEach(() => {
        // Reset mocks with a full set of functions
        vi.mocked(useConceptStore).mockReturnValue({
            concepts: mockConcepts,
            conceptLevels: mockLevels,
            getRootConcepts: vi.fn(() => [mockConcepts[0]]),
            getChildConcepts: vi.fn((parentId) =>
                parentId === 'concept-1' ? [mockConcepts[1]] : []
            ),
            getLevelsByConcept: vi.fn(() => mockLevels),
            getRowsByLevel: vi.fn(() => []),
            searchConceptsByName: vi.fn(() => mockConcepts),
            searchCardsByConceptLevel: vi.fn(() => []),
            createConcept: vi.fn(),
            updateConcept: vi.fn(),
            deleteConcept: vi.fn(),
            createLevel: vi.fn(),
            updateLevel: vi.fn(),
            deleteLevel: vi.fn(),
            getConceptByCode: vi.fn(),
            getConceptHierarchy: vi.fn(() => [])
        } as any);

        vi.mocked(useTableStore).mockReturnValue({
            tables: [],
            folders: []
        } as any);

        vi.mocked(createPhotosynthesisSample).mockClear();
    });

    it('renders the screen correctly', () => {
        render(<ConceptLinksScreen />);
        expect(screen.getByText('Concept Links')).toBeInTheDocument();
    });

    it('displays concept tree in sidebar', () => {
        render(<ConceptLinksScreen />);
        expect(screen.getByText(/Mathematics/)).toBeInTheDocument();
        expect(screen.getByText(/1000/)).toBeInTheDocument();
    });

    it('handles search query changes', () => {
        render(<ConceptLinksScreen />);
        const searchInput = screen.getByPlaceholderText(/Search concepts/);
        fireEvent.change(searchInput, { target: { value: 'Math' } });
        expect(searchInput).toHaveValue('Math');
    });

    it('clears search when X button is clicked', () => {
        render(<ConceptLinksScreen />);
        const searchInput = screen.getByPlaceholderText(/Search concepts/);
        fireEvent.change(searchInput, { target: { value: 'test' } });

        const clearButton = screen.getByLabelText('Clear search');
        fireEvent.click(clearButton);
        expect(searchInput).toHaveValue('');
    });

    it('switches between Kanban and Analytics views', async () => {
        render(<ConceptLinksScreen />);

        const analyticsTab = screen.getByText('Analytics');
        fireEvent.click(analyticsTab);
        expect(screen.getByText(/Overall Success/i)).toBeInTheDocument();

        const kanbanTab = screen.getByText('Kanban');
        fireEvent.click(kanbanTab);
        expect(screen.getByText('Beginner')).toBeInTheDocument();
    });

    it('handles example data creation', async () => {
        vi.mocked(createPhotosynthesisSample).mockResolvedValue('new-id');
        render(<ConceptLinksScreen />);

        const exampleButton = screen.getByText('Example');
        fireEvent.click(exampleButton);

        await waitFor(() => {
            expect(createPhotosynthesisSample).toHaveBeenCalled();
        });
    });
});
