import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TableView from '../components/TableView';
import { useUIStore } from '../../../stores/useUIStore';
import { useTableView } from '../contexts/TableViewContext';
import { Screen, FlashcardStatus } from '../../../types';
import { useVirtualizer } from '@tanstack/react-virtual';
import React from 'react';

// Mock dependencies
vi.mock('@tanstack/react-virtual', () => ({
    useVirtualizer: vi.fn(),
}));

vi.mock('../../../stores/useUIStore');
vi.mock('../contexts/TableViewContext');
vi.mock('../../../stores/useTableStore', () => ({
    useTableStore: () => ({
        batchUpdateRows: vi.fn(),
    }),
}));

vi.mock('../../../components/ui/Icon', () => ({
    default: ({ name, className, title }: any) => (
        <span data-testid="mock-icon" data-icon-name={name} className={className} title={title}>
            {name}
        </span>
    ),
}));

vi.mock('./RichCell', () => ({
    default: ({ value }: any) => <div data-testid="mock-rich-cell">{value}</div>,
}));

vi.mock('../../../components/ui/Popover', () => ({
    default: ({ trigger }: any) => <div data-testid="mock-popover">{trigger}</div>,
}));

const mockTable = {
    id: 'table1',
    name: 'Test Table',
    shortCode: 'TST',
    columns: [{ id: 'col1', name: 'Word' }],
    rows: [],
    relations: [],
};

const mockRows = [
    {
        id: 'row1',
        rowIdNum: 1,
        cols: { col1: 'Linked Word' },
        conceptLevelId: 'level1', // Linked
        stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
    },
    {
        id: 'row2',
        rowIdNum: 2,
        cols: { col1: 'Unlinked Word' },
        stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
        createdAt: Date.now(),
        modifiedAt: Date.now(),
    }
];

describe('TableConceptLink Indicator', () => {
    const mockSetSelectedConceptId = vi.fn();
    const mockSetCurrentScreen = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        (useUIStore as any).mockImplementation(() => ({
            showToast: vi.fn(),
            setSelectedConceptId: mockSetSelectedConceptId,
            setCurrentScreen: mockSetCurrentScreen,
            selectedRows: new Set(),
            visibleColumns: new Set(['col1']),
            visibleStats: new Set(),
            showRowId: true,
            columnWidths: {},
            rowHeight: 'medium',
            fontSize: 'base',
            columnOrder: ['system:rowIdNum', 'col1'],
        }));

        (useTableView as any).mockImplementation(() => ({
            state: {
                selectedRows: new Set(),
                visibleColumns: new Set(['col1']),
                visibleStats: new Set(),
                grouping: null,
                sorts: [],
                columnWidths: {},
                rowHeight: 'medium',
                isTextWrapEnabled: false,
                fontSize: 'base',
                isBandedRows: false,
                showRowId: true,
                columnOrder: ['system:rowIdNum', 'col1'],
                frozenColumnCount: 0,
                selectedCell: null,
                dragTarget: null,
                isDraggingHandle: false,
                isSelecting: false,
                selectedRangeIds: new Set(),
            },
            dispatch: vi.fn(),
        }));

        // Mock ResizeObserver
        (global as any).ResizeObserver = class ResizeObserver {
            observe() { }
            unobserve() { }
            disconnect() { }
        };

        (useVirtualizer as any).mockReturnValue({
            getVirtualItems: () => mockRows.map((_, index) => ({
                index,
                start: index * 48,
                size: 48,
                key: index,
            })),
            getTotalSize: () => mockRows.length * 48,
            measure: vi.fn(),
        });
    });

    it('renders the concept link icon for linked rows and NOT for unlinked rows', () => {
        render(
            <TableView
                table={mockTable}
                rows={mockRows}
                groupedRows={null}
                sortableStats={[]}
                onViewRow={vi.fn()}
                onEditRow={vi.fn()}
                onDeleteRow={vi.fn()}
                onPreviewRow={vi.fn()}
                onConfigureAI={vi.fn()}
                onConfigureLink={vi.fn()}
                fillableCells={new Set()}
                onManageColumns={vi.fn()}
            />
        );

        // Find all "View Linked Concept" buttons
        const linkButtons = screen.queryAllByTitle('View Linked Concept');
        expect(linkButtons).toHaveLength(1);

        // Check text content to verify which row has the button
        const row1 = screen.getByText('TST001').closest('div');
        const row2 = screen.getByText('TST002').closest('div');

        expect(row1?.querySelector('button[title="View Linked Concept"]')).toBeTruthy();
        expect(row2?.querySelector('button[title="View Linked Concept"]')).toBeFalsy();
    });

    it('navigates to ConceptLinks screen and sets selectedConceptId when clicked', () => {
        render(
            <TableView
                table={mockTable}
                rows={mockRows}
                groupedRows={null}
                sortableStats={[]}
                onViewRow={vi.fn()}
                onEditRow={vi.fn()}
                onDeleteRow={vi.fn()}
                onPreviewRow={vi.fn()}
                onConfigureAI={vi.fn()}
                onConfigureLink={vi.fn()}
                fillableCells={new Set()}
                onManageColumns={vi.fn()}
            />
        );

        const linkButton = screen.getByTitle('View Linked Concept');
        fireEvent.click(linkButton);

        expect(mockSetSelectedConceptId).toHaveBeenCalledWith('level1');
        expect(mockSetCurrentScreen).toHaveBeenCalledWith(Screen.ConceptLinks);
    });
});
