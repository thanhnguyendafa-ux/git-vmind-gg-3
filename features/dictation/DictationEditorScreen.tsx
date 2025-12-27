
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, TranscriptEntry, DictationNote, VocabRow, Table, Relation, StudyMode, FlashcardStatus } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useDictationNoteStore } from '../../stores/useDictationNoteStore';
import { useTableStore } from '../../stores/useTableStore';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { extractVideoID, parseTimestampedTranscript, extractStartTime, loadYouTubeAPI } from '../../utils/youtubeUtils';
import { formatTimestamp } from '../../services/youtubeTranscriptService';


const CreateDictationLinkModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    mergedText: string;
    startSegmentIndex: number;
    endSegmentIndex: number;
    dictationNoteId: string;
    dictationNoteTitle: string;
}> = ({ isOpen, onClose, mergedText, startSegmentIndex, endSegmentIndex, dictationNoteId, dictationNoteTitle }) => {
    const { tables, updateTable, createTable } = useTableStore(useShallow(state => ({
        tables: state.tables,
        updateTable: state.updateTable,
        createTable: state.createTable,
    })));
    const { showToast } = useUIStore();

    const [targetTableId, setTargetTableId] = useState<string>('');
    const [targetColumnId, setTargetColumnId] = useState<string>('');
    const [matchingTable, setMatchingTable] = useState<Table | null>(null);

    useEffect(() => {
        if (isOpen) {
            const foundTable = tables.find(t => t.name.toLowerCase() === dictationNoteTitle.toLowerCase());
            if (foundTable) {
                setMatchingTable(foundTable);
                setTargetTableId(foundTable.id);
            } else {
                setMatchingTable(null);
                setTargetTableId('new_from_title');
            }
        }
    }, [isOpen, tables, dictationNoteTitle]);

    const selectedTable = useMemo(() => {
        if (targetTableId === 'new_from_title') return null;
        return tables.find(t => t.id === targetTableId);
    }, [targetTableId, tables]);

    useEffect(() => {
        if (selectedTable) {
            setTargetColumnId(selectedTable.columns[0]?.id || '');
        }
    }, [selectedTable]);

    const handleCreateLink = async () => {
        let tableToUpdate: Table | null | undefined;
        let columnIdForText: string;

        if (targetTableId === 'new_from_title') {
            tableToUpdate = await createTable(dictationNoteTitle, 'Merged Text');
            if (!tableToUpdate) {
                showToast('Failed to create new table.', 'error');
                return;
            }
            columnIdForText = tableToUpdate.columns[0].id;
        } else {
            tableToUpdate = tables.find(t => t.id === targetTableId);
            columnIdForText = targetColumnId;
        }

        if (!tableToUpdate || !columnIdForText) {
            showToast('Please select a valid table and column.', 'error');
            return;
        }

        const newRow: VocabRow = {
            id: crypto.randomUUID(),
            cols: { [columnIdForText]: mergedText },
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null },
            createdAt: Date.now(),
            modifiedAt: Date.now()
        };

        const newRelation: Relation = {
            id: crypto.randomUUID(),
            name: `Dictation: ${mergedText.substring(0, 20)}...`,
            questionColumnIds: [],
            answerColumnIds: [],
            compatibleModes: [StudyMode.Dictation],
            dictationConfig: {
                dictationNoteId,
                startSegmentIndex,
                endSegmentIndex,
            },
        };

        const latestVersionOfTable = useTableStore.getState().tables.find(t => t.id === tableToUpdate!.id);

        const finalTableUpdate = {
            ...(latestVersionOfTable || tableToUpdate),
            rows: [...(latestVersionOfTable?.rows || tableToUpdate.rows), newRow],
            relations: [...(latestVersionOfTable?.relations || tableToUpdate.relations), newRelation]
        };

        await updateTable(finalTableUpdate);
        showToast('Dictation link created successfully!', 'success');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Dictation Link">
            <div className="p-6 space-y-4">
                <div>
                    <h4 className="text-sm font-semibold text-text-subtle mb-1">Merged Text Preview</h4>
                    <p className="text-sm p-2 bg-secondary-100 dark:bg-secondary-700/50 rounded-md max-h-24 overflow-y-auto">{mergedText}</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-subtle mb-1">Target Table</label>
                    <select value={targetTableId} onChange={e => setTargetTableId(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm">
                        {!matchingTable && <option value="new_from_title">Create new table: "{dictationNoteTitle}"</option>}
                        {tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {matchingTable && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            We found a matching table and pre-selected it for you.
                        </p>
                    )}
                </div>
                {selectedTable && (
                    <div>
                        <label className="block text-sm font-medium text-text-subtle mb-1">Target Column for Merged Text</label>
                        <select value={targetColumnId} onChange={e => setTargetColumnId(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm">
                            {selectedTable.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreateLink}>Create Link</Button>
                </div>
            </div>
        </Modal>
    );
};

const DictationEditorScreen: React.FC = () => {
    const { editingDictationNote, setEditingDictationNote } = useSessionStore();

    // Retrieve the saved state from the store to verify changes before pushing
    const savedNote = useDictationNoteStore(useShallow(state =>
        state.dictationNotes.find(n => n.id === editingDictationNote?.id)
    ));

    const { updateDictationNote, deleteDictationNote } = useDictationNoteStore();
    const { setCurrentScreen, showToast } = useUIStore();

    const [localNote, setLocalNote] = useState<DictationNote | null>(editingDictationNote);
    const [youtubeUrl, setYoutubeUrl] = useState(editingDictationNote?.youtubeUrl || '');
    const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
    const [previewStartTime, setPreviewStartTime] = useState<number>(0);

    const [importText, setImportText] = useState("");
    const [isImportVisible, setIsImportVisible] = useState(false);

    // UI Local States
    const [currentTime, setCurrentTime] = useState(0);
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    // Surgical Cut Markers
    const [markedStartTime, setMarkedStartTime] = useState<number | null>(null);
    const [markedEndTime, setMarkedEndTime] = useState<number | null>(null);

    const [isImportOpen, setIsImportOpen] = useState(!editingDictationNote?.fullTranscript || editingDictationNote.fullTranscript.length === 0);

    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (localNote) {
            setYoutubeUrl(localNote.youtubeUrl);
            setPreviewVideoId(extractVideoID(localNote.youtubeUrl));
            setPreviewStartTime(extractStartTime(localNote.youtubeUrl));
        }
    }, [localNote]);

    // Initialize YouTube Player API for programmatic control
    useEffect(() => {
        let isMounted = true;
        let player: any = null;

        const initialize = async () => {
            if (!previewVideoId) return;

            try {
                // Use unified loading utility
                await loadYouTubeAPI();

                // Add a small delay to ensure DOM is ready and any previous player is fully cleaned up
                await new Promise(resolve => setTimeout(resolve, 100));

                if (!isMounted) return;

                // Double check container exists
                const container = document.getElementById('yt-player-editor');
                if (!container) {
                    console.warn('YouTube player container not found, retrying...');
                    return;
                }

                // Ensure YT.Player constructor is available
                if (!window.YT || !window.YT.Player) {
                    console.warn('YT.Player not available yet');
                    return;
                }

                player = new window.YT.Player('yt-player-editor', {
                    videoId: previewVideoId,
                    playerVars: {
                        enablejsapi: 1,
                        origin: window.location.origin,
                        start: previewStartTime
                    },
                    events: {
                        onReady: () => {
                            if (isMounted) {
                                console.log('YouTube Player ready for time marking');
                            }
                        },
                        onError: (e: any) => {
                            console.error('YouTube Player Error:', e.data);
                        }
                    }
                });
                playerRef.current = player;
            } catch (err) {
                console.error('Failed to initialize YouTube player:', err);
            }
        };

        initialize();

        return () => {
            isMounted = false;
            if (player) {
                try {
                    player.destroy();
                } catch (e) { /* ignore */ }
            }
        };
    }, [previewVideoId, previewStartTime]);

    const handleParseTranscript = () => {
        if (!importText.trim()) {
            showToast("Please paste the transcript text first.", "error");
            return;
        }
        const parsed = parseTimestampedTranscript(importText);
        if (parsed.length === 0) {
            showToast("Could not find valid timestamps. Please check the format.", "error");
            return;
        }

        // Surgical Cut Flow: We save to fullTranscript (Master) and prompt the user to Cut
        const updatedNote = {
            ...localNote!,
            youtubeUrl,
            fullTranscript: parsed, // Save as Master
            transcript: localNote?.transcript || [] // Don't clear active yet
        };
        setLocalNote(updatedNote);
        updateDictationNote(updatedNote);
        setImportText(''); // Clear input
        showToast(`✅ Master transcript loaded (${parsed.length} lines). Use markers to Cut!`, "success");
    };

    const handleMarkA = () => {
        if (!playerRef.current?.getCurrentTime) {
            showToast("Video player is not ready.", "error");
            return;
        }
        const time = Math.floor(playerRef.current.getCurrentTime());
        setMarkedStartTime(time);
        showToast(`📍 Mark A set at ${formatTimestamp(time)}`, "info");
    };

    const handleMarkB = () => {
        if (!playerRef.current?.getCurrentTime) {
            showToast("Video player is not ready.", "error");
            return;
        }
        const time = Math.floor(playerRef.current.getCurrentTime());
        setMarkedEndTime(time);
        showToast(`📍 Mark B set at ${formatTimestamp(time)}`, "info");
    };

    const handleSurgicalCut = () => {
        if (!localNote?.fullTranscript || localNote.fullTranscript.length === 0) {
            showToast("Please import a Master Transcript first.", "error");
            return;
        }

        if (markedStartTime === null || markedEndTime === null) {
            showToast("Please mark both Point A and Point B on the video.", "error");
            return;
        }

        const start = Math.min(markedStartTime, markedEndTime);
        const end = Math.max(markedStartTime, markedEndTime);

        // Filter Master Transcript by time range
        const matchingEntries = localNote.fullTranscript.filter(entry =>
            entry.start >= start && entry.start <= end
        );

        if (matchingEntries.length === 0) {
            showToast("No transcript entries found in this range.", "error");
            return;
        }

        // Auto-Merge Logic: Combine all matching entries into ONE line
        const mergedText = matchingEntries.map(e => e.text).join(' ').trim();
        const firstEntry = matchingEntries[0];
        const lastEntry = matchingEntries[matchingEntries.length - 1];

        const mergedEntry: TranscriptEntry = {
            text: mergedText,
            start: firstEntry.start,
            duration: (lastEntry.start + (lastEntry.duration || 0)) - firstEntry.start
        };

        const updatedNote = {
            ...localNote,
            transcript: [...(localNote.transcript || []), mergedEntry] // Append the single merged entry
        };
        setLocalNote(updatedNote);
        updateDictationNote(updatedNote);
        showToast(`✂️ Merged ${matchingEntries.length} lines into 1 study segment!`, "success");
    };

    const handleClearSession = () => {
        if (!localNote) return;
        const updatedNote = { ...localNote, transcript: [] };
        setLocalNote(updatedNote);
        updateDictationNote(updatedNote);
        showToast("Current study session cleared.", "info");
    };

    const handleResetMarkers = () => {
        setMarkedStartTime(null);
        setMarkedEndTime(null);
        showToast("Markers reset.", "info");
    };

    const handleSave = () => {
        if (localNote) {
            updateDictationNote({ ...localNote, youtubeUrl });
            setEditingDictationNote(null);
            setCurrentScreen(Screen.Dictation);
        }
    };

    const handleDelete = () => {
        if (localNote) {
            deleteDictationNote(localNote.id);
            setEditingDictationNote(null);
            setCurrentScreen(Screen.Dictation);
        }
    };

    const toggleStar = () => {
        if (localNote) {
            const updatedNote = { ...localNote, isStarred: !localNote.isStarred };
            setLocalNote(updatedNote);
            updateDictationNote(updatedNote);
            showToast(updatedNote.isStarred ? "Marked as completed" : "Marked as incomplete", "success");
        }
    };

    const handleSegmentClick = (index: number, e: React.MouseEvent) => {
        if (e.shiftKey && selectedStart !== null) {
            const start = Math.min(selectedStart, index);
            const end = Math.max(selectedStart, index);
            setSelectedStart(start);
            setSelectedEnd(end);
        } else {
            setSelectedStart(index);
            setSelectedEnd(index);
        }
    };

    // Update specific transcript line
    const handleTextChange = (index: number, newText: string) => {
        if (!localNote || !localNote.transcript) return;
        const newTranscript = [...localNote.transcript];
        newTranscript[index] = { ...newTranscript[index], text: newText };
        setLocalNote({ ...localNote, transcript: newTranscript });
    };

    // Save to DB on blur ONLY if content changed compared to saved store state
    const handleTextBlur = () => {
        if (!localNote || !savedNote) return;

        // Diff Check: Only save if the transcript structure has actually changed
        if (JSON.stringify(localNote.transcript) !== JSON.stringify(savedNote.transcript)) {
            updateDictationNote(localNote);
        }
    };

    const handleMerge = () => {
        if (localNote && selectedStart !== null && selectedEnd !== null) {
            const newTranscript = [...localNote.transcript!];
            const mergedSegments = newTranscript.slice(selectedStart, selectedEnd + 1);

            if (mergedSegments.length === 0) return;

            const mergedText = mergedSegments.map(s => s.text).join(' ');
            const firstEntry = mergedSegments[0];
            const lastEntry = mergedSegments[mergedSegments.length - 1];

            const newEntry: TranscriptEntry = {
                text: mergedText,
                start: firstEntry.start,
                duration: (lastEntry.start + lastEntry.duration) - firstEntry.start
            };

            newTranscript.splice(selectedStart, selectedEnd - selectedStart + 1, newEntry);

            const updatedNote = { ...localNote, transcript: newTranscript };
            setLocalNote(updatedNote);
            updateDictationNote(updatedNote);
            setSelectedStart(null);
            setSelectedEnd(null);
        }
    };

    const handleSplit = () => {
        if (localNote && selectedStart !== null && selectedStart === selectedEnd) {
            const newTranscript = [...localNote.transcript!];
            const entryToSplit = newTranscript[selectedStart];

            const words = entryToSplit.text.split(' ');
            const midPoint = Math.ceil(words.length / 2);
            const text1 = words.slice(0, midPoint).join(' ');
            const text2 = words.slice(midPoint).join(' ');

            const duration1 = entryToSplit.duration / 2;
            const duration2 = entryToSplit.duration / 2;

            const entry1 = { text: text1, start: entryToSplit.start, duration: duration1 };
            const entry2 = { text: text2, start: entryToSplit.start + duration1, duration: duration2 };

            newTranscript.splice(selectedStart, 1, entry1, entry2);

            const updatedNote = { ...localNote, transcript: newTranscript };
            setLocalNote(updatedNote);
            updateDictationNote(updatedNote);
            setSelectedStart(null);
            setSelectedEnd(null);
        }
    };

    const handleOpenLinkModal = () => {
        if (selectedStart !== null && selectedEnd !== null) {
            setIsLinkModalOpen(true);
        }
    };

    const handleTitleBlur = () => {
        if (localNote && savedNote) {
            const title = localNote.title.trim();
            // Diff Check: Only save if title changed and is not empty
            if (title !== '' && title !== savedNote.title) {
                updateDictationNote(localNote);
            }
        }
    }

    if (!localNote) return null;

    const transcript = localNote.transcript || [];
    const mergedTextForLink = selectedStart !== null && selectedEnd !== null
        ? transcript.slice(selectedStart, selectedEnd + 1).map(s => s.text).join(' ')
        : '';

    return (
        <div className="flex flex-col h-screen bg-secondary-50 dark:bg-secondary-900 animate-fadeIn font-sans selection:bg-primary-100 dark:selection:bg-primary-900">
            {/* Header - Compact on Mobile */}
            <header className="flex items-center justify-between px-4 py-3 bg-surface dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 shadow-sm flex-shrink-0 z-20">
                <div className="flex items-center gap-2 overflow-hidden">
                    <button
                        onClick={() => { setEditingDictationNote(null); setCurrentScreen(Screen.Dictation); }}
                        className="p-2 -ml-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 text-text-subtle active:scale-95 transition-transform"
                    >
                        <Icon name="arrowLeft" className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <input
                        type="text"
                        value={localNote.title}
                        onChange={(e) => setLocalNote({ ...localNote, title: e.target.value })}
                        onBlur={handleTitleBlur}
                        className="text-lg sm:text-lg md:text-xl font-bold bg-transparent focus:outline-none focus:bg-secondary-100 dark:focus:bg-secondary-700 rounded px-2 w-full truncate text-text-main dark:text-secondary-100 transition-colors"
                        placeholder="Untitled Session"
                    />
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <button
                        onClick={toggleStar}
                        className={`p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors active:scale-90 ${localNote.isStarred ? 'text-warning-500' : 'text-secondary-400'}`}
                    >
                        <Icon name={localNote.isStarred ? "star" : "star-outline"} variant={localNote.isStarred ? 'filled' : 'outline'} className="w-6 h-6" />
                    </button>

                    {/* Desktop Only Actions */}
                    <div className="hidden md:flex items-center gap-2">
                        <button onClick={handleDelete} className="text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 px-3 py-2 rounded-md font-semibold text-sm transition-colors">Delete</button>
                        <Button onClick={handleSave} size="sm">Done</Button>
                    </div>

                    {/* Mobile Menu (Optional, simplified for now) */}
                    <button onClick={handleSave} className="md:hidden text-primary-600 font-semibold text-sm px-2">Done</button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-0 md:gap-6 flex-1 overflow-hidden">
                {/* Left Panel (Mobile: Top) - Video & Controls */}
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col bg-surface dark:bg-secondary-800 md:bg-transparent z-10 shadow-sm md:shadow-none border-b md:border-b-0 border-secondary-200 dark:border-secondary-700">
                    <div className="p-0 md:p-0">
                        {/* YouTube Input Container - Collapsible on Mobile to Save Space if needed? */}
                        {!previewVideoId ? (
                            <div className="p-4">
                                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Paste YouTube Link</label>
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => {
                                        setYoutubeUrl(e.target.value);
                                        const videoId = extractVideoID(e.target.value);
                                        const startTime = extractStartTime(e.target.value);
                                        setPreviewVideoId(videoId);
                                        setPreviewStartTime(startTime);
                                    }}
                                    className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
                                    placeholder="https://youtu.be/..."
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                {/* Sticky Video Player on Mobile */}
                                <div className="relative w-full aspect-video bg-black shadow-lg">
                                    <div id="yt-player-editor" className="absolute inset-0 w-full h-full"></div>
                                </div>

                                {/* Controls Container */}
                                <div className="p-3 sm:p-4 space-y-3 bg-surface dark:bg-secondary-800">
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={handleMarkA}
                                            className="group relative flex flex-col items-center justify-center py-3 px-4 bg-secondary-100 dark:bg-secondary-700 rounded-xl active:scale-95 transition-all border-2 border-transparent hover:border-primary-500/30 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-primary-500/0 group-active:bg-primary-500/10 transition-colors" />
                                            <span className="text-[10px] uppercase font-extrabold text-secondary-500 dark:text-secondary-400 mb-0.5 tracking-widest">Mark A</span>
                                            <span className="text-xl sm:text-2xl font-mono font-bold text-primary-600 dark:text-primary-400">
                                                {markedStartTime !== null ? formatTimestamp(markedStartTime) : '--:--'}
                                            </span>
                                        </button>

                                        <button
                                            onClick={handleMarkB}
                                            className="group relative flex flex-col items-center justify-center py-3 px-4 bg-secondary-100 dark:bg-secondary-700 rounded-xl active:scale-95 transition-all border-2 border-transparent hover:border-primary-500/30 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-primary-500/0 group-active:bg-primary-500/10 transition-colors" />
                                            <span className="text-[10px] uppercase font-extrabold text-secondary-500 dark:text-secondary-400 mb-0.5 tracking-widest">Mark B</span>
                                            <span className="text-xl sm:text-2xl font-mono font-bold text-primary-600 dark:text-primary-400">
                                                {markedEndTime !== null ? formatTimestamp(markedEndTime) : '--:--'}
                                            </span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleSurgicalCut}
                                        disabled={markedStartTime === null || markedEndTime === null}
                                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-700 hover:to-primary-700 text-white rounded-xl font-bold shadow-md shadow-primary-500/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                    >
                                        <Icon name="plus" className="w-5 h-5" />
                                        <span>Add Segment to Session</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Collapsible Import Section */}
                    <div className="px-3 pb-3 md:px-0 md:pb-0">
                        <div className="bg-surface dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
                            <div
                                className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                                onClick={() => setIsImportOpen(!isImportOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-lg">
                                        <Icon name="clipboard" className="w-4 h-4 text-text-subtle" />
                                    </div>
                                    <h3 className="font-semibold text-text-main dark:text-secondary-100 text-sm">
                                        Import Transcript
                                    </h3>
                                </div>
                                <Icon name={isImportOpen ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-text-subtle" />
                            </div>

                            {isImportOpen && (
                                <div className="p-3 pt-0 animate-fadeIn">
                                    <textarea
                                        className="w-full h-32 bg-secondary-50 dark:bg-secondary-900/50 border border-secondary-200 dark:border-secondary-600 rounded-lg p-3 text-xs font-mono mb-3 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-secondary-400"
                                        placeholder={`Paste full transcript here...\n1:18 China could soon...\n2:30 The economy is...`}
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                    />
                                    <Button onClick={handleParseTranscript} className="w-full py-2.5" disabled={!importText.trim()} size="sm">
                                        Parse & Load
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel (Mobile: Bottom) - Transcript List */}
                <div className="flex-1 flex flex-col bg-surface dark:bg-secondary-800 md:rounded-tl-2xl border-t md:border-t-0 md:border-l border-secondary-200 dark:border-secondary-700 overflow-hidden relative">
                    <div className="p-3 md:p-4 border-b border-secondary-100 dark:border-secondary-700 flex justify-between items-center bg-surface/50 dark:bg-secondary-800/50 backdrop-blur-sm z-10">
                        <h3 className="font-bold text-text-main dark:text-secondary-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary-500 block"></span>
                            Transcript
                        </h3>
                        <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-md text-xs font-mono text-text-subtle">
                            {transcript.length} Segments
                        </span>
                    </div>

                    {/* Transcript List with proper padding for mobile bottom bar */}
                    <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 pb-32 md:pb-4 scroll-smooth">
                        {transcript.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-text-subtle p-8 text-center opacity-60">
                                <Icon name="document" className="w-12 h-12 mb-3 text-secondary-300 dark:text-secondary-600" />
                                <p className="font-medium">No lines yet</p>
                                <p className="text-xs mt-1 max-w-[200px]">Import text or use the video controls to add segments.</p>
                            </div>
                        ) : (
                            transcript.map((entry, index) => {
                                const isSelected = selectedStart !== null && selectedEnd !== null && index >= selectedStart && index <= selectedEnd;
                                return (
                                    <div
                                        key={index}
                                        onClick={(e) => handleSegmentClick(index, e)}
                                        className={`group relative p-3 rounded-xl cursor-pointer border transition-all duration-200 ${isSelected
                                                ? 'bg-primary-50/80 dark:bg-primary-900/30 border-primary-500 shadow-sm ring-1 ring-primary-500/50 translate-x-1'
                                                : 'bg-white dark:bg-secondary-700/30 border-transparent hover:bg-secondary-50 dark:hover:bg-secondary-700/50 hover:border-secondary-200 dark:hover:border-secondary-600'
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-[10px] sm:text-xs font-mono text-text-subtle mt-1.5 select-none flex-shrink-0 w-10 sm:w-12 text-right opacity-70 group-hover:opacity-100 transition-opacity">
                                                {new Date(entry.start * 1000).toISOString().substr(14, 5)}
                                            </span>
                                            <textarea
                                                value={entry.text}
                                                onChange={(e) => handleTextChange(index, e.target.value)}
                                                onBlur={handleTextBlur}
                                                className="flex-grow bg-transparent border-none outline-none focus:ring-0 rounded p-0 text-sm sm:text-base text-text-main dark:text-secondary-100 resize-none overflow-hidden leading-relaxed font-medium"
                                                rows={Math.max(1, Math.ceil(entry.text.length / 50))}
                                                style={{ minHeight: '24px' }}
                                                spellCheck={false}
                                            />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Bottom Action Bar - Glassmorphism & Safe Area */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-secondary-900/90 backdrop-blur-xl border-t border-secondary-200 dark:border-secondary-800 z-50 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] transition-transform duration-300">
                <div className="flex items-center justify-between px-2 py-2">
                    <button
                        onClick={handleMerge}
                        disabled={selectedStart === null || selectedEnd === null || selectedStart === selectedEnd}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-secondary-600 dark:text-secondary-400 disabled:opacity-30 disabled:grayscale active:bg-secondary-100 dark:active:bg-secondary-800 transition-colors"
                    >
                        <div className="p-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-800 group-active:scale-95 transition-transform">
                            <Icon name="git-merge" className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-semibold">Merge</span>
                    </button>

                    <button
                        onClick={handleSplit}
                        disabled={selectedStart === null || selectedEnd === null || selectedStart !== selectedEnd}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-secondary-600 dark:text-secondary-400 disabled:opacity-30 disabled:grayscale active:bg-secondary-100 dark:active:bg-secondary-800 transition-colors"
                    >
                        <div className="p-1.5 rounded-lg bg-secondary-100 dark:bg-secondary-800 group-active:scale-95 transition-transform">
                            <Icon name="git-split" className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-semibold">Split</span>
                    </button>

                    <button
                        onClick={handleOpenLinkModal}
                        disabled={selectedStart === null}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-primary-600 dark:text-primary-400 disabled:opacity-30 disabled:grayscale active:bg-primary-50 dark:active:bg-primary-900/20 transition-colors"
                    >
                        <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30 group-active:scale-95 transition-transform">
                            <Icon name="link" className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold">Link</span>
                    </button>

                    <div className="w-px h-8 bg-secondary-200 dark:bg-secondary-800 mx-1"></div>

                    <button
                        onClick={handleClearSession}
                        disabled={!localNote.transcript || localNote.transcript.length === 0}
                        className="flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-error-500 disabled:opacity-30 disabled:grayscale active:bg-error-50 dark:active:bg-error-900/20 transition-colors"
                    >
                        <div className="p-1.5 rounded-lg bg-error-50 dark:bg-error-900/20 group-active:scale-95 transition-transform">
                            <Icon name="trash" className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-medium">Clear</span>
                    </button>
                </div>
            </div>

            <CreateDictationLinkModal
                isOpen={isLinkModalOpen}
                onClose={() => setIsLinkModalOpen(false)}
                mergedText={mergedTextForLink}
                startSegmentIndex={selectedStart || 0}
                endSegmentIndex={selectedEnd || 0}
                dictationNoteId={localNote.id}
                dictationNoteTitle={localNote.title}
            />
        </div>
    );
};

export default DictationEditorScreen;
