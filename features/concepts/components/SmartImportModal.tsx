
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useConceptStore } from '../../../stores/useConceptStore';
import { useTableStore } from '../../../stores/useTableStore';
import Icon from '../../../components/ui/Icon';
import { ImportParser, ParsedGrid } from '../utils/ImportParser';
import ImportMapper, { ColumnMappingState, TargetField } from './ImportMapper';
import { generateUUID } from '../../../utils/uuidUtils';
import { VocabRow, FlashcardStatus } from '../../../types';
import { VmindSyncEngine } from '../../../services/VmindSyncEngine';

interface SmartImportModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'PASTE' | 'MAP' | 'IMPORTING' | 'SYNCING' | 'SUCCESS';

const SmartImportModal: React.FC<SmartImportModalProps> = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState<Step>('PASTE');
    const [pasteData, setPasteData] = useState('');
    const [parsedGrid, setParsedGrid] = useState<ParsedGrid | null>(null);
    const [mapping, setMapping] = useState<ColumnMappingState[]>([]);

    // Concept Config
    const [mode, setMode] = useState<'NEW' | 'EXISTING'>('NEW');
    const [newConceptName, setNewConceptName] = useState('');
    const [existingConceptId, setExistingConceptId] = useState('');
    const concepts = useConceptStore(s => s.concepts);
    const foldersOnly = concepts.filter(c => c.isFolder);

    // Import Strategy
    const [defaultLevelName, setDefaultLevelName] = useState('Level 1');
    const [importLog, setImportLog] = useState<string[]>([]);

    const handleParse = () => {
        if (!pasteData.trim()) return;
        const grid = ImportParser.parse(pasteData);
        setParsedGrid(grid);

        // Smart Automap
        const initialMapping: ColumnMappingState[] = grid.headers.map((header, index) => {
            const h = header.toLowerCase();
            let dest: TargetField = 'IGNORE';
            let customName = undefined;

            if (h.includes('vocab') || h.includes('word') || h.includes('term') || h.includes('phrase') || h.includes('question')) dest = 'VOCAB';
            else if (h.includes('def') || h.includes('meaning') || h.includes('answer') || h.includes('translat')) dest = 'DEF';
            else if (h.includes('level') || h.includes('group') || h.includes('category') || h.includes('difficulty')) dest = 'LEVEL';
            else if (h.includes('note') || h.includes('context')) dest = 'NOTE';
            else if (h.includes('example') || h.includes('ipa')) {
                dest = 'CUSTOM';
                customName = header; // Keep original name
            }

            return { sourceIndex: index, destination: dest, customName };
        });
        setMapping(initialMapping);
        setStep('MAP');
    };

    const handleMapChange = (index: number, destination: TargetField, customName?: string) => {
        setMapping(prev => prev.map(m => m.sourceIndex === index ? { ...m, destination, customName } : m));
    };

    const executeImport = async () => {
        if (!parsedGrid) return;
        setStep('IMPORTING');
        const log = (msg: string) => setImportLog(prev => [...prev, msg]);

        try {
            const conceptStore = useConceptStore.getState();
            const tableStore = useTableStore.getState();

            // 1. Resolve Concept
            let targetConceptId = existingConceptId;
            let targetConceptName = "";

            if (mode === 'NEW') {
                log(`Creating Concept: "${newConceptName}"...`);
                // Auto generate code internally in store, but we can fetch a safe one or let store handle duplicate retry logic
                // For V1 we just trust the store's uuid generation for ID, but code needs to be unique.
                // We'll generate a random 4 digit code for now that doesn't exist.
                const generateCode = () => {
                    // Simple random code
                    return Math.floor(1000 + Math.random() * 9000).toString();
                };

                const newConcept = await conceptStore.createConcept(generateCode(), newConceptName, "Imported via Smart Import");
                targetConceptId = newConcept.id;
                targetConceptName = newConceptName;
                log(`Concept Created! Code: ${newConcept.code}`);
            } else {
                const existing = concepts.find(c => c.id === existingConceptId);
                targetConceptName = existing?.name || "Imported";
            }

            // 2. Resolve Levels
            log("Analyzing Levels...");
            const levelColIndex = mapping.find(m => m.destination === 'LEVEL')?.sourceIndex;

            // Extract unique levels from data
            const uniqueLevelNames = new Set<string>();
            if (levelColIndex !== undefined) {
                parsedGrid.rows.forEach(row => {
                    const val = row[levelColIndex]?.trim();
                    if (val) uniqueLevelNames.add(val);
                });
            }

            // Create Levels if needed
            const levelMap = new Map<string, string>(); // Name -> ID

            // Fetch existing levels first
            const existingLevels = conceptStore.getLevelsByConcept(targetConceptId);
            existingLevels.forEach(l => levelMap.set(l.name.toLowerCase(), l.id));

            let orderCounter = existingLevels.length > 0 ? Math.max(...existingLevels.map(l => l.order)) + 1 : 1;

            // FIX: Sort levels semantically before creating (prevents "Level 2" appearing before "Level 1")
            const sortedLevelNames = Array.from(uniqueLevelNames).sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
                const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
                if (numA !== numB) return numA - numB;
                return a.localeCompare(b); // Fallback to alphabetical
            });

            for (const lvlName of sortedLevelNames) {
                const key = lvlName.toLowerCase();
                if (!levelMap.has(key)) {
                    log(`Creating Level: ${lvlName}`);
                    const newLevel = await conceptStore.createLevel(targetConceptId, lvlName, orderCounter++);
                    levelMap.set(key, newLevel.id);
                }
            }

            // Ensure Default Level exists if we have rows without level
            const defaultLevelKey = defaultLevelName.toLowerCase();
            let defaultLevelId = "";
            if (!levelMap.has(defaultLevelKey)) {
                // Check if it really doesn't exist or just wasn't in the unique set
                // (Already fetched existing levels above)
                if (!levelMap.has(defaultLevelKey)) {
                    log(`Creating Default Level: ${defaultLevelName}`);
                    const defLvl = await conceptStore.createLevel(targetConceptId, defaultLevelName, orderCounter++);
                    levelMap.set(defaultLevelKey, defLvl.id);
                    defaultLevelId = defLvl.id;
                } else {
                    defaultLevelId = levelMap.get(defaultLevelKey)!;
                }
            } else {
                defaultLevelId = levelMap.get(defaultLevelKey)!;
            }


            // 3. Create Table
            log("Structuring Knowledge Table...");
            // Standard columns
            const cols = ['Vocab', 'Definition']; // Fixed base columns
            if (mapping.some(m => m.destination === 'NOTE')) cols.push('Note');

            // Custom columns
            mapping.filter(m => m.destination === 'CUSTOM').forEach(m => {
                if (m.customName) cols.push(m.customName);
            });

            const tableName = `${targetConceptName} Vocabulary`;
            const table = await tableStore.createTable(tableName, cols.join(', '));

            if (!table) throw new Error("Failed to create table");
            log(`Table Created: ${tableName}`);

            // Map standard column IDs
            const vocabColId = table.columns.find(c => c.name === 'Vocab')?.id!;
            const defColId = table.columns.find(c => c.name === 'Definition')?.id!;
            const noteColId = table.columns.find(c => c.name === 'Note')?.id;

            // 4. Create Rows
            log(`Importing ${parsedGrid.rows.length} rows...`);
            const rowsToAdd: VocabRow[] = [];

            parsedGrid.rows.forEach(sourceRow => {
                const rowId = generateUUID();
                const colData: Record<string, string> = {};

                // Fill standard cols
                const vocabIdx = mapping.find(m => m.destination === 'VOCAB')?.sourceIndex;
                const defIdx = mapping.find(m => m.destination === 'DEF')?.sourceIndex;
                const noteIdx = mapping.find(m => m.destination === 'NOTE')?.sourceIndex;

                if (vocabIdx !== undefined) colData[vocabColId] = sourceRow[vocabIdx] || '';
                if (defIdx !== undefined) colData[defColId] = sourceRow[defIdx] || '';
                if (noteIdx !== undefined && noteColId) colData[noteColId] = sourceRow[noteIdx] || '';

                // Fill custom cols
                mapping.filter(m => m.destination === 'CUSTOM').forEach(m => {
                    const colId = table.columns.find(c => c.name === m.customName)?.id;
                    const idx = m.sourceIndex;
                    if (colId && idx !== undefined) {
                        colData[colId] = sourceRow[idx] || '';
                    }
                });

                // Resolve Level
                let rowLevelId = defaultLevelId;
                if (levelColIndex !== undefined) {
                    const val = sourceRow[levelColIndex]?.trim();
                    if (val) {
                        const mappedId = levelMap.get(val.toLowerCase());
                        if (mappedId) rowLevelId = mappedId;
                    }
                }

                rowsToAdd.push({
                    id: rowId,
                    cols: colData,
                    conceptLevelId: rowLevelId,
                    conceptLevelIds: [rowLevelId],
                    stats: {
                        correct: 0,
                        incorrect: 0,
                        lastStudied: null,
                        flashcardStatus: FlashcardStatus.New,
                        flashcardEncounters: 0,
                        isFlashcardReviewed: false,
                        lastPracticeDate: null
                    },
                    createdAt: Date.now(),
                    modifiedAt: Date.now()
                });
            });

            await tableStore.addRows(table.id, rowsToAdd);
            log("Records prepared. Saving to cloud...");

            // Option D: Hybrid Approach - Sync Progress Tracking
            setStep('SYNCING');
            const engine = VmindSyncEngine.getInstance();
            const startQueueLen = engine.getQueueLength();

            // Wait for sync with progress updates and timeout
            const syncComplete = await new Promise<boolean>((resolve) => {
                let elapsed = 0;
                const maxWait = 15000; // 15 seconds max
                const checkInterval = 200;

                const check = setInterval(() => {
                    elapsed += checkInterval;
                    const remaining = engine.getQueueLength();
                    const synced = startQueueLen - remaining;

                    if (remaining === 0) {
                        clearInterval(check);
                        log(`All ${startQueueLen} items synced to cloud!`);
                        resolve(true);
                    } else if (elapsed >= maxWait) {
                        clearInterval(check);
                        log(`Sync in progress (${remaining} items remaining). Data will sync in background.`);
                        resolve(false);
                    } else if (elapsed % 1000 === 0) {
                        // Log progress every second
                        log(`Syncing... ${synced}/${startQueueLen}`);
                    }
                }, checkInterval);
            });

            setStep('SUCCESS');
            onSuccess();

        } catch (err: any) {
            console.error(err);
            log(`ERROR: ${err.message}`);
        }
    };

    // --- Validation ---
    const canProceedToMap = pasteData.trim().length > 0 && (mode === 'NEW' ? newConceptName.trim().length > 0 : !!existingConceptId);

    // Check if Vocab column is mapped
    const canImport = useMemo(() => {
        const hasVocab = mapping.some(m => m.destination === 'VOCAB');
        return hasVocab;
    }, [mapping]);


    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-secondary-900 rounded-2xl max-w-5xl w-full h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-border-subtle dark:border-white/10">
                {/* Header */}
                <div className="p-6 border-b border-border-subtle dark:border-white/10 flex justify-between items-center bg-secondary-50 dark:bg-black/20">
                    <div>
                        <h2 className="text-xl font-serif font-bold text-text-main dark:text-white flex items-center gap-2">
                            <Icon name="wand" className={`w-5 h-5 text-purple-500`} />
                            Concept Factory
                        </h2>
                        <p className="text-xs text-text-subtle mt-1 uppercase tracking-widest">
                            {step === 'PASTE' ? 'Step 1: Paste & Context' : step === 'MAP' ? 'Step 2: Map Columns' : 'Importing...'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                        <Icon name="x" className="w-5 h-5 text-text-subtle" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
                    {step === 'PASTE' && (
                        <div className="h-full flex gap-6">
                            {/* Left: Context Config */}
                            <div className="w-1/3 flex flex-col gap-6">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wider">
                                        Where is this going?
                                    </label>

                                    <div className="space-y-3">
                                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'NEW' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'border-border-subtle dark:border-white/10 hover:bg-secondary-50 dark:hover:bg-secondary-800'}`}>
                                            <input type="radio" checked={mode === 'NEW'} onChange={() => setMode('NEW')} className="mt-1" />
                                            <div>
                                                <span className="block font-bold text-sm text-text-main dark:text-white">Create New Concept</span>
                                                <span className="text-xs text-text-subtle">Auto-generate clean code & structure</span>
                                                {mode === 'NEW' && (
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Biology 101"
                                                        value={newConceptName}
                                                        onChange={(e) => setNewConceptName(e.target.value)}
                                                        className="mt-2 w-full p-2 bg-white dark:bg-black/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        </label>

                                        <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${mode === 'EXISTING' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 ring-1 ring-purple-500' : 'border-border-subtle dark:border-white/10 hover:bg-secondary-50 dark:hover:bg-secondary-800'}`}>
                                            <input type="radio" checked={mode === 'EXISTING'} onChange={() => setMode('EXISTING')} className="mt-1" />
                                            <div>
                                                <span className="block font-bold text-sm text-text-main dark:text-white">Add to Existing</span>
                                                <span className="text-xs text-text-subtle">Append content to known concept</span>
                                                {mode === 'EXISTING' && (
                                                    <select
                                                        value={existingConceptId}
                                                        onChange={(e) => setExistingConceptId(e.target.value)}
                                                        className="mt-2 w-full p-2 bg-white dark:bg-black/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                                    >
                                                        <option value="">Select a concept...</option>
                                                        {concepts.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Paste Zone */}
                            <div className="flex-1 flex flex-col gap-2">
                                <label className="text-sm font-bold text-text-main dark:text-white uppercase tracking-wider flex justify-between">
                                    <span>Paste Content (Excel or Markdown)</span>
                                    <span className="text-xs font-normal text-text-subtle normal-case">Supports Tab-Separated or generic tables</span>
                                </label>
                                <textarea
                                    value={pasteData}
                                    onChange={(e) => setPasteData(e.target.value)}
                                    placeholder={`Example:\nTerm\tDefinition\tLevel\nPhotosynthesis\tProcess using light\tBasic\n...`}
                                    className="flex-1 p-4 bg-secondary-50 dark:bg-black/20 border border-border-subtle dark:border-white/10 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'MAP' && parsedGrid && (
                        <div className="h-full flex flex-col gap-4">
                            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                                    <Icon name="info" className="w-4 h-4" />
                                    <span>Detected <strong>{parsedGrid.format}</strong> format with <strong>{parsedGrid.rows.length}</strong> rows. Match the columns below.</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-text-subtle">Targeting: <strong>{mode === 'NEW' ? newConceptName : concepts.find(c => c.id === existingConceptId)?.name}</strong></span>
                                </div>
                            </div>

                            <ImportMapper
                                grid={parsedGrid}
                                mapping={mapping}
                                onMap={handleMapChange}
                            />

                            <div className="flex items-center gap-2 text-xs text-text-subtle justify-end">
                                <span>Default Level for unmapped rows:</span>
                                <input
                                    type="text"
                                    value={defaultLevelName}
                                    onChange={(e) => setDefaultLevelName(e.target.value)}
                                    className="bg-transparent border-b border-white/20 px-1 focus:outline-none focus:border-purple-500 text-text-main dark:text-white font-bold w-24"
                                />
                            </div>
                        </div>
                    )}

                    {(step === 'IMPORTING' || step === 'SYNCING' || step === 'SUCCESS') && (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            {step === 'IMPORTING' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
                                    <h3 className="text-xl font-bold text-text-main dark:text-white">Fabricating Knowledge...</h3>
                                    <div className="w-full max-w-md bg-secondary-50 dark:bg-black/40 rounded-lg p-4 font-mono text-xs text-left h-48 overflow-auto border border-white/10">
                                        {importLog.map((log, i) => (
                                            <div key={i} className="text-text-subtle mb-1">&gt; {log}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : step === 'SYNCING' ? (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/30 border-t-emerald-500 animate-spin" />
                                    <h3 className="text-xl font-bold text-text-main dark:text-white">Saving to Cloud...</h3>
                                    <p className="text-text-subtle text-sm">Ensuring your data is safely stored</p>
                                    <div className="w-full max-w-md bg-secondary-50 dark:bg-black/40 rounded-lg p-4 font-mono text-xs text-left h-48 overflow-auto border border-white/10">
                                        {importLog.map((log, i) => (
                                            <div key={i} className="text-text-subtle mb-1">&gt; {log}</div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 animate-fadeIn">
                                    <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Icon name="check" className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-text-main dark:text-white">Import Complete!</h3>
                                    <p className="text-text-subtle">Your concept has been constructed and populated.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border-subtle dark:border-white/10 flex justify-end gap-3 bg-secondary-50 dark:bg-black/20">
                    {step === 'SUCCESS' ? (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                        >
                            Start Learning
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onClose}
                                className="px-5 py-2 text-text-subtle hover:text-text-main dark:hover:text-white transition-colors font-medium"
                            >
                                Cancel
                            </button>

                            {step === 'PASTE' && (
                                <button
                                    onClick={handleParse}
                                    disabled={!canProceedToMap}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next: Map Columns
                                </button>
                            )}

                            {step === 'MAP' && (
                                <button
                                    onClick={executeImport}
                                    disabled={!canImport}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Icon name="upload" className="w-4 h-4" />
                                    Construct Concept
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SmartImportModal;
