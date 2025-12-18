import * as React from 'react';
import { Filter, Sort, VocabRow, Column } from '../../../types';

// State interface
interface TableViewState {
  filters: Filter[];
  sorts: Sort[];
  grouping: { columnId: string } | null;
  selectedRows: Set<string>;
  visibleColumns: Set<string>;
  visibleStats: Set<string>;
  currentPage: number;
  columnWidths: Record<string, number>;
  rowHeight: 'short' | 'medium' | 'tall';
  isTextWrapEnabled: boolean;
  searchQuery: string;
  fontSize: 'sm' | 'base' | 'lg';
  isBandedRows: boolean;
  showRowId: boolean;
  
  // Cell Selection & Drag State
  selectedCell: { rowId: string; columnId: string } | null;
  editingCell: { rowId: string; columnId: string } | null;
  dragTarget: { rowId: string; columnId: string } | null;
  isDraggingHandle: boolean;

  // Multi-Cell Selection State
  isSelecting: boolean;
  selectionAnchor: { rowId: string; colId: string } | null;
  selectedRangeIds: Set<string>;

  // New View Settings
  columnOrder: string[];
  frozenColumnCount: number;
}

// Action types
type Action =
  | { type: 'SET_FILTERS'; payload: Filter[] }
  | { type: 'SET_SORTS'; payload: Sort[] }
  | { type: 'SET_GROUPING'; payload: { columnId: string } | null }
  | { type: 'TOGGLE_ROW_SELECTION'; payload: string }
  | { type: 'SET_SELECTED_ROWS'; payload: Set<string> }
  | { type: 'SET_VISIBLE_COLUMNS'; payload: Set<string> }
  | { type: 'SET_VISIBLE_STATS'; payload: Set<string> }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'RESET_VIEW'; payload: { columns: Column[] } }
  | { type: 'INITIALIZE_VIEW_SETTINGS'; payload: Partial<Pick<TableViewState, 'columnWidths' | 'rowHeight' | 'isTextWrapEnabled' | 'fontSize' | 'isBandedRows' | 'showRowId' | 'columnOrder' | 'frozenColumnCount'>> & { visibleColumns?: string[] } }
  | { type: 'SET_COLUMN_WIDTH'; payload: { columnId: string; width: number } }
  | { type: 'SET_ROW_HEIGHT'; payload: 'short' | 'medium' | 'tall' }
  | { type: 'TOGGLE_TEXT_WRAP' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_FONT_SIZE'; payload: 'sm' | 'base' | 'lg' }
  | { type: 'TOGGLE_BANDED_ROWS' }
  | { type: 'TOGGLE_SHOW_ROW_ID' }
  | { type: 'SET_SELECTED_CELL'; payload: { rowId: string; columnId: string } | null }
  | { type: 'SET_EDITING_CELL'; payload: { rowId: string; columnId: string } | null }
  | { type: 'SET_DRAG_TARGET'; payload: { rowId: string; columnId: string } | null }
  | { type: 'SET_IS_DRAGGING_HANDLE'; payload: boolean }
  | { type: 'SET_COLUMN_ORDER'; payload: string[] }
  | { type: 'SET_FROZEN_COUNT'; payload: number }
  // Range Selection Actions
  | { type: 'START_SELECTION'; payload: { rowId: string; colId: string } }
  | { type: 'UPDATE_SELECTION'; payload: Set<string> }
  | { type: 'END_SELECTION' }
  | { type: 'CLEAR_SELECTION' };

const DEFAULT_SORT: Sort[] = [{ id: 'default-id-sort', key: 'system:rowIdNum', direction: 'desc' }];

const SYSTEM_ID_COL = 'system:rowIdNum';

// Reducer
const tableViewReducer = (state: TableViewState, action: Action): TableViewState => {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, currentPage: 1, selectedRows: new Set() };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload, currentPage: 1, selectedRows: new Set() };
    case 'SET_SORTS':
      return { ...state, sorts: action.payload, currentPage: 1 };
    case 'SET_GROUPING':
        return { ...state, grouping: action.payload, currentPage: 1 };
    case 'TOGGLE_ROW_SELECTION': {
      const newSelectedRows = new Set(state.selectedRows);
      if (newSelectedRows.has(action.payload)) {
        newSelectedRows.delete(action.payload);
      } else {
        newSelectedRows.add(action.payload);
      }
      return { ...state, selectedRows: newSelectedRows };
    }
    case 'SET_SELECTED_ROWS':
      return { ...state, selectedRows: action.payload };
    case 'SET_VISIBLE_COLUMNS':
      return { ...state, visibleColumns: action.payload };
    case 'SET_VISIBLE_STATS':
      return { ...state, visibleStats: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'RESET_VIEW':
      return {
        ...state,
        filters: [],
        sorts: DEFAULT_SORT,
        grouping: null,
        selectedRows: new Set(),
        visibleColumns: new Set(action.payload.columns.map(c => c.id)),
        columnOrder: [SYSTEM_ID_COL, ...action.payload.columns.map(c => c.id)],
        frozenColumnCount: 1, // Reset to 1 to keep ID frozen by default
        searchQuery: '',
        currentPage: 1,
        editingCell: null,
        selectedCell: null,
        // Reset selection state
        isSelecting: false,
        selectionAnchor: null,
        selectedRangeIds: new Set(),
      };
    case 'INITIALIZE_VIEW_SETTINGS':
        const { visibleColumns, isBandedRows, columnOrder, frozenColumnCount, ...restPayload } = action.payload;
        
        let initialOrder = columnOrder || state.columnOrder;
        if (!initialOrder.includes(SYSTEM_ID_COL)) {
            initialOrder = [SYSTEM_ID_COL, ...initialOrder];
        }

        return { 
            ...state, 
            ...restPayload,
            isBandedRows: isBandedRows ?? state.isBandedRows,
            visibleColumns: visibleColumns ? new Set(visibleColumns) : state.visibleColumns,
            columnOrder: initialOrder,
            frozenColumnCount: frozenColumnCount ?? 1 // Default to 1 if not set
        };
    case 'SET_COLUMN_WIDTH':
      return {
        ...state,
        columnWidths: {
          ...state.columnWidths,
          [action.payload.columnId]: action.payload.width,
        },
      };
    case 'SET_ROW_HEIGHT':
      return { ...state, rowHeight: action.payload };
    case 'TOGGLE_TEXT_WRAP':
      return { ...state, isTextWrapEnabled: !state.isTextWrapEnabled };
    case 'SET_FONT_SIZE':
        return { ...state, fontSize: action.payload };
    case 'TOGGLE_BANDED_ROWS':
        return { ...state, isBandedRows: !state.isBandedRows };
    case 'TOGGLE_SHOW_ROW_ID':
        return { ...state, showRowId: !state.showRowId };
    case 'SET_SELECTED_CELL':
        return { 
          ...state, 
          selectedCell: action.payload, 
          editingCell: null,
          // Choosing a single cell clears range selection unless it's a drag start which is handled separately
          selectedRangeIds: new Set(),
          selectionAnchor: null
        };
    case 'SET_EDITING_CELL':
        return { ...state, editingCell: action.payload, selectedCell: action.payload || state.selectedCell };
    case 'SET_DRAG_TARGET':
        return { ...state, dragTarget: action.payload };
    case 'SET_IS_DRAGGING_HANDLE':
        return { ...state, isDraggingHandle: action.payload, dragTarget: action.payload ? state.dragTarget : null };
    case 'SET_COLUMN_ORDER':
        return { ...state, columnOrder: action.payload };
    case 'SET_FROZEN_COUNT':
        return { ...state, frozenColumnCount: action.payload };
    
    // Range Selection
    case 'START_SELECTION':
        return {
            ...state,
            isSelecting: true,
            selectionAnchor: action.payload,
            selectedRangeIds: new Set([`${action.payload.rowId}:${action.payload.colId}`]),
            selectedCell: { rowId: action.payload.rowId, columnId: action.payload.colId }, // Sync single selection anchor
            editingCell: null,
        };
    case 'UPDATE_SELECTION':
        return { ...state, selectedRangeIds: action.payload };
    case 'END_SELECTION':
        return { ...state, isSelecting: false };
    case 'CLEAR_SELECTION':
        return { ...state, selectedRangeIds: new Set(), selectionAnchor: null, isSelecting: false };
    
    default:
      return state;
  }
};

// Context
const TableViewContext = React.createContext<{
  state: TableViewState;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

// Provider
interface TableViewProviderProps {
  children: React.ReactNode;
  columns: Column[];
  defaultVisibleStats?: Set<string>;
}

export const TableViewProvider: React.FC<TableViewProviderProps> = ({ children, columns, defaultVisibleStats }) => {
  const initialState: TableViewState = {
    filters: [],
    sorts: DEFAULT_SORT,
    grouping: null,
    selectedRows: new Set(),
    visibleColumns: new Set(columns.map(c => c.id)),
    visibleStats: defaultVisibleStats || new Set(),
    currentPage: 1,
    columnWidths: {},
    rowHeight: 'medium',
    isTextWrapEnabled: false,
    searchQuery: '',
    fontSize: 'sm',
    isBandedRows: false,
    showRowId: true,
    selectedCell: null,
    editingCell: null,
    dragTarget: null,
    isDraggingHandle: false,
    columnOrder: [SYSTEM_ID_COL, ...columns.map(c => c.id)],
    frozenColumnCount: 1, // Default freeze first column (usually ID)
    // Selection Defaults
    isSelecting: false,
    selectionAnchor: null,
    selectedRangeIds: new Set(),
  };
  const [state, dispatch] = React.useReducer(tableViewReducer, initialState);
  
  React.useEffect(() => {
    // 1. Detect New Columns
    // Compare incoming `columns` prop against the currently tracked `columnOrder`
    const currentOrderIds = new Set(state.columnOrder);
    const incomingIds = columns.map(c => c.id);
    
    // Find IDs that exist in the new props but NOT in the current order state
    const newColumnIds = incomingIds.filter(id => !currentOrderIds.has(id));
    const hasNew = newColumnIds.length > 0;
    
    // Ensure system ID is tracked (safeguard)
    if (!currentOrderIds.has(SYSTEM_ID_COL)) {
         dispatch({ type: 'SET_COLUMN_ORDER', payload: [SYSTEM_ID_COL, ...state.columnOrder] });
    }

    if (state.columnOrder.length === 0 || hasNew) {
         if (state.columnOrder.length === 0) {
             // Initial load
             dispatch({ type: 'RESET_VIEW', payload: { columns } });
         } else {
             // 2. Append new columns to Order
             const newOrder = [...state.columnOrder, ...newColumnIds];
             dispatch({ type: 'SET_COLUMN_ORDER', payload: newOrder });

             // 3. Make newly added columns VISIBLE by default
             // If we don't do this, they are added to order but remain unchecked in the view settings
             const newVisible = new Set(state.visibleColumns);
             newColumnIds.forEach(id => newVisible.add(id));
             dispatch({ type: 'SET_VISIBLE_COLUMNS', payload: newVisible });
         }
    }
    
    // Stats handling (unrelated to column sync)
    dispatch({ type: 'SET_VISIBLE_STATS', payload: defaultVisibleStats || new Set() });
  }, [columns, defaultVisibleStats]);

  return (
    <TableViewContext.Provider value={{ state, dispatch }}>
      {children}
    </TableViewContext.Provider>
  );
};

// Hook
export const useTableView = () => {
  const context = React.useContext(TableViewContext);
  if (context === undefined) {
    throw new Error('useTableView must be used within a TableViewProvider');
  }
  return context;
};