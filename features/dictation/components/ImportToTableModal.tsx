
import React, { useState, useEffect } from 'react';
import { Column, Table, FlashcardStatus, StudyMode } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';

interface ImportToTableModalProps {
    isOpen: boolean;
    onClose: () => void;
    transcriptText: string;
    videoUrl: string; // The full URL with start/end (e.g. youtube.com/watch?v=...&t=...#end=...)
    translation?: string;
    // New Props for Linking
    dictationNoteId?: string;
    segmentIndex?: number;
}

const CANONICAL_VIDEO = "ExtractedVideoAB";
const CANONICAL_TRANSCRIPT = "ExtractedtranscriptAB";

const ImportToTableModal: React.FC<ImportToTableModalProps> = ({
    isOpen, onClose, transcriptText, videoUrl, translation,
    dictationNoteId, segmentIndex
}) => {
    const { tables, upsertRow, updateTable } = useTableStore();
    const { showToast } = useUIStore();

    const [selectedTableId, setSelectedTableId] = useState<string>('');
    const [targetTextColId, setTargetTextColId] = useState<string>('');
    const [targetVideoColId, setTargetVideoColId] = useState<string>('');
    const [targetMeaningColId, setTargetMeaningColId] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingCol, setIsCreatingCol] = useState(false);

    // Auto-select first table
    useEffect(() => {
        if (tables.length > 0 && !selectedTableId) {
            setSelectedTableId(tables[0].id);
        }
    }, [tables, selectedTableId]);

    const selectedTable = tables.find(t => t.id === selectedTableId);

    // Auto-map columns based on config or names
    useEffect(() => {
        if (!selectedTable) return;

        // Reset
        setTargetTextColId('');
        setTargetVideoColId('');
        setTargetMeaningColId('');

        // 1. Video Column Detection (3-tier priority system)
        let detectedVideoColId = '';

        // Priority 1: videoConfig (if set and column still exists)
        if (selectedTable.videoConfig?.videoColumnId) {
            const configCol = selectedTable.columns.find(c => c.id === selectedTable.videoConfig.videoColumnId);
            if (configCol) {
                detectedVideoColId = configCol.id;
            }
        }

        // Priority 2: Canonical name "ExtractedVideoAB"
        if (!detectedVideoColId) {
            const canonicalCol = selectedTable.columns.find(c => c.name === CANONICAL_VIDEO);
            if (canonicalCol) {
                detectedVideoColId = canonicalCol.id;
            }
        }

        // Priority 3: Regex fallback (legacy support)
        if (!detectedVideoColId) {
            const legacyCol = selectedTable.columns.find(c => /video|link|clip|youtube/i.test(c.name));
            if (legacyCol) detectedVideoColId = legacyCol.id;
        }

        setTargetVideoColId(detectedVideoColId);

        // 2. Transcript/Audio Column Detection
        let detectedTextColId = '';

        // Priority 1: Canonical name "ExtractedtranscriptAB"
        const transcriptCol = selectedTable.columns.find(c => c.name === CANONICAL_TRANSCRIPT);
        if (transcriptCol) {
            detectedTextColId = transcriptCol.id;
        }

        // Priority 2: Regex/Type fallback
        if (!detectedTextColId) {
            const textCols = selectedTable.columns.filter(c =>
                c.id !== detectedVideoColId &&
                c.id !== selectedTable.imageConfig?.imageColumnId
            );

            if (textCols.length > 0) {
                // Try to find "Sentence" or "Phrase" or "Text"
                const sentCol = textCols.find(c => /sentence|phrase|text|transcript/i.test(c.name));
                detectedTextColId = sentCol ? sentCol.id : textCols[0].id;
            }
        }
        setTargetTextColId(detectedTextColId);

        // 3. Meaning Column
        const remainingCols = selectedTable.columns.filter(c =>
            c.id !== detectedVideoColId &&
            c.id !== detectedTextColId &&
            c.id !== selectedTable.imageConfig?.imageColumnId
        );
        const meaningCol = remainingCols.find(c => /meaning|translation|vietnamese/i.test(c.name));
        if (meaningCol) {
            setTargetMeaningColId(meaningCol.id);
        }
    }, [selectedTable]);

    const handleCreateVideoColumn = async () => {
        if (!selectedTable) return;

        const existing = selectedTable.columns.find(c => c.name === CANONICAL_VIDEO);
        if (existing) {
            setTargetVideoColId(existing.id);
            showToast(`Using existing '${CANONICAL_VIDEO}' column`, "info");
            return;
        }

        setIsCreatingCol(true);
        try {
            const newColId = crypto.randomUUID();
            const newCol: Column = { id: newColId, name: CANONICAL_VIDEO };

            const updatedTable: Table = {
                ...selectedTable,
                columns: [...selectedTable.columns, newCol],
                videoColumnIds: Array.from(new Set([...(selectedTable.videoColumnIds || []), newColId])),
                videoConfig: {
                    videoColumnId: newColId,
                    sourceColumnId: targetTextColId || selectedTable.columns[0].id
                }
            };
            await updateTable(updatedTable);
            setTargetVideoColId(newColId);
            showToast(`'${CANONICAL_VIDEO}' video column created!`, "success");
        } catch (error) {
            showToast("Failed to create column", "error");
        } finally {
            setIsCreatingCol(false);
        }
    };

    const handleCreateTranscriptColumn = async () => {
        if (!selectedTable) return;

        const existing = selectedTable.columns.find(c => c.name === CANONICAL_TRANSCRIPT);
        if (existing) {
            setTargetTextColId(existing.id);
            showToast(`Using existing '${CANONICAL_TRANSCRIPT}' column`, "info");
            return;
        }

        setIsCreatingCol(true);
        try {
            const newColId = crypto.randomUUID();
            const newCol: Column = { id: newColId, name: CANONICAL_TRANSCRIPT };

            const updatedTable: Table = {
                ...selectedTable,
                columns: [...selectedTable.columns, newCol],
                // Auto-set as Audio (language detection fallback to English for dictation)
                columnAudioConfig: {
                    ...(selectedTable.columnAudioConfig || {}),
                    [newColId]: { language: 'en-US' }
                }
            };
            await updateTable(updatedTable);
            setTargetTextColId(newColId);
            showToast(`'${CANONICAL_TRANSCRIPT}' audio column created!`, "success");
        } catch (error) {
            showToast("Failed to create column", "error");
        } finally {
            setIsCreatingCol(false);
        }
    };

    const handleImport = async () => {
        if (!selectedTable || !targetTextColId) {
            showToast("Please select a table and a text column.", "error");
            return;
        }

        setIsSaving(true);
        try {
            const newRow = {
                id: crypto.randomUUID(),
                cols: {
                    [targetTextColId]: transcriptText,
                    ...(targetVideoColId ? { [targetVideoColId]: videoUrl } : {}),
                    ...(targetMeaningColId && translation ? { [targetMeaningColId]: translation } : {})
                },
                tagIds: [],
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
                updatedAt: Date.now(),
                modifiedAt: Date.now()
            };

            await upsertRow(selectedTable.id, newRow);

            // 1. Auto-format Types (Video & Audio)
            let finalTable = { ...selectedTable };
            let needsTableUpdate = false;

            // Ensure Video Config
            if (targetVideoColId && (!finalTable.videoConfig || finalTable.videoConfig.videoColumnId !== targetVideoColId)) {
                finalTable.videoConfig = { videoColumnId: targetVideoColId, sourceColumnId: targetTextColId };
                finalTable.videoColumnIds = Array.from(new Set([...(finalTable.videoColumnIds || []), targetVideoColId]));
                needsTableUpdate = true;
            }

            // Ensure Audio Config
            if (targetTextColId && !finalTable.columnAudioConfig?.[targetTextColId]) {
                finalTable.columnAudioConfig = {
                    ...(finalTable.columnAudioConfig || {}),
                    [targetTextColId]: { language: 'en-US' }
                };
                needsTableUpdate = true;
            }

            // 2. Ensure "Youtube Dictation" Relation exists with Typing mode
            const relationName = 'Youtube Dictation';
            const existingRelationIndex = finalTable.relations?.findIndex(r => r.name === relationName);

            const dictationRelation: any = {
                id: existingRelationIndex !== -1 ? finalTable.relations[existingRelationIndex].id : crypto.randomUUID(),
                name: relationName,
                questionColumnIds: [targetVideoColId].filter(Boolean), // Question is ONLY Video
                answerColumnIds: [targetTextColId],
                compatibleModes: [StudyMode.Flashcards, StudyMode.Typing],
                interactionModes: [StudyMode.Typing], // FORCE TYPING
                design: {
                    front: {
                        backgroundType: 'solid',
                        backgroundValue: 'var(--color-surface)',
                        layout: 'vertical',
                        elementOrder: [targetVideoColId].filter(Boolean), // Front face ONLY shows Video
                        typography: {}
                    },
                    back: {
                        backgroundType: 'solid',
                        backgroundValue: 'var(--color-surface)',
                        layout: 'vertical',
                        elementOrder: [targetTextColId, targetMeaningColId].filter(Boolean),
                        typography: {}
                    },
                    designLinked: true
                }
            };

            if (existingRelationIndex === -1) {
                finalTable.relations = [...(finalTable.relations || []), dictationRelation];
                needsTableUpdate = true;
            } else {
                // Update existing to ensure it's still Typing
                finalTable.relations = finalTable.relations.map(r => r.name === relationName ? dictationRelation : r);
                needsTableUpdate = true;
            }

            if (needsTableUpdate) {
                await updateTable(finalTable);
            }

            showToast("Imported successfully!", "success");
            onClose();
        } catch (e) {
            showToast("Failed to import.", "error");
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Import Segment to Table">
            <div className="max-w-md w-full">
                <div className="space-y-4">
                    {/* Table Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-text-subtle mb-1">Target Table</label>
                        <select
                            value={selectedTableId}
                            onChange={(e) => setSelectedTableId(e.target.value)}
                            className="w-full bg-surface-hover border border-border rounded-md px-3 py-2 text-sm"
                        >
                            {tables.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedTable && (
                        <>
                            <div className="p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg space-y-3">
                                {/* Transcript/Audio Mapping */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-text-subtle uppercase">Text Source</span>
                                            <span className="text-sm truncate w-40">{transcriptText}</span>
                                        </div>
                                        <Icon name="arrowRight" className="w-4 h-4 text-text-subtle" />
                                        <div className="w-40">
                                            <select
                                                value={targetTextColId}
                                                onChange={(e) => setTargetTextColId(e.target.value)}
                                                className="w-full bg-white dark:bg-black border border-border rounded px-2 py-1 text-xs"
                                            >
                                                <option value="">Select Column</option>
                                                <option disabled>---</option>
                                                {selectedTable.columns.map(c => {
                                                    const isAudio = !!selectedTable.columnAudioConfig?.[c.id];
                                                    return <option key={c.id} value={c.id}>{c.name} {isAudio ? '(Audio)' : ''}</option>;
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    {!targetTextColId && (
                                        <button
                                            onClick={handleCreateTranscriptColumn}
                                            disabled={isCreatingCol}
                                            className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            {isCreatingCol ? 'Creating...' : `Create '${CANONICAL_TRANSCRIPT}' column`}
                                        </button>
                                    )}
                                </div>

                                {/* Video Mapping */}
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-text-subtle uppercase">Video Source</span>
                                            <span className="text-xs truncate w-40 text-primary-500">YouTube Link (A-B)</span>
                                        </div>
                                        <Icon name="arrowRight" className="w-4 h-4 text-text-subtle" />
                                        <div className="w-40">
                                            <select
                                                value={targetVideoColId}
                                                onChange={(e) => setTargetVideoColId(e.target.value)}
                                                className="w-full bg-white dark:bg-black border border-border rounded px-2 py-1 text-xs"
                                            >
                                                <option value="">(None)</option>
                                                <option disabled>---</option>
                                                {selectedTable.columns.map(c => {
                                                    const isVidConfig = selectedTable.videoConfig?.videoColumnId === c.id;
                                                    return <option key={c.id} value={c.id}>{c.name} {isVidConfig ? '(Video Type)' : ''}</option>;
                                                })}
                                            </select>
                                        </div>
                                    </div>
                                    {!targetVideoColId && (
                                        <button
                                            onClick={handleCreateVideoColumn}
                                            disabled={isCreatingCol}
                                            className="text-[10px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                                        >
                                            <Icon name="plus" className="w-3 h-3" />
                                            {isCreatingCol ? 'Creating...' : `Create '${CANONICAL_VIDEO}' column`}
                                        </button>
                                    )}
                                    {targetVideoColId && (
                                        <div className="text-[9px] text-success-600 dark:text-success-400 flex items-center gap-1">
                                            <Icon name="check-circle" className="w-3 h-3" />
                                            Column ready
                                        </div>
                                    )}
                                </div>

                                {/* Meaning Mapping */}
                                {translation && (
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-text-subtle uppercase">Translation</span>
                                            <span className="text-sm truncate w-40">{translation}</span>
                                        </div>
                                        <Icon name="arrowRight" className="w-4 h-4 text-text-subtle" />
                                        <div className="w-40">
                                            <select
                                                value={targetMeaningColId}
                                                onChange={(e) => setTargetMeaningColId(e.target.value)}
                                                className="w-full bg-white dark:bg-black border border-border rounded px-2 py-1 text-xs"
                                            >
                                                <option value="">(None)</option>
                                                <option disabled>---</option>
                                                {selectedTable.columns.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                        <Button onClick={handleImport} disabled={isSaving || !targetTextColId}>
                            {isSaving ? 'Importing...' : 'Import to Table'}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ImportToTableModal;
