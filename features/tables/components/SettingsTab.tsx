import * as React from 'react';
import { Table, Column } from '../../../types';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../../components/ui/Card';

interface SettingsTabProps {
    table: Table;
    onManageColumns: () => void;
    onConfigureAI: (column: Column) => void;
    onUpdateTable: (updatedTable: Table) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ table, onManageColumns, onConfigureAI, onUpdateTable }) => (
    <div className="space-y-6 max-w-2xl">
        <Card>
            <CardHeader className="p-6">
                <CardTitle>Table Structure</CardTitle>
                <CardDescription>Edit, reorder, add, or remove columns from this table. This will affect all rows and relations.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <button 
                    onClick={onManageColumns}
                    className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2 text-sm"
                >
                    <TableIcon className="w-4 h-4"/>
                    <span>Manage Columns</span>
                </button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader className="p-6">
                <CardTitle>Automation & AI</CardTitle>
                <CardDescription>Configure generative AI prompts and image creation settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Image Generation</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="image-column" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Image Column</label>
                                <select
                                    id="image-column"
                                    value={table.imageConfig?.imageColumnId || ''}
                                    onChange={(e) => {
                                        const imageColumnId = e.target.value;
                                        onUpdateTable({ ...table, imageConfig: imageColumnId ? { ...(table.imageConfig || { sourceColumnId: '' }), imageColumnId } : null });
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="">None</option>
                                    {table.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                            </div>
                            {table.imageConfig?.imageColumnId && (
                                <div>
                                    <label htmlFor="image-source" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Image Prompt Source</label>
                                    <select
                                        id="image-source"
                                        value={table.imageConfig?.sourceColumnId || ''}
                                        onChange={(e) => {
                                            const sourceColumnId = e.target.value;
                                            onUpdateTable({ ...table, imageConfig: { ...table.imageConfig, sourceColumnId } as any });
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                                    >
                                        <option value="">Select source...</option>
                                        {table.columns.filter(c => c.id !== table.imageConfig?.imageColumnId).map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Select a column to store image URLs and another column to act as the prompt source for AI image generation.</p>
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">AI Prompt Config</label>
                        {table.columns.map(col => {
                            const prompt = (table.aiPrompts || []).find(p => p.targetColumnId === col.id);
                            return (
                                <div key={col.id} className="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-700/50">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{prompt ? prompt.name : 'Not configured'}</p>
                                    </div>
                                    <button onClick={() => onConfigureAI(col)} className="font-semibold text-sm text-emerald-600 dark:text-emerald-500 hover:underline">
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
                <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <label htmlFor="audio-source" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Text-to-Speech Source <em className="text-xs text-slate-400">(Legacy)</em>
                        </label>
                        <select
                            id="audio-source"
                            value={table.audioConfig?.sourceColumnId || ''}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const sourceColumnId = e.target.value;
                                onUpdateTable({ ...table, audioConfig: sourceColumnId ? { sourceColumnId } : null });
                            }}
                            className="w-full max-w-xs bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm"
                        >
                            <option value="">None</option>
                            {table.columns.map(col => (
                                <option key={col.id} value={col.id}>{col.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">This setting is for older relations. Newer relations use the 'Audio' tab in their own settings.</p>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Column Audio Languages</label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Set the language for text-to-speech for each column. Use BCP 47 codes like 'en-US', 'es-ES', 'ja-JP'.</p>
                        {table.columns.map(col => (
                            <div key={col.id} className="flex items-center justify-between p-2 rounded-md bg-slate-100 dark:bg-slate-700/50">
                                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{col.name}</p>
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
                                    className="w-32 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
);

export default SettingsTab;
