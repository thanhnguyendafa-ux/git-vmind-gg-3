

// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

import RelationSettingsModal from '../../../../features/tables/components/RelationSettingsModal';
import { useUIStore } from '../../../../stores/useUIStore';
import { Table, Relation, StudyMode, VocabRow, FlashcardStatus } from '../../../../types';

// Mock globals
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var vi: any;
declare var beforeEach: (fn: () => void) => void;

// Mock UI Store
vi.mock('../../../../stores/useUIStore', () => ({
  useUIStore: vi.fn(),
}));

const mockTable: Table = {
  id: 'table1',
  name: 'Test Table',
  columns: [
    { id: 'col1', name: 'Word' },
    { id: 'col2', name: 'Definition' },
  ],
  rows: [
      { id: 'row1', cols: { 'col1': 'Apple', 'col2': 'A fruit' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }} as VocabRow,
  ],
  relations: [],
};

const mockRelation: Relation = {
  id: 'rel1',
  name: 'Word -> Definition',
  questionColumnIds: ['col1'],
  answerColumnIds: ['col2'],
  compatibleModes: [StudyMode.Flashcards],
};

describe('RelationSettingsModal Theme Integrity', () => {

  it('TC_THEME_01: Template "Minimalist" in Dark Mode', async () => {
    // 1. Setup Environment: Dark Mode
    vi.mocked(useUIStore).mockReturnValue({
      theme: 'dark',
    } as any);

    const user = userEvent.setup();
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    // FIX: The component was rendered without required props. All necessary props are now provided.
    // FIX: Replaced broken JSX render call with React.createElement and a valid props object.
    render(
      React.createElement(RelationSettingsModal, {
        isOpen: true,
        onClose: handleClose,
        onSave: handleSave,
        relation: mockRelation,
        table: mockTable,
        initialTab: "design"
      })
    );

    // 2. Action: Select "Minimalist" Template
    // The design panel is now rendered directly without a tab button in this setup for desktop (or initialTab).
    // Just need to uncheck random template first.
    const randomTemplateCheckbox = screen.getByLabelText('Random Template');
    await user.click(randomTemplateCheckbox);

    const minimalistTemplateBtn = await screen.findByTitle('Minimalist');
    await user.click(minimalistTemplateBtn);

    // 3. Verification: Check Card Styles
    // The text "Apple" comes from the mock row and should be rendered on the card.
    const cardTextElement = await screen.findByText(/\[Word Data\]/); // The preview uses placeholder text
    
    // The `getCardStyle` function in the component doesn't resolve CSS variables, the browser does.
    // The test fails because it can't resolve them. The component is correct though.
    // A better way is to check that the CSS variable was set correctly.
    let cardFace: HTMLElement | null = null;
    let current: HTMLElement | null = cardTextElement;
    
    while (current) {
        if (current.classList.contains('card-front')) {
            cardFace = current;
            break;
        }
        current = current.parentElement;
    }

    expect(cardFace).toBeInTheDocument();
    
    // FIX: Verify that the correct CSS variable is being applied, rather than asserting a resolved color value that JSDOM cannot compute.
    if (cardFace) {
        // The Minimalist template sets the background to `var(--color-surface)`.
        expect(cardFace.style.background).toBe('var(--color-surface)');
    }
  });
});