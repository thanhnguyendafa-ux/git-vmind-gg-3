
// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

import RelationSettingsModal from '../../../../features/tables/components/RelationSettingsModal';
import { useUIStore } from '../../../../stores/useUIStore';
import { Table, Relation, StudyMode, VocabRow, FlashcardStatus } from '../../../../types';
import { DESIGN_TEMPLATES } from '../../../../features/tables/designConstants';

// Mock test globals
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var vi: any;
declare var beforeEach: (fn: () => void) => void;

// Mock the UI store
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

describe('RelationSettingsModal', () => {

  beforeEach(() => {
    vi.mocked(useUIStore).mockReturnValue({
      theme: 'light',
    } as any);
  });

  it('TC2.1: should apply a design template when selected and saved', async () => {
    // FIX: Add user-event setup.
    const user = userEvent.setup();
    const handleSave = vi.fn();
    const handleClose = vi.fn();
    
    const templateToTest = DESIGN_TEMPLATES.find(t => t.name === 'Graphite & Gold');
    expect(templateToTest).toBeDefined();

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
    
// FIX: Uncheck "Random Template" to allow specific template selection.
    const randomTemplateCheckbox = screen.getByLabelText('Random Template');
    await user.click(randomTemplateCheckbox);
    
    // Find and click the template
    const templateButton = await screen.findByTitle('Graphite & Gold');
    await user.click(templateButton);

    // Save the changes
    const saveButton = screen.getByRole('button', { name: 'Save Relation' });
    await user.click(saveButton);

    // Assert: onSave was called
    expect(handleSave).toHaveBeenCalledTimes(1);
    
    // Assert: The saved relation has the correct design properties from the template
    const savedRelation = handleSave.mock.calls[0][0] as Relation;
    expect(savedRelation.design).toBeDefined();
    expect(savedRelation.design?.front.backgroundValue).toBe(templateToTest!.design.front.backgroundValue);
    expect(savedRelation.design?.back.backgroundValue).toBe(templateToTest!.design.back.backgroundValue);
  });

  it('TC2.2: should apply the correct default typography from a template', async () => {
    // FIX: Add user-event setup.
    const user = userEvent.setup();
    const handleSave = vi.fn();
    
    const templateToTest = DESIGN_TEMPLATES.find(t => t.name === 'Classic Ivory');
    expect(templateToTest).toBeDefined();

    render(
      React.createElement(RelationSettingsModal, {
        isOpen: true,
        onClose: () => {},
        onSave: handleSave,
        relation: mockRelation,
        table: mockTable,
        initialTab: "design"
      })
    );

// FIX: Uncheck "Random Template" to allow specific template selection.
    const randomTemplateCheckbox = screen.getByLabelText('Random Template');
    await user.click(randomTemplateCheckbox);
    await user.click(await screen.findByTitle('Classic Ivory'));
    await user.click(screen.getByRole('button', { name: 'Save Relation' }));
    
    // Assert: Check the typography of the saved relation
    const savedRelation = handleSave.mock.calls[0][0] as Relation;
    const frontTypography = savedRelation.design?.front.typography[mockRelation.questionColumnIds[0]];
    
    // Check one specific property to confirm the object was applied.
    expect(frontTypography?.fontFamily).toBe(templateToTest!.frontTypography.fontFamily);
    expect(frontTypography?.fontSize).toBe(templateToTest!.frontTypography.fontSize);
  });
});
