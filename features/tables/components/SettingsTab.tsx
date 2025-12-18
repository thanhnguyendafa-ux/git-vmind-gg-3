

import * as React from 'react';
import { Table, Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';

interface SettingsTabProps {
    table: Table;
    onManageColumns: () => void;
    onConfigureAI: (column: Column) => void;
    onUpdateTable: (updatedTable: Table) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ table, onManageColumns, onConfigureAI, onUpdateTable }) => {
    const { tables } = useTableStore();
    const { showToast } = useUIStore();
    const [shortCode, setShortCode] = React.useState(table.shortCode || '');
    const [codeError, setCodeError] = React.useState<string | null>(null);

    const handleShortCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().substring(0, 3);
        setShortCode(val);
        
        if (val.length < 3) {
            setCodeError('Code must be 3 characters.');
            return;
        }

        const collision = tables.find(t => t.id !== table.id && t.shortCode === val);
        if (collision) {
            setCodeError('Code already in use.');
        } else {
            setCodeError(null);
        }
    };

    const saveShortCode = () => {
        if (!codeError && shortCode.length === 3) {
            onUpdateTable({ ...table, shortCode });
            showToast("Table code updated.", "success");
        }
    };

    return (
    <div className="flex flex-col gap-6 max-w-2xl w-full">
        <Card>
            <CardHeader className="p-6">
                <CardTitle>Table Structure</CardTitle>
                <CardDescription>Edit, reorder, add, or remove columns from this table. This will affect all rows and relations.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
                <div>
                     <label className="block text-sm font-medium text-text-main dark:text-secondary-200 mb-1">Table Code (ID Namespace)</label>
                     <div className="flex items-start gap-2">
                        <div className="flex-1">
                             <Input 
                                value={shortCode}
                                onChange={handleShortCodeChange}
                                placeholder="ABC"
                                className={`font-mono uppercase tracking-widest ${codeError ? 'border-error-500 focus:ring-error-500' : ''}`}
                                maxLength={3}
                            />
                            {codeError ? (
                                <p className="text-xs text-error-500 mt-1">{codeError}</p>
                            ) : (
                                <p className="text-xs text-text-subtle mt-1">Unique 3-letter prefix for row IDs (e.g. {shortCode}001).</p>
                            )}
                        </div>
                        <button 
                            onClick={saveShortCode}
                            disabled={!!codeError || shortCode === table.shortCode || shortCode.length < 3}
                            className="h-10 px-4 bg-primary-500 text-white rounded-md text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
                        >
                            Save
                        </button>
                     </div>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={onManageColumns}
                        className="w-full sm:w-auto h-11 bg-secondary-100 dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold px-4 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-600 border border-border dark:border-secondary-600 transition-colors flex items-center justify-center sm:justify-start gap-2 text-sm"
                    >
                        <TableIcon className="w-4 h-4"/>
                        <span>Manage Columns</span>
                    </button>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-6">
                <CardTitle>Automation & AI</CardTitle>
                <CardDescription>Configure generative AI prompts and image creation settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="flex flex-col gap-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                    <div className="flex flex-col gap-4">
                        <h4 className="text-sm font-medium text-text-main dark:text-secondary-200">Image Generation</h4>
                        
                        {/* Mobile: Stacked (flex-col), Desktop: Side-by-side (sm:flex-row) */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 w-full">
                                <label htmlFor="image-column" className="block text-xs font-medium text-text-subtle mb-1">Image Column</label>
                                <select
                                    id="image-column"
                                    value={table.imageConfig?.imageColumnId || ''}
                                    onChange={(e) => {
                                        const imageColumnId = e.target.value;
                                        onUpdateTable({ ...table, imageConfig: imageColumnId ? { ...(table.imageConfig || { sourceColumnId: '' }), imageColumnId } : null });
                                    }}
                                    className="w-full h-10 bg-secondary-50 dark:bg-secondary-700 border border-border dark:border-secondary-600 rounded-md px-3 text-sm text-text-main dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                >
                                    <option value="">None</option>
                                    {table.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                            </div>
                            {table.imageConfig?.imageColumnId && (
                                <div className="flex-1 w-full">
                                    <label htmlFor="image-source" className="block text-xs font-medium text-text-subtle mb-1">Image Prompt Source</label>
                                    <select
                                        id="image-source"
                                        value={table.imageConfig?.sourceColumnId || ''}
                                        onChange={(e) => {
                                            const sourceColumnId = e.target.value;
                                            onUpdateTable({ ...table, imageConfig: { ...table.imageConfig, sourceColumnId } as any });
                                        }}
                                        className="w-full h-10 bg-secondary-50 dark:bg-secondary-700 border border-border dark:border-secondary-600 rounded-md px-3 text-sm text-text-main dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                    >
                                        <option value="">Select source...</option>
                                        {table.columns.filter(c => c.id !== table.imageConfig?.imageColumnId).map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-text-subtle">Select a column to store image URLs and another column to act as the prompt source for AI image generation.</p>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                        <label className="block text-sm font-medium text-text-main dark:text-secondary-200">AI Prompt Config</label>
                        {table.columns.map(col => {
                            const prompt = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                            return (
                                <div key={col.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-secondary-50 dark:bg-secondary-700/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-sm text-text-main dark:text-secondary-200 truncate">{col.name}</p>
                                        <p className="text-xs text-text-subtle truncate">{prompt ? prompt.name : 'Not configured'}</p>
                                    </div>
                                    <button 
                                        onClick={() => onConfigureAI(col)} 
                                        className="flex-shrink-0 h-10 px-3 bg-white dark:bg-secondary-600 border border-secondary-200 dark:border-secondary-500 rounded-md font-semibold text-xs text-primary-600 dark:text-primary-300 hover:bg-secondary-50 dark:hover:bg-secondary-500 transition-colors"
                                    >
                                        {prompt ? 'Edit' : 'Configure'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader className="p-6">
                <CardTitle>Audio Settings</CardTitle>
                <CardDescription>Manage text-to-speech languages for your columns.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="flex flex-col gap-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                    <div>
                        <label htmlFor="audio-source" className="block text-sm font-medium text-text-main dark:text-secondary-200 mb-1">
                            Text-to-Speech Source <em className="text-xs text-text-subtle">(Legacy)</em>
                        </label>
                        {/* Mobile: Full width (w-full), Desktop: Constrained width (sm:max-w-xs) */}
                        <select
                            id="audio-source"
                            value={table.audioConfig?.sourceColumnId || ''}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const sourceColumnId = e.target.value;
                                onUpdateTable({ ...table, audioConfig: sourceColumnId ? { sourceColumnId } : null });
                            }}
                            className="w-full sm:max-w-xs h-10 bg-secondary-50 dark:bg-secondary-700 border border-border dark:border-secondary-600 rounded-md px-3 text-sm text-text-main dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        >
                            <option value="">None</option>
                            {table.columns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-text-subtle mt-2">This setting is for older relations. Newer relations use the 'Audio' tab in their own settings.</p>
                    </div>

                    <div className="flex flex-col gap-2 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                        <label className="block text-sm font-medium text-text-main dark:text-secondary-200">Column Audio Languages</label>
                        <p className="text-xs text-text-subtle">Set the language for text-to-speech for each column. Use BCP 47 codes like 'en-US', 'es-ES', 'ja-JP'.</p>
                        {table.columns.map(col => (
                            <div key={col.id} className="flex items-center justify-between gap-3 p-3 rounded-md bg-secondary-50 dark:bg-secondary-700/50">
                                <p className="font-semibold text-sm text-text-main dark:text-secondary-200 flex-1 truncate">{col.name}</p>
                                <input
                                    type="text"
                                    placeholder="e.g., en-US"
                                    value={table.columnAudioConfig?.[col.id]?.language || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const newConfig = { ...(table.columnAudioConfig || {}) };
                                        if (e.target.value.trim()) {
                                            newConfig[col.id] = { language: e.target.value.trim() };
                                        } else {
                                            delete newConfig[col.id];
                                        }
                                        onUpdateTable({ ...table, columnAudioConfig: newConfig });
                                    }}
                                    className="flex-shrink-0 w-24 sm:w-32 h-10 bg-surface dark:bg-secondary-700 border border-border dark:border-secondary-600 rounded-md px-2 text-sm text-text-main dark:text-secondary-100 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
    );
};

export default SettingsTab;