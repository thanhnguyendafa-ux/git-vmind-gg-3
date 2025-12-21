import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConceptLinksScreen from '../ConceptLinksScreen';
import React from 'react';

// Mock Stores
vi.mock('../../../stores/useConceptStore', () => ({
    useConceptStore: () => ({
        concepts: [],
        getRootConcepts: () => [],
        getChildConcepts: () => [],
        deleteConcept: vi.fn()
    })
}));

vi.mock('../../../stores/useUIStore', () => ({
    useUIStore: () => ({
        selectedConceptId: null,
        setSelectedConceptId: vi.fn(),
        expandedConceptIds: [],
        setExpandedConceptIds: vi.fn(),
        toggleExpandedConceptId: vi.fn(),
        theme: 'light',
        showToast: vi.fn()
    })
}));

describe('ConceptLinks Redesign UI', () => {
    it('renders the Knowledge Tree Sidebar and Header', () => {
        render(<ConceptLinksScreen />);

        expect(screen.getByText('Concept Links')).toBeDefined();
        expect(screen.getByText('Knowledge Tree')).toBeDefined();
    });

    it('renders primary action buttons with new labels', () => {
        render(<ConceptLinksScreen />);

        expect(screen.getByText('Seed Sample')).toBeDefined();
        expect(screen.getByText('New Concept')).toBeDefined();
    });

    it('contains the search input with glassmorphism placeholder', () => {
        render(<ConceptLinksScreen />);
        expect(screen.getByPlaceholderText('Search concepts...')).toBeDefined();
    });
});
