
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import Icon from '../../../components/ui/Icon';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { tables, folders } = useTableStore();
    const { stats, settings } = useUserStore();
    const { notes } = useNoteStore();
    const { dictationNotes } = useDictationNoteStore();
    const { flashcardProgresses, studyProgresses, ankiProgresses } = useSessionDataStore();
    const { contextLinks } = useContextLinkStore();

    const [mode, setMode] = useState<'tables' | 'full'>('tables');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleToggle = (id: string) => { 
        const newSet = new Set(selectedIds); 
        if (newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        setSelectedIds(newSet); 
    };
    
    const downloadFile = (data: any, filename: string, type: 'json' | 'csv' = 'json') => {
        const mimeType = type === 'json' ? 'application/json' : 'text/csv';
        const dataStr = type === 'json' 
            ? JSON.stringify(data, null, 2)
            : data; // CSV content is already a string

        const blob = new Blob([dataStr], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", filename);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        document.body.removeChild(downloadAnchorNode);
        URL.revokeObjectURL(url);
    };

    const handleExportTables = (format: 'json' | 'csv') => {
        if (format === 'json') {
            const tablesToExport = tables.filter(t => selectedIds.has(t.id));
            downloadFile(tablesToExport, "vmind_tables_export.json", 'json');
        } else if (format === 'csv') {
            const tableId = Array.from(selectedIds)[0];
            const table = tables.find(t => t.id === tableId);
            if (!table) return;

            const headers = table.columns.map(c => c.name).join(',');
            const rows = table.rows.map(row => table.columns.map(c => `"${(row.cols[c.id] || '').replace(/"/g, '""')}"`).join(','));
            const csvContent = [headers, ...rows].join('\n');
            downloadFile(csvContent, `${table.name}.csv`, 'csv');
        }
        onClose();
    };

    const handleFullBackup = () => {
        const backupData = {
            metadata: {
                type: 'vmind-full-backup',
                version: '1.8',
                timestamp: Date.now(),
                exportDate: new Date().toISOString(),
            },
            data: {
                userProfile: { stats, settings },
                tables,
                folders,
                notes,
                dictationNotes,
                contextLinks,
                sessionData: {
                    flashcardProgresses,
                    studyProgresses,
                    ankiProgresses
                }
            }
        };
        
        const dateStr = new Date().toISOString().split('T')[0];
        downloadFile(backupData, `vmind_full_backup_${dateStr}.json`, 'json');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export & Backup">
            <div className="p-6">
                <div className="flex space-x-4 border-b border-secondary-200 dark:border-secondary-700 mb-4">
                    <button 
                        onClick={() => setMode('tables')}
                        className={`pb-2 text-sm font-semibold transition-colors ${mode === 'tables' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        Specific Tables
                    </button>
                    <button 
                        onClick={() => setMode('full')}
                        className={`pb-2 text-sm font-semibold transition-colors ${mode === 'full' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        Full Backup
                    </button>
                </div>

                {mode === 'tables' ? (
                    <div className="animate-fadeIn">
                        <p className="text-slate-600 dark:text-slate-300 mb-4 text-sm">Select tables to export as JSON or CSV.</p>
                        <div className="max-h-60 overflow-y-auto space-y-2 mb-4 border dark:border-slate-600 rounded-md p-2 bg-secondary-50 dark:bg-secondary-900/50">
                            {tables.map(table => (
                                <label key={table.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer transition-colors">
                                    <input type="checkbox" checked={selectedIds.has(table.id)} onChange={() => handleToggle(table.id)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                                    <span className="text-sm font-medium">{table.name}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleExportTables('json')} disabled={selectedIds.size === 0} className="flex-1 bg-secondary-200 dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold py-2 px-4 rounded-md hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                <Icon name="arrow-down-tray" className="w-4 h-4" /> JSON
                            </button>
                            <button onClick={() => handleExportTables('csv')} disabled={selectedIds.size !== 1} className="flex-1 bg-secondary-200 dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold py-2 px-4 rounded-md hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2">
                                <Icon name="table-cells" className="w-4 h-4" /> CSV (1 table)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="animate-fadeIn space-y-4">
                         <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 flex items-start gap-3">
                            <Icon name="circle-outline" className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-primary-800 dark:text-primary-200 text-sm">System Snapshot</h4>
                                <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                                    Downloads a complete archive of your Vmind data, including:
                                </p>
                                <ul className="text-xs text-primary-700 dark:text-primary-300 mt-2 list-disc list-inside space-y-1">
                                    <li>Vocabulary Tables & Relations</li>
                                    <li>Learning Stats (XP, Streak, Badges)</li>
                                    <li>Notes & Journal Entries</li>
                                    <li>Dictation Exercises</li>
                                    <li>App Settings & Preferences</li>
                                </ul>
                            </div>
                        </div>
                        <button onClick={handleFullBackup} className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
                            <Icon name="arrow-down-tray" className="w-5 h-5" />
                            Download Full Backup
                        </button>
                         <p className="text-xs text-center text-text-subtle">Keep this file safe! You can restore it later using the "Import" button.</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ExportModal;
