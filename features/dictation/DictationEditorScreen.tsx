
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, TranscriptEntry, DictationNote, VocabRow, Table, Relation, StudyMode, FlashcardStatus } from '../../types';
import Icon from '../../components/ui/Icon';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { extractVideoID, parseTimestampedTranscript, extractStartTime } from '../../utils/youtubeUtils';
import { useDictationNoteStore } from '../../stores/useDictationNoteStore';
import { useTableStore } from '../../stores/useTableStore';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

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
            stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
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
    
    const [rawTranscript, setRawTranscript] = useState('');
    
    const [selectedStart, setSelectedStart] = useState<number | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<number | null>(null);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    useEffect(() => {
        if (localNote) {
            setYoutubeUrl(localNote.youtubeUrl);
            setPreviewVideoId(extractVideoID(localNote.youtubeUrl));
            setPreviewStartTime(extractStartTime(localNote.youtubeUrl));
        }
    }, [localNote]);

    const handleParseTranscript = () => {
        if (!rawTranscript.trim()) {
            showToast("Please paste the transcript text first.", "error");
            return;
        }
        
        const parsed = parseTimestampedTranscript(rawTranscript);
        if (parsed.length === 0) {
            showToast("Could not find valid timestamps. Please check the format.", "error");
            return;
        }
        
        const updatedNote = { ...localNote!, youtubeUrl, transcript: parsed };
        setLocalNote(updatedNote);
        updateDictationNote(updatedNote);
        setRawTranscript(''); // Clear input
        showToast(`Imported ${parsed.length} lines successfully!`, "success");
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
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn flex flex-col h-screen">
             <header className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setEditingDictationNote(null); setCurrentScreen(Screen.Dictation); }} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                        <Icon name="arrowLeft" className="w-6 h-6" />
                    </button>
                    <input
                        type="text"
                        value={localNote.title}
                        onChange={(e) => setLocalNote({ ...localNote, title: e.target.value })}
                        onBlur={handleTitleBlur}
                        className="text-2xl font-bold bg-transparent focus:outline-none focus:bg-secondary-100 dark:focus:bg-secondary-800 rounded px-2 -ml-2 text-text-main dark:text-secondary-100"
                        placeholder="Dictation Title"
                    />
                </div>
                <div className="flex items-center gap-2">
                     <button onClick={toggleStar} title={localNote.isStarred ? "Mark as incomplete" : "Mark as complete"} className={`p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors ${localNote.isStarred ? 'text-warning-500' : 'text-secondary-400'}`}>
                        <Icon name={localNote.isStarred ? "star" : "star-outline"} variant={localNote.isStarred ? 'filled' : 'outline'} className="w-6 h-6" />
                     </button>
                     <button onClick={handleDelete} className="text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 px-3 py-2 rounded-md font-semibold text-sm">Delete</button>
                     <Button onClick={handleSave}>Done</Button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
                {/* Left Panel: Video & Config */}
                <div className="w-full md:w-1/3 flex-shrink-0 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-surface dark:bg-secondary-800 p-4 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
                        <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">YouTube URL</label>
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
                            className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        {previewVideoId && (
                            <div className="mt-4 aspect-video rounded-lg overflow-hidden bg-black">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={`https://www.youtube.com/embed/${previewVideoId}?playsinline=1&start=${previewStartTime}`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>
                    
                    {/* Transcript Input */}
                    <div className="bg-surface dark:bg-secondary-800 p-4 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
                        <h3 className="font-bold text-text-main dark:text-secondary-100 mb-2 text-sm">Import Transcript</h3>
                        <p className="text-xs text-text-subtle mb-3">
                            Paste transcript from YouTube. Format:<br/>
                            <code>1:05</code><br/>
                            <code>Text line...</code>
                        </p>
                        <textarea 
                            className="w-full h-32 bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md p-2 text-xs font-mono mb-3"
                            placeholder={`1:18\nChina could soon...`}
                            value={rawTranscript}
                            onChange={(e) => setRawTranscript(e.target.value)}
                        />
                        <Button onClick={handleParseTranscript} className="w-full" disabled={!rawTranscript.trim()}>
                            Import
                        </Button>
                    </div>

                    <div className="bg-surface dark:bg-secondary-800 p-4 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 flex-1">
                        <h3 className="font-bold text-text-main dark:text-secondary-100 mb-2">Tools</h3>
                         <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="secondary" onClick={handleMerge} disabled={selectedStart === null || selectedEnd === null || selectedStart === selectedEnd}>Merge Selected</Button>
                            <Button size="sm" variant="secondary" onClick={handleSplit} disabled={selectedStart === null || selectedEnd === null || selectedStart !== selectedEnd}>Split Segment</Button>
                            <Button size="sm" variant="primary" onClick={handleOpenLinkModal} disabled={selectedStart === null}>Link to Table</Button>
                        </div>
                         <p className="text-xs text-text-subtle mt-4">
                            <strong>Tip:</strong> Hold Shift to select multiple segments.
                        </p>
                    </div>
                </div>

                {/* Right Panel: Transcript Editor */}
                <div className="flex-1 bg-surface dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
                        <h3 className="font-bold text-text-main dark:text-secondary-100">Transcript</h3>
                        <span className="text-xs text-text-subtle">{transcript.length} segments</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {transcript.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-text-subtle p-4 text-center">
                                <p>No transcript loaded.</p>
                                <p className="text-sm mt-2">Use the "Import Transcript" box on the left to add content.</p>
                            </div>
                        ) : (
                            transcript.map((entry, index) => {
                                const isSelected = selectedStart !== null && selectedEnd !== null && index >= selectedStart && index <= selectedEnd;
                                return (
                                <div
                                    key={index}
                                    onClick={(e) => handleSegmentClick(index, e)}
                                    className={`p-3 rounded-md cursor-pointer border transition-all ${isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500 ring-1 ring-primary-500' : 'border-transparent hover:bg-secondary-50 dark:hover:bg-secondary-700/50'}`}
                                >
                                    <div className="flex gap-3">
                                        <span className="text-xs font-mono text-text-subtle mt-1.5 select-none flex-shrink-0 w-12">
                                            {new Date(entry.start * 1000).toISOString().substr(14, 5)}
                                        </span>
                                        <textarea
                                            value={entry.text}
                                            onChange={(e) => handleTextChange(index, e.target.value)}
                                            onBlur={handleTextBlur}
                                            onClick={(e) => {
                                                // Don't bubble up to the container if we are interacting with the textarea, 
                                                // BUT we usually want selection logic to happen too.
                                                // If we stopPropagation, clicking here WON'T select the row for merging tools.
                                                // If we want to edit AND select, we let it bubble.
                                                // However, text selection inside textarea might be tricky if the parent also handles clicks.
                                                // Since the parent `div` click handles `selectedStart/End`, letting it bubble is fine.
                                                // The textarea handles its own focus.
                                            }}
                                            className="flex-grow bg-transparent border-none outline-none focus:ring-0 focus:bg-secondary-100/50 dark:focus:bg-secondary-700/50 rounded p-1 text-sm text-text-main dark:text-secondary-100 resize-none overflow-hidden leading-relaxed"
                                            rows={Math.max(1, Math.ceil(entry.text.length / 60))}
                                            style={{ minHeight: '24px' }}
                                        />
                                    </div>
                                </div>
                                )
                            })
                        )}
                    </div>
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
