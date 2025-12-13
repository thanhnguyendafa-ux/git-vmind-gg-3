// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useTableStore } from './useTableStore';
import { Table, VocabRow, FlashcardStatus } from '../types';

// Declare test globals to satisfy TypeScript in environments without full test runner types.
declare var describe: (name: string, fn: () => void) => void;
declare var it: (name: string, fn: () => void) => void;
declare var expect: (actual: any) => any;
declare var beforeEach: (fn: () => void) => void;

// Initial state for resetting before each test
const initialState = { tables: [], folders: [] };

describe('useTableStore', () => {

  beforeEach(() => {
    act(() => {
      useTableStore.setState(initialState);
    });
  });

  it('should create a new table', async () => {
    await act(async () => {
      await useTableStore.getState().createTable('Spanish Verbs', 'Infinitive, Conjugation');
    });

    const { tables } = useTableStore.getState();
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('Spanish Verbs');
    expect(tables[0].columns).toHaveLength(2);
    expect(tables[0].columns[0].name).toBe('Infinitive');
  });

  it('should delete a table', async () => {
    await act(async () => {
      await useTableStore.getState().createTable('Test Table', 'Col1');
    });

    const tableId = useTableStore.getState().tables[0].id;
    
    await act(async () => {
      await useTableStore.getState().deleteTable(tableId);
    });

    expect(useTableStore.getState().tables).toHaveLength(0);
  });

  it('should update a table', async () => {
    await act(async () => {
      await useTableStore.getState().createTable('Old Name', 'Col1');
    });
    
    const table = useTableStore.getState().tables[0];
    const updatedTable = { ...table, name: 'New Name' };

    await act(async () => {
      await useTableStore.getState().updateTable(updatedTable);
    });

    expect(useTableStore.getState().tables[0].name).toBe('New Name');
  });

  it('should import new tables', () => {
    const importedTables: Table[] = [
      { id: 'import-1', name: 'Imported 1', columns: [], rows: [], relations: [] },
    ];

    act(() => {
      useTableStore.getState().importTables(importedTables);
    });

    const { tables } = useTableStore.getState();
    expect(tables).toHaveLength(1);
    expect(tables[0].name).toBe('Imported 1');
  });
  
  it('should append rows to an existing table on import', async () => {
     await act(async () => {
      await useTableStore.getState().createTable('Existing Table', 'Word');
    });

    const existingTableId = useTableStore.getState().tables[0].id;
    const rowsToAppend: VocabRow[] = [
        { id: 'row-import-1', cols: { 'col1': 'new word' }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } }
    ];
    const tableToImport: Table = { id: 'import-2', name: 'Append Data', columns: [], rows: rowsToAppend, relations: [] };

    act(() => {
      useTableStore.getState().importTables([tableToImport], existingTableId);
    });

    const updatedTable = useTableStore.getState().tables.find(t => t.id === existingTableId);
    expect(updatedTable?.rows).toHaveLength(1);
    expect(updatedTable?.rows[0].id).toBe('row-import-1');
  });

  describe('createAnkiStyleTable', () => {
    it('should create a table with Front and Back columns', async () => {
      await act(async () => {
        await useTableStore.getState().createAnkiStyleTable('My Anki Deck', []);
      });
      const { tables } = useTableStore.getState();
      expect(tables).toHaveLength(1);
      expect(tables[0].name).toBe('My Anki Deck');
      expect(tables[0].columns).toHaveLength(2);
      expect(tables[0].columns.map(c => c.name).sort()).toEqual(['Back', 'Front']);
    });

    it('should create two relations: Front -> Back and Back -> Front', async () => {
        await act(async () => {
            await useTableStore.getState().createAnkiStyleTable('My Anki Deck', []);
        });
        const table = useTableStore.getState().tables[0];
        const frontCol = table.columns.find(c => c.name === 'Front');
        const backCol = table.columns.find(c => c.name === 'Back');
        
        expect(table.relations).toHaveLength(2);

        const rel1 = table.relations.find(r => r.name === 'Front -> Back');
        expect(rel1).toBeDefined();
        expect(rel1?.questionColumnIds).toEqual([frontCol?.id]);
        expect(rel1?.answerColumnIds).toEqual([backCol?.id]);

        const rel2 = table.relations.find(r => r.name === 'Back -> Front');
        expect(rel2).toBeDefined();
        expect(rel2?.questionColumnIds).toEqual([backCol?.id]);
        expect(rel2?.answerColumnIds).toEqual([frontCol?.id]);
    });

    it('should apply a random design to the new relations', async () => {
        await act(async () => {
            await useTableStore.getState().createAnkiStyleTable('My Anki Deck', []);
        });
        const table = useTableStore.getState().tables[0];
        expect(table.relations[0].design).toBeDefined();
        expect(table.relations[1].design).toBeDefined();
        expect(typeof table.relations[0].design?.front.backgroundValue).toBe('string');
    });
  });
});
