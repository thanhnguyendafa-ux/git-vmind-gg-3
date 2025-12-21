
import React from 'react';
import { ParsedGrid } from '../utils/ImportParser';
import Icon from '../../../components/ui/Icon';

export type TargetField = 'VOCAB' | 'DEF' | 'LEVEL' | 'NOTE' | 'IGNORE' | 'CUSTOM';

export interface ColumnMappingState {
    sourceIndex: number;
    destination: TargetField;
    customName?: string;
}

interface ImportMapperProps {
    grid: ParsedGrid;
    mapping: ColumnMappingState[];
    onMap: (index: number, destination: TargetField, customName?: string) => void;
}

const FIELD_OPTIONS: { value: TargetField, label: string, icon: string, color: string }[] = [
    { value: 'VOCAB', label: 'Vocab / Question (Primary)', icon: 'key', color: 'text-emerald-600' },
    { value: 'DEF', label: 'Definition / Answer', icon: 'file-text', color: 'text-blue-600' },
    { value: 'LEVEL', label: 'Concept Level (Organizer)', icon: 'layers', color: 'text-purple-600' },
    { value: 'NOTE', label: 'Note', icon: 'edit-3', color: 'text-amber-600' },
    { value: 'CUSTOM', label: 'Custom Column...', icon: 'plus-circle', color: 'text-indigo-600' },
    { value: 'IGNORE', label: 'Ignore Column', icon: 'slash', color: 'text-slate-400' },
];

const ImportMapper: React.FC<ImportMapperProps> = ({ grid, mapping, onMap }) => {
    // Show first 5 rows for preview
    const previewRows = grid.rows.slice(0, 5);

    return (
        <div className="flex flex-col h-full overflow-hidden border border-border-subtle dark:border-white/10 rounded-xl bg-white/50 dark:bg-black/20">
            <div className="overflow-auto flex-1">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-secondary-50 dark:bg-secondary-800 shadow-sm">
                        <tr>
                            {grid.headers.map((header, index) => {
                                const mapState = mapping.find(m => m.sourceIndex === index);
                                const selectedOption = FIELD_OPTIONS.find(o => o.value === mapState?.destination);

                                return (
                                    <th key={index} className="p-2 min-w-[200px] border-b border-r border-border-subtle dark:border-white/10 last:border-r-0">
                                        <div className="mb-2 text-xs font-bold text-text-subtle uppercase tracking-wider">
                                            Source: {header || `Col ${index + 1}`}
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={mapState?.destination || 'IGNORE'}
                                                onChange={(e) => {
                                                    const val = e.target.value as TargetField;
                                                    let customName = undefined;
                                                    if (val === 'CUSTOM') {
                                                        customName = prompt("Enter column name:", header) || "New Column";
                                                    }
                                                    onMap(index, val, customName);
                                                }}
                                                className={`w-full p-2 pr-8 rounded-lg text-sm font-medium border appearance-none focus:ring-2 focus:ring-purple-500 transition-colors ${selectedOption?.color ? 'bg-white dark:bg-black/20 ' + selectedOption.color : 'bg-slate-100 text-slate-500'
                                                    } ${mapState?.destination === 'IGNORE' ? 'border-transparent' : 'border-purple-200 dark:border-purple-800'}`}
                                            >
                                                {FIELD_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <Icon name={selectedOption?.icon || 'chevron-down'} className={`w-4 h-4 ${selectedOption?.color}`} />
                                            </div>
                                        </div>
                                        {mapState?.destination === 'CUSTOM' && (
                                            <div className="mt-1 flex items-center gap-1">
                                                <span className="text-[10px] text-indigo-500 font-bold px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded">
                                                    AS: {mapState.customName}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const newName = prompt("Rename column:", mapState.customName);
                                                        if (newName) onMap(index, 'CUSTOM', newName);
                                                    }}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                                >
                                                    <Icon name="edit-2" className="w-3 h-3 text-slate-400" />
                                                </button>
                                            </div>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-border-subtle dark:border-white/5 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                                {grid.headers.map((_, colIndex) => {
                                    const cellValue = row[colIndex] || '';
                                    const mapState = mapping.find(m => m.sourceIndex === colIndex);
                                    const isIgnored = mapState?.destination === 'IGNORE';

                                    return (
                                        <td key={colIndex} className={`p-3 text-sm border-r border-border-subtle dark:border-white/5 last:border-r-0 ${isIgnored ? 'opacity-40 bg-slate-50/50 dark:bg-black/20' : 'text-text-main dark:text-secondary-100'}`}>
                                            <div className="line-clamp-2 max-w-[250px]" title={cellValue}>
                                                {cellValue}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-3 bg-secondary-50 dark:bg-secondary-800/50 border-t border-border-subtle dark:border-white/10 text-xs text-text-subtle flex justify-between items-center">
                <span>Showing first {previewRows.length} of {grid.rows.length} rows</span>
                <div className="flex gap-4">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Primary Key (Vocab)
                    </span>
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span> Concept Level
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ImportMapper;
