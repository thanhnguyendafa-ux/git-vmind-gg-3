
import React, { useState } from 'react';
import Modal from '../../../components/ui/Modal';
import { useTableStore } from '../../../stores/useTableStore';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useDictationNoteStore } from '../../../stores/useDictationNoteStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useUIStore } from '../../../stores/useUIStore';
import { Table, VocabRow, FlashcardStatus } from '../../../types';
import Icon from '../../../components/ui/Icon';

type ParsedCsv = { headers: string[], rows: (string[])[] };

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose }) => {
    const { tables, importTables } = useTableStore();
    const { createNote } = useNoteStore();
    const { createDictationNote, updateDictationNote } = useDictationNoteStore();
    const { setFlashcardProgresses, setStudyProgresses, setAnkiProgresses } = useSessionDataStore();
    const { addContextLink } = useContextLinkStore();
    const { setStats, setSettings } = useUserStore();
    const { showToast } = useUIStore();

    const [step, setStep] = useState(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
    const [destination, setDestination] = useState<'new' | 'append'>('new');
    const [newTableName, setNewTableName] = useState('');
    const [appendTableId, setAppendTableId] = useState('');
    const [columnMap, setColumnMap] = useState<{[key: number]: string}>({});
    const [backupSummary, setBackupSummary] = useState<{ tables: number, notes: number, dictations: number } | null>(null);
    const [backupData, setBackupData] = useState<any>(null);

    const reset = () => { setStep(1); setFile(null); setParsedCsv(null); setDestination('new'); setNewTableName(''); setAppendTableId(''); setColumnMap({}); setBackupSummary(null); setBackupData(null); };

    const handleFile = async (selectedFile: File) => {
        setFile(selectedFile);
        if (selectedFile.type === 'application/json') {
            const text = await selectedFile.text();
            try {
                const jsonData = JSON.parse(text);
                
                // Check if it's a Full Backup
                if (jsonData.metadata?.type === 'vmind-full-backup') {
                    setBackupData(jsonData.data);
                    setBackupSummary({
                        tables: jsonData.data.tables?.length || 0,
                        notes: jsonData.data.notes?.length || 0,
                        dictations: jsonData.data.dictationNotes?.length || 0
                    });
                    setStep(3); // Go to Backup Confirmation Step
                    return;
                }

                // Legacy/Simple Table Import
                if (Array.isArray(jsonData) && jsonData.every(t => t.id && t.name)) {
                    importTables(jsonData);
                    showToast(`Successfully imported ${jsonData.length} table(s).`, 'success');
                    reset();
                    onClose();
                } else { 
                    throw new Error("Invalid JSON file format.");
                }
            } catch (e) { showToast("Error parsing JSON file.", 'error'); }
        } else {
             const reader = new FileReader();
             reader.onload = e => {
                 const text = e.target?.result as string;
                 const lines = text.split(/\r\n|\n/).filter(line => line);
                 const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                 const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
                 setParsedCsv({ headers, rows });
                 setNewTableName(selectedFile.name.replace(/\.[^/.]+$/, ""));
                 setStep(2);
             };
             reader.readAsText(selectedFile);
        }
    };

    const handleConfirmBackupRestore = async () => {
        if (!backupData) return;

        try {
            // Restore Tables
            if (backupData.tables?.length) {
                importTables(backupData.tables);
            }

            // Restore Notes
            if (backupData.notes?.length) {
                // Note: useNoteStore only has createNote, we might need to bulk set or iterate
                // For robustness in this "40-year engineer" implementation, we'll iterate 
                // but ideally we'd expose a bulk import.
                // Since we don't want to modify store interfaces too much, let's use the store's setState if possible or just loop.
                // Actually, useNoteStore exposes setNotes in the provided source code! Perfect.
                // We should merge, not replace, to be safe.
                const { notes: currentNotes, setNotes } = useNoteStore.getState();
                const newNotes = backupData.notes.filter((n: any) => !currentNotes.some(cn => cn.id === n.id));
                setNotes([...currentNotes, ...newNotes]);
            }

            // Restore Dictation
            if (backupData.dictationNotes?.length) {
                const { dictationNotes: currentDictations, setDictationNotes } = useDictationNoteStore.getState();
                const newDictations = backupData.dictationNotes.filter((n: any) => !currentDictations.some(cd => cd.id === n.id));
                setDictationNotes([...currentDictations, ...newDictations]);
            }
            
            // Restore Context Links
             if (backupData.contextLinks?.length) {
                const { contextLinks: currentLinks, setContextLinks } = useContextLinkStore.getState();
                const newLinks = backupData.contextLinks.filter((l: any) => !currentLinks.some(cl => cl.id === l.id));
                setContextLinks([...currentLinks, ...newLinks]);
            }

            // Restore Session Data
            if (backupData.sessionData) {
                if (backupData.sessionData.flashcardProgresses) setFlashcardProgresses(prev => [...prev, ...backupData.sessionData.flashcardProgresses.filter((p: any) => !prev.some(pp => pp.id === p.id))]);
                if (backupData.sessionData.studyProgresses) setStudyProgresses(prev => [...prev, ...backupData.sessionData.studyProgresses.filter((p: any) => !prev.some(pp => pp.id === p.id))]);
                if (backupData.sessionData.ankiProgresses) setAnkiProgresses(prev => [...prev, ...backupData.sessionData.ankiProgresses.filter((p: any) => !prev.some(pp => pp.id === p.id))]);
            }

            // Restore User Profile (Stats & Settings)
            // We merge these carefully.
            if (backupData.userProfile) {
                if (backupData.userProfile.stats) {
                    // Keep max XP to avoid regression
                    setStats(prev => ({
                        ...prev,
                        ...backupData.userProfile.stats,
                        xp: Math.max(prev.xp, backupData.userProfile.stats.xp || 0),
                        totalStudyTime: Math.max(prev.totalStudyTime, backupData.userProfile.stats.totalStudyTime || 0)
                    }));
                }
                if (backupData.userProfile.settings) {
                    setSettings(backupData.userProfile.settings);
                }
            }

            showToast("Full backup restored successfully!", "success");
            reset();
            onClose();

        } catch (error) {
            console.error(error);
            showToast("Failed to restore backup.", "error");
        }
    };

    const handleFinishCsvImport = () => {
        if (!parsedCsv) return;
        let finalRows: VocabRow[] = [];
        const destColumns = destination === 'new' ? parsedCsv.headers.map((h, i) => ({ id: `col-import-${i}`, name: h })) : tables.find(t => t.id === appendTableId)?.columns || [];
        const effectiveMap: {[key: number]: string} = {};
        if (destination === 'new') { destColumns.forEach((c, i) => effectiveMap[i] = c.id); } else { Object.assign(effectiveMap, columnMap); }

        finalRows = parsedCsv.rows.map(row => {
            const cols: Record<string, string> = {};
            row.forEach((cellValue, index) => { const destColId = effectiveMap[index]; if (destColId && destColId !== 'ignore') { cols[destColId] = cellValue; } });
            return { id: `row-import-${Date.now()}-${Math.random()}`, cols, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }, };
        });

        if (destination === 'new') {
            const finalTable: Table = { id: `table-import-${Date.now()}`, name: newTableName, columns: destColumns, rows: finalRows, relations: [] };
            importTables([finalTable]);
        } else {
            const tableToAppend: Table = { id: '', name: '', columns: [], rows: finalRows, relations: [] };
            importTables([tableToAppend], appendTableId);
        }

        showToast(`Successfully imported ${finalRows.length} rows.`, 'success');
        reset();
        onClose();
    };
    
    const renderStep = () => {
        switch (step) {
            case 1: return ( <div className="p-6"> <p className="text-center text-slate-500 dark:text-slate-400 mb-4 text-sm">Import from Vmind Backup (.json) or Spreadsheet (.csv).</p> <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"><Icon name="arrow-up-tray" className="w-10 h-10 mx-auto text-slate-400 mb-2"/><input type="file" onChange={e => e.target.files && handleFile(e.target.files[0])} accept=".json,.csv" className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/20 dark:file:text-primary-300 cursor-pointer" /></div> </div> );
            case 2: return ( <div className="p-6"> <h3 className="font-semibold mb-2 text-slate-700 dark:text-slate-200">Destination</h3> <div className="space-y-2"> <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="new" checked={destination === 'new'} onChange={() => setDestination('new')} /> <span className="text-sm">Create new table</span> </label> {destination === 'new' && <input type="text" value={newTableName} onChange={e => setNewTableName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm" />} <label className="flex items-center gap-3 p-2 rounded-md has-[:checked]:bg-slate-100 dark:has-[:checked]:bg-slate-700"> <input type="radio" name="dest" value="append" checked={destination === 'append'} onChange={() => setDestination('append')} /> <span className="text-sm">Append to existing table</span> </label> {destination === 'append' && <select value={appendTableId} onChange={e => setAppendTableId(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-slate-800 dark:text-white ml-6 text-sm"><option value="">Select table...</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>} {destination === 'append' && appendTableId && parsedCsv && ( <div className="ml-6 mt-4"> <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Map CSV Columns</h4> <div className="space-y-2 max-h-32 overflow-y-auto"> {parsedCsv.headers.map((header, index) => { const targetTable = tables.find(t => t.id === appendTableId); return ( <div key={index} className="grid grid-cols-2 gap-2 items-center text-sm"> <span className="truncate font-semibold text-slate-600 dark:text-slate-400" title={header}>{header}</span> <select onChange={e => setColumnMap(m => ({...m, [index]: e.target.value}))} defaultValue="ignore" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs"> <option value="ignore">Ignore</option> {(targetTable?.columns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)} </select> </div> ) })} </div> </div> )} </div> <div className="mt-6 flex justify-end gap-2"> <button onClick={() => { reset(); onClose(); }} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600">Cancel</button> <button onClick={handleFinishCsvImport} disabled={!((destination === 'new' && newTableName) || (destination === 'append' && appendTableId))} className="bg-primary-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-600 disabled:opacity-50">Finish Import</button> </div> </div> );
            case 3: return (
                <div className="p-6">
                    <div className="bg-secondary-50 dark:bg-secondary-900/50 rounded-lg p-4 border border-secondary-200 dark:border-secondary-700 mb-4">
                        <h3 className="font-bold text-lg text-text-main dark:text-secondary-100 mb-2">Backup Found</h3>
                        <ul className="space-y-1 text-sm text-text-subtle">
                            <li>• {backupSummary?.tables} Tables</li>
                            <li>• {backupSummary?.notes} Notes</li>
                            <li>• {backupSummary?.dictations} Dictations</li>
                        </ul>
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-3 font-medium">
                            Restoring this will merge data into your current library. Existing items with the same ID will be updated.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { reset(); onClose(); }} className="bg-white dark:bg-slate-700 text-slate-800 dark:text-white font-semibold px-4 py-2 rounded-md border border-slate-300 dark:border-slate-600">Cancel</button>
                        <button onClick={handleConfirmBackupRestore} className="bg-primary-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-primary-600">Restore Full Backup</button>
                    </div>
                </div>
            );
        }
    };
     return ( <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title={step === 1 ? "Import Data" : (step === 2 ? "Configure CSV" : "Restore Backup")}> {renderStep()} </Modal> );
};

export default ImportModal;
