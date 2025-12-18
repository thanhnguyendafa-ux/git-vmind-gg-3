import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import { useTagStore } from '../../../stores/useTagStore';
import { useUIStore } from '../../../stores/useUIStore';
import Icon from '../../../components/ui/Icon';
import { exportToExcel } from '../../../services/excelService';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const formatHumanId = (code: string | undefined, id: number) => {
    const prefix = code || '---';
    const num = String(id).padStart(3, '0');
    return `${prefix}${num}`;
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
    const { tables, folders } = useTableStore();
    const { stats, settings } = useUserStore();
    const { notes } = useNoteStore();
    const { dictationNotes } = useDictationNoteStore();
    const { flashcardProgresses, studyProgresses, ankiProgresses } = useSessionDataStore();
    const { contextLinks } = useContextLinkStore();
    const { tags } = useTagStore();
    const { showToast } = useUIStore();

    const [mode, setMode] = useState<'tables' | 'full'>('tables');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Excel Config State
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xlsx'>('xlsx');
    const [includeStats, setIncludeStats] = useState(true);
    const [includeMetadata, setIncludeMetadata] = useState(false);

    const handleToggle = (id: string) => { 
        const newSet = new Set(selectedIds); 
        if (newSet.has(id)) newSet.delete(id); 
        else newSet.add(id); 
        setSelectedIds(newSet); 
    };
    
    const downloadFile = (data: any, filename: string, type: 'json' | 'csv') => {
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

    const handleExportTables = () => {
        if (selectedIds.size === 0) return;

        if (exportFormat === 'json') {
            const tablesToExport = tables.filter(t => selectedIds.has(t.id));
            downloadFile(tablesToExport, "vmind_tables_export.json", 'json');
            onClose();
        } else if (exportFormat === 'csv') {
            // CSV is limited to 1 table for simplicity of headers
            const tableId = Array.from(selectedIds)[0];
            const table = tables.find(t => t.id === tableId);
            if (!table) return;

            const headers = ['ID', ...table.columns.map(c => c.name)].join(',');
            const rows = table.rows.map(row => {
                const idCell = formatHumanId(table.shortCode, row.rowIdNum || 0);
                const dataCells = table.columns.map(c => `"${(row.cols[c.id] || '').replace(/"/g, '""')}"`);
                return [idCell, ...dataCells].join(',');
            });
            
            const csvContent = [headers, ...rows].join('\n');
            downloadFile(csvContent, `${table.name}.csv`, 'csv');
            onClose();
        } else if (exportFormat === 'xlsx') {
            const tablesToExport = tables.filter(t => selectedIds.has(t.id));
            let successCount = 0;
            
            tablesToExport.forEach(table => {
                const success = exportToExcel(table, { includeStats, includeMetadata }, tags);
                if (success) successCount++;
            });
            
            if (successCount > 0) {
                showToast(`Exported ${successCount} table(s) to Excel.`, "success");
            } else {
                showToast("Failed to export tables.", "error");
            }
            onClose();
        }
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
                },
                tags
            }
        };
        
        const dateStr = new Date().toISOString().split('T')[0];
        downloadFile(backupData, `vmind_full_backup_${dateStr}.json`, 'json');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Export & Backup" containerClassName="max-w-xl w-full">
            <div className="p-6">
                <div className="flex space-x-4 border-b border-secondary-200 dark:border-secondary-700 mb-6">
                    <button 
                        onClick={() => setMode('tables')}
                        className={`pb-2 text-sm font-semibold transition-colors ${mode === 'tables' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        Export Data
                    </button>
                    <button 
                        onClick={() => setMode('full')}
                        className={`pb-2 text-sm font-semibold transition-colors ${mode === 'full' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle hover:text-text-main'}`}
                    >
                        Full Backup
                    </button>
                </div>

                {mode === 'tables' ? (
                    <div className="animate-fadeIn space-y-6">
                        
                        {/* Table Selection */}
                        <div>
                            <p className="text-xs font-bold text-text-subtle uppercase mb-2">1. Select Tables</p>
                            <div className="max-h-48 overflow-y-auto space-y-1 mb-2 border border-secondary-200 dark:border-secondary-700 rounded-md p-2 bg-secondary-50 dark:bg-secondary-900/50">
                                {tables.map(table => (
                                    <label key={table.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={selectedIds.has(table.id)} onChange={() => handleToggle(table.id)} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500" />
                                        <span className="text-sm font-medium">{table.name}</span>
                                        {table.shortCode && <span className="text-xs text-text-subtle ml-auto font-mono bg-secondary-200 dark:bg-secondary-800 px-1 rounded">{table.shortCode}</span>}
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        {/* Format Selection */}
                        <div>
                             <p className="text-xs font-bold text-text-subtle uppercase mb-2">2. Choose Format</p>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => setExportFormat('xlsx')} 
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold border transition-all ${exportFormat === 'xlsx' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-text-subtle'}`}
                                >
                                    Excel (.xlsx)
                                </button>
                                <button 
                                    onClick={() => setExportFormat('csv')} 
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold border transition-all ${exportFormat === 'csv' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-text-subtle'}`}
                                >
                                    CSV
                                </button>
                                <button 
                                    onClick={() => setExportFormat('json')} 
                                    className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold border transition-all ${exportFormat === 'json' ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 text-primary-700 dark:text-primary-300' : 'bg-surface dark:bg-secondary-800 border-secondary-300 dark:border-secondary-600 text-text-subtle'}`}
                                >
                                    JSON
                                </button>
                             </div>
                        </div>
                        
                        {/* Advanced Options (Excel Only) */}
                        {exportFormat === 'xlsx' && (
                             <div className="bg-secondary-50 dark:bg-secondary-800/50 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700">
                                <p className="text-xs font-bold text-text-subtle uppercase mb-2">Excel Options</p>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={includeStats} onChange={e => setIncludeStats(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500"/>
                                        <span className="text-sm">Include Learning Statistics (Correct/Incorrect, Anki Data)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={includeMetadata} onChange={e => setIncludeMetadata(e.target.checked)} className="rounded text-primary-600 focus:ring-primary-500"/>
                                        <span className="text-sm">Include System IDs (For advanced data merging)</span>
                                    </label>
                                </div>
                             </div>
                        )}
                        
                        {exportFormat === 'csv' && selectedIds.size > 1 && (
                            <p className="text-xs text-error-500">CSV export is limited to one table at a time.</p>
                        )}
                        
                        <button 
                            onClick={handleExportTables} 
                            disabled={selectedIds.size === 0 || (exportFormat === 'csv' && selectedIds.size > 1)}
                            className="w-full bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Icon name="arrow-down-tray" className="w-5 h-5" />
                            Export Selected ({selectedIds.size})
                        </button>

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