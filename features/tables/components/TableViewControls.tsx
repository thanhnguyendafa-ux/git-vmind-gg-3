
import * as React from 'react';
import { Column, Filter, FilterCondition, Sort, AIPrompt } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';
import { useTableView } from '../contexts/TableViewContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

interface TableViewControlsProps {
    table: { columns: Column[], aiPrompts?: AIPrompt[] };
    sortableStats: { key: string, label: string }[];
    onAddNewRow: () => void;
    onRunAiClick: () => void;
    onPasteClick: () => void;
    batchFillCount: number;
    onManageColumns: () => void;
    viewMode: 'table' | 'gallery';
    onViewModeChange: (mode: 'table' | 'gallery') => void;
}

const filterConditions: { id: FilterCondition; label: string }[] = [
    { id: 'contains', label: 'contains' },
    { id: 'does-not-contain', label: 'does not contain' },
    { id: 'is', label: 'is' },
    { id: 'is-not', label: 'is not' },
    { id: 'is-empty', label: 'is empty' },
    { id: 'is-not-empty', label: 'is not empty' },
];


const TableViewControls: React.FC<TableViewControlsProps> = (props) => {
    const { table, sortableStats, onAddNewRow, onRunAiClick, batchFillCount, onManageColumns, viewMode, onViewModeChange, onPasteClick } = props;
    const { state, dispatch } = useTableView();
    const { filters, sorts, grouping, visibleColumns, visibleStats, rowHeight, isTextWrapEnabled, fontSize, isBandedRows, searchQuery } = state;
    
    const [isFilterOpen, setIsFilterOpen] = React.useState(false);
    const [isSortOpen, setIsSortOpen] = React.useState(false);
    const [isGroupOpen, setIsGroupOpen] = React.useState(false);
    const [isColumnsOpen, setIsColumnsOpen] = React.useState(false);
    const [isMoreOpen, setIsMoreOpen] = React.useState(false);


    const addFilter = () => dispatch({ type: 'SET_FILTERS', payload: [...filters, { id: crypto.randomUUID(), columnId: table.columns[0]?.id || '', condition: 'contains', value: '' }] });
    const updateFilter = (id: string, newFilter: Partial<Filter>) => dispatch({ type: 'SET_FILTERS', payload: filters.map(f => f.id === id ? { ...f, ...newFilter } : f) });
    const removeFilter = (id: string) => dispatch({ type: 'SET_FILTERS', payload: filters.filter(f => f.id !== id) });

    const addSort = () => dispatch({ type: 'SET_SORTS', payload: [...sorts, { id: crypto.randomUUID(), key: table.columns[0]?.id || '', direction: 'asc' }] });
    const updateSort = (id: string, newSort: Partial<Sort>) => dispatch({ type: 'SET_SORTS', payload: sorts.map(s => s.id === id ? { ...s, ...newSort } : s) });
    const removeSort = (id: string) => dispatch({ type: 'SET_SORTS', payload: sorts.filter(f => f.id !== id) });
    
    const sortableItems = [...table.columns.map(c => ({ key: c.id, label: c.name })), ...sortableStats];

    const toggleColumnVisibility = (id: string) => { const next = new Set(visibleColumns); if (next.has(id)) next.delete(id); else next.add(id); dispatch({ type: 'SET_VISIBLE_COLUMNS', payload: next }); };
    const toggleStatVisibility = (key: string) => { const next = new Set(visibleStats); if (next.has(key)) next.delete(key); else next.add(key); dispatch({ type: 'SET_VISIBLE_STATS', payload: next }); };

    const SecondaryControls = (
      <>
        <Popover isOpen={isFilterOpen} setIsOpen={setIsFilterOpen} trigger={
            <Button variant="secondary" size="sm" className="flex items-center gap-1 w-full justify-start md:w-auto">
                <Icon name="filter" className="w-4 h-4"/>
                <span>Filter</span>
                {filters.length > 0 && <span className="ml-1 text-xs bg-primary-500 text-white rounded-full px-1.5 py-0.5">{filters.length}</span>}
            </Button>
        }>
            <div className="space-y-3">
                <h4 className="text-sm font-semibold">Filter</h4>
                {filters.map(filter => (
                    <div key={filter.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-center text-sm">
                        <select value={filter.columnId} onChange={e => updateFilter(filter.id, { columnId: e.target.value })} className="popover-select">
                            <option value="">Select...</option>
                            <optgroup label="Columns">
                                {table.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </optgroup>
                            <optgroup label="Statistics">
                                {sortableStats.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </optgroup>
                        </select>
                        <select value={filter.condition} onChange={e => updateFilter(filter.id, { condition: e.target.value as FilterCondition })} className="popover-select">{filterConditions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                        <input type="text" value={filter.value} onChange={e => updateFilter(filter.id, { value: e.target.value })} className="popover-input" disabled={filter.condition === 'is-empty' || filter.condition === 'is-not-empty'} />
                        <button onClick={() => removeFilter(filter.id)} className="p-1 text-slate-400 hover:text-red-500"><Icon name="trash" className="w-4 h-4"/></button>
                    </div>
                ))}
                <button onClick={addFilter} className="text-sm font-semibold text-primary-600 hover:underline">Add filter</button>
            </div>
        </Popover>
        <Popover isOpen={isSortOpen} setIsOpen={setIsSortOpen} trigger={
            <Button variant="secondary" size="sm" className="flex items-center gap-1 w-full justify-start md:w-auto">
                <Icon name="arrows-up-down" className="w-4 h-4"/>
                <span>Sort</span>
                {sorts.length > 0 && <span className="ml-1 text-xs bg-primary-500 text-white rounded-full px-1.5 py-0.5">{sorts.length}</span>}
            </Button>
        }>
            <div className="space-y-3">
                <h4 className="text-sm font-semibold">Sort</h4>
                {sorts.map(sort => (
                    <div key={sort.id} className="grid grid-cols-[2fr,1fr,auto] gap-2 items-center text-sm">
                        <select value={sort.key} onChange={e => updateSort(sort.id, { key: e.target.value })} className="popover-select">{sortableItems.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select>
                        <select value={sort.direction} onChange={e => updateSort(sort.id, { direction: e.target.value as 'asc' | 'desc' })} className="popover-select"><option value="asc">Ascending</option><option value="desc">Descending</option></select>
                        <button onClick={() => removeSort(sort.id)} className="p-1 text-slate-400 hover:text-red-500"><Icon name="trash" className="w-4 h-4"/></button>
                    </div>
                ))}
                <button onClick={addSort} className="text-sm font-semibold text-primary-600 hover:underline">Add sort</button>
            </div>
        </Popover>
        <Popover isOpen={isGroupOpen} setIsOpen={setIsGroupOpen} trigger={
            <Button variant="secondary" size="sm" className="flex items-center gap-1 w-full justify-start md:w-auto">
                <Icon name="list-bullet" className="w-4 h-4"/>
                <span>Group</span>
                {grouping && <span className="ml-1 text-xs bg-primary-500 text-white rounded-full px-1.5 py-0.5">1</span>}
            </Button>
        }>
            <div className="space-y-2">
                <h4 className="text-sm font-semibold">Group by</h4>
                <select value={grouping?.columnId || ''} onChange={e => dispatch({type: 'SET_GROUPING', payload: e.target.value ? { columnId: e.target.value } : null})} className="popover-select w-full">
                    <option value="">None</option>
                    {table.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                </select>
            </div>
        </Popover>
        
        <Popover isOpen={isColumnsOpen} setIsOpen={setIsColumnsOpen} trigger={
            <Button variant="secondary" size="sm" className="flex items-center gap-1 w-full justify-start md:w-auto">
                <Icon name="eye-off" className="w-4 h-4"/>
                <span>Properties</span>
            </Button>
        }>
            <div className="space-y-4">
                <div>
                    <h4 className="text-sm font-semibold mb-2">Columns</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {table.columns.map(col => (<label key={col.id} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><input type="checkbox" checked={visibleColumns.has(col.id)} onChange={() => toggleColumnVisibility(col.id)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>{col.name}</label>))}
                    </div>
                </div>
                <div>
                    <h4 className="text-sm font-semibold mb-2">Stats</h4>
                    <div className="space-y-1">
                        {sortableStats.map(stat => (<label key={stat.key} className="flex items-center gap-2 text-sm cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700"><input type="checkbox" checked={visibleStats.has(stat.key)} onChange={() => toggleStatVisibility(stat.key)} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"/>{stat.label}</label>))}
                    </div>
                </div>
            </div>
        </Popover>
      </>
    );

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            {/* Left Side */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <div className="flex items-center bg-secondary-200 dark:bg-secondary-700 rounded-lg p-1">
                    <button onClick={() => onViewModeChange('table')} className={`px-2 py-1 rounded-md ${viewMode === 'table' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}><Icon name="table-cells" className="w-5 h-5"/></button>
                    <button onClick={() => onViewModeChange('gallery')} className={`px-2 py-1 rounded-md ${viewMode === 'gallery' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}><Icon name="squares-2x2" className="w-5 h-5"/></button>
                </div>
                
                <div className="relative flex-1">
                    <Icon name="search" className="w-5 h-5 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input 
                        type="text"
                        placeholder="Search rows..."
                        value={searchQuery}
                        onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                        className="pl-10 h-9 w-full"
                    />
                </div>

                {/* Desktop: Show controls inline */}
                <div className="hidden md:flex items-center gap-2">
                    {SecondaryControls}
                    <Popover isOpen={isMoreOpen} setIsOpen={setIsMoreOpen} trigger={
                        <Button variant="secondary" size="sm" className="px-2 h-9">
                            <Icon name="dots-horizontal" className="w-5 h-5" />
                        </Button>
                    }>
                        <div className="space-y-4" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <div>
                                <h4 className="text-sm font-semibold mb-2">Row Height</h4>
                                <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_ROW_HEIGHT', payload: 'short' }) }} className={`px-3 py-1 rounded-full ${rowHeight === 'short' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Short</button>
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_ROW_HEIGHT', payload: 'medium' }) }} className={`px-3 py-1 rounded-full ${rowHeight === 'medium' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Medium</button>
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_ROW_HEIGHT', payload: 'tall' }) }} className={`px-3 py-1 rounded-full ${rowHeight === 'tall' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Tall</button>
                                </div>
                            </div>
                             <div>
                                <h4 className="text-sm font-semibold mb-2">Font Size</h4>
                                <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_FONT_SIZE', payload: 'sm' }) }} className={`px-3 py-1 rounded-full ${fontSize === 'sm' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Small</button>
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_FONT_SIZE', payload: 'base' }) }} className={`px-3 py-1 rounded-full ${fontSize === 'base' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Medium</button>
                                    <button onClick={(e) => { e.stopPropagation(); dispatch({ type: 'SET_FONT_SIZE', payload: 'lg' }) }} className={`px-3 py-1 rounded-full ${fontSize === 'lg' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Large</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <label htmlFor="wrap-text-toggle" className="text-sm font-medium">Wrap Text</label>
                                <button id="wrap-text-toggle" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_TEXT_WRAP' }) }} className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${isTextWrapEnabled ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}>
                                    <span className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isTextWrapEnabled ? 'translate-x-5' : ''}`}></span>
                                </button>
                            </div>
                             <div className="flex items-center justify-between">
                                <label htmlFor="banded-rows-toggle" className="text-sm font-medium">Banded Rows</label>
                                <button id="banded-rows-toggle" onClick={(e) => { e.stopPropagation(); dispatch({ type: 'TOGGLE_BANDED_ROWS' }) }} className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${isBandedRows ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}>
                                    <span className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isBandedRows ? 'translate-x-5' : ''}`}></span>
                                </button>
                            </div>
                        </div>
                    </Popover>
                </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
                {/* Mobile: "More" button */}
                <div className="md:hidden">
                    <Popover isOpen={isMoreOpen} setIsOpen={setIsMoreOpen} trigger={
                        <Button variant="secondary" size="sm" className="px-2">
                            <Icon name="dots-horizontal" className="w-5 h-5"/>
                        </Button>
                    }>
                        <div className="flex flex-col gap-2 items-stretch" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            {SecondaryControls}
                        </div>
                    </Popover>
                </div>
                
                <Button onClick={onPasteClick} variant="secondary" size="sm" className="hidden sm:flex items-center gap-1 px-3">
                    <Icon name="clipboard" className="w-4 h-4"/>
                    <span>Paste</span>
                </Button>
                <Button onClick={onRunAiClick} variant="primary" size="sm" className={`flex items-center gap-1 ${batchFillCount > 0 ? 'animate-ai-glow' : 'opacity-60'} px-2 sm:px-3`}>
                    <Icon name="sparkles" className="w-5 h-5 sm:w-4 sm:h-4"/>
                    <span className="hidden sm:inline">Run AI</span>
                    {batchFillCount > 0 && <span className="ml-1 text-xs bg-white/20 rounded-full px-1.5 py-0.5">{batchFillCount}</span>}
                </Button>
                <Button onClick={onAddNewRow} variant="primary" size="sm" className="flex items-center gap-1 px-2 sm:px-3">
                    <Icon name="plus" className="w-5 h-5 sm:w-4 sm:h-4"/>
                    <span className="hidden sm:inline">New</span>
                </Button>
            </div>
        </div>
    );
};

export default TableViewControls;
