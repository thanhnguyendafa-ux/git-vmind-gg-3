import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { VocabRow, Column, AIPrompt, Table, FlashcardStatus } from '../../types';
import Icon from '../../components/ui/Icon';
import { generateForPrompt, generateImageFromText } from '../../services/geminiService';
import { useAudioStore, SpeechRequest } from '../../stores/useAudioStore';
import { useUIStore } from '../../stores/useUIStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getPriorityScore, getRankPoint, getLevel } from '../../utils/priorityScore';
import ContextViewer from '../study/components/ContextViewer';
import { useContextLinks } from '../../hooks/useContextLinks';


interface WordDetailModalProps {
    row: VocabRow | null;
    table: Table;
    columns: Column[];
    aiPrompts?: AIPrompt[];
    imageConfig?: Table['imageConfig'];
    audioConfig?: Table['audioConfig'];
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedRow: VocabRow) => Promise<boolean>;
    onDelete: (rowId: string) => void;
    onConfigureAI: (column: Column) => void;
    onAddColumn?: (columnName: string) => Promise<boolean>;
    quickAddMode?: boolean;
}

const WordDetailModal: React.FC<WordDetailModalProps> = ({ row, table, columns, aiPrompts, imageConfig, audioConfig, isOpen, onClose, onSave, onDelete, onConfigureAI, onAddColumn, quickAddMode = false }) => {
    const { audioState, playQueue, stopQueue } = useAudioStore();
    const { showToast, setIsApiKeyModalOpen } = useUIStore();
    const [editableRow, setEditableRow] = useState<VocabRow | null>(null);
    const [generatingFields, setGeneratingFields] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [newColumnName, setNewColumnName] = useState('');
    const [isSavingNewColumn, setIsSavingNewColumn] = useState(false);
    const [activeTab, setActiveTab] = useState<'content' | 'stats'>('content');
    const firstInputRef = useRef<HTMLTextAreaElement>(null);

    const contextLinks = useContextLinks(editableRow?.id);


    const promptsByTarget = useMemo(() => {
        const map = new Map<string, AIPrompt>();
        (aiPrompts || []).forEach(p => {
            map.set(p.targetColumnId, p);
        });
        return map;
    }, [aiPrompts]);

    useEffect(() => {
        if (row) {
            setEditableRow(JSON.parse(JSON.stringify(row))); // Deep copy
            setGeneratingFields(new Set());
            setIsAddingColumn(false);
            setNewColumnName('');
            setActiveTab('content');
            if (quickAddMode) {
                setTimeout(() => firstInputRef.current?.focus(), 100);
            }
        }
    }, [row, quickAddMode]);

    const stats = useMemo(() => {
        if (!editableRow) return null;
        const { correct, incorrect } = editableRow.stats;
        const encounters = correct + incorrect;
        const successRate = encounters > 0 ? (correct / encounters) * 100 : 0;
        const lastStudied = editableRow.stats.lastStudied ? new Date(editableRow.stats.lastStudied).toLocaleString() : 'Never';
        return { encounters, successRate, lastStudied };
    }, [editableRow]);

    const advancedStats = useMemo(() => {
        if (!editableRow || !table) return null;
        const maxInQueue = Math.max(1, ...table.rows.map(r => r.stats.inQueueCount || 0));
        const priorityScore = getPriorityScore(editableRow, maxInQueue).toFixed(2);
        const rankPoint = getRankPoint(editableRow);
        const level = getLevel(editableRow);
        const lastPracticeDate = editableRow.stats.lastPracticeDate ? new Date(editableRow.stats.lastPracticeDate).toLocaleString() : 'Never';
        return { priorityScore, rankPoint, level, lastPracticeDate };
    }, [editableRow, table]);


    const handleDataChange = (columnId: string, value: string) => {
        if (!editableRow) return;
        setEditableRow({
            ...editableRow,
            cols: {
                ...editableRow.cols,
                [columnId]: value,
            },
        });
    };

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (editableRow) {
            setIsSaving(true);
            const success = await onSave(editableRow);
            setIsSaving(false);

            if (success && quickAddMode) {
                showToast("Card added!", "success");
                // Reset for next entry
                setEditableRow({
                    id: crypto.randomUUID(),
                    cols: {},
                    stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
                });
                firstInputRef.current?.focus();
            }
        }
    };

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    const handleDelete = () => {
        if (editableRow) {
            onDelete(editableRow.id);
            onClose();
        }
    }

    const handleGenerateForField = async (columnId: string) => {
        if (!editableRow || !columns) return;

        const promptConfig = promptsByTarget.get(columnId);
        if (!promptConfig) return;

        setGeneratingFields(prev => new Set(prev).add(columnId));
        try {
            const sourceValues = promptConfig.sourceColumnIds.reduce((acc, sourceColId) => {
                const colName = columns.find(c => c.id === sourceColId)?.name;
                if (colName) acc[colName] = editableRow.cols[sourceColId] || '';
                return acc;
            }, {} as Record<string, string>);

            const result = await generateForPrompt(promptConfig.prompt, sourceValues);
            handleDataChange(columnId, result);
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") {
                setIsApiKeyModalOpen(true);
            } else {
                showToast("An unexpected AI error occurred.", "error");
                console.error("Error generating for field:", error);
            }
        } finally {
            setGeneratingFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(columnId);
                return newSet;
            });
        }
    };

    const handleGenerateImage = async () => {
        if (!editableRow || !imageConfig?.imageColumnId || !imageConfig?.sourceColumnId) return;
        const promptText = editableRow.cols[imageConfig.sourceColumnId];
        if (!promptText) {
            showToast("Image prompt source column is empty.", "error");
            return;
        }

        setGeneratingFields(prev => new Set(prev).add(imageConfig.imageColumnId!));
        try {
            const result = await generateImageFromText(promptText);
            handleDataChange(imageConfig.imageColumnId!, result);
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") { setIsApiKeyModalOpen(true); }
            else { showToast("Image generation failed.", "error"); }
        } finally {
            setGeneratingFields(prev => {
                const newSet = new Set(prev);
                newSet.delete(imageConfig.imageColumnId!);
                return newSet;
            });
        }
    };

    const handleSaveNewColumn = async () => {
        if (!newColumnName.trim() || !onAddColumn) return;
        setIsSavingNewColumn(true);
        const success = await onAddColumn(newColumnName);
        setIsSavingNewColumn(false);
        if (success) {
            setIsAddingColumn(false);
            setNewColumnName('');
        }
    };

    if (!isOpen || !editableRow || !stats) return null;

    const imageColumnId = imageConfig?.imageColumnId;

    return createPortal(
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 animate-fadeIn">
            <form onSubmit={handleSave} className="bg-slate-100 dark:bg-slate-900 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp">
                <header className="flex flex-col border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-800">
                    <div className="flex justify-between items-center p-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{quickAddMode ? 'Quick Add Cards' : 'Edit Row'}</h2>
                        <div className="flex items-center gap-2">
                            {!quickAddMode && (
                                <button type="button" onClick={handleDelete} className="text-red-500 hover:bg-red-500/10 p-2 rounded-md font-semibold flex items-center gap-2 transition-colors">
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            )}
                            <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
                                <Icon name="x" className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    {!quickAddMode && (
                        <div className="flex px-4 gap-6">
                            <button
                                type="button"
                                onClick={() => setActiveTab('content')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'content' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Content
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('stats')}
                                className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'stats' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Statistics
                            </button>
                        </div>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/50">
                    {activeTab === 'content' && (
                        <div className="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">
                            {/* Fields */}
                            <div className="space-y-5">
                                {columns.map((col, index) => {
                                    const promptForCell = promptsByTarget.get(col.id);
                                    const isGenerating = generatingFields.has(col.id);
                                    const hasContent = !!editableRow.cols[col.id];
                                    const isImageColumn = col.id === imageColumnId;
                                    const hasImageSourceContent = imageConfig?.sourceColumnId ? !!editableRow.cols[imageConfig.sourceColumnId] : false;

                                    const isDisabled = isGenerating;
                                    let title;
                                    if (isGenerating) {
                                        title = "Generating...";
                                    } else if (promptForCell) {
                                        title = hasContent ? `Regenerate with '${promptForCell.name}'` : `Generate with '${promptForCell.name}'`;
                                    } else {
                                        title = 'Configure AI Prompt';
                                    }

                                    const handleAiClick = () => {
                                        if (promptForCell) {
                                            handleGenerateForField(col.id);
                                        } else {
                                            onConfigureAI(col);
                                        }
                                    };

                                    return (
                                        <div key={col.id} className="group">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{col.name}</label>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {audioConfig?.sourceColumnId === col.id && editableRow.cols[col.id] && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const text = editableRow.cols[col.id]!;
                                                                const lang = table.columnAudioConfig?.[col.id]?.language || table.audioConfig?.language || 'en-US';
                                                                playQueue([{ text, lang }], editableRow.id);
                                                            }}
                                                            className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            disabled={audioState.playingId === editableRow.id && audioState.status === 'loading'}
                                                            title="Play audio"
                                                        >
                                                            {audioState.playingId === editableRow.id ? (
                                                                <Icon name="x" className="w-4 h-4 text-red-500" />
                                                            ) : (
                                                                <Icon name="play" className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                    {isImageColumn && (
                                                        <button
                                                            type="button"
                                                            onClick={handleGenerateImage}
                                                            disabled={isDisabled || !hasImageSourceContent}
                                                            title={!hasImageSourceContent ? "Source column for image prompt is empty" : "Generate Image"}
                                                            className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isGenerating ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name="photo" className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={handleAiClick}
                                                        disabled={isDisabled}
                                                        title={title}
                                                        className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                                    >
                                                        {isGenerating ? <Icon name="spinner" className="w-4 h-4 animate-spin" /> : <Icon name={promptForCell ? 'star' : 'star-outline'} className="w-4 h-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onConfigureAI(col)}
                                                        title={`Configure AI prompt for "${col.name}"`}
                                                        className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                                                    >
                                                        <Icon name="chat" className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                ref={index === 0 ? firstInputRef : null}
                                                onKeyDown={handleTextareaKeyDown}
                                                value={editableRow.cols[col.id] || ''}
                                                onChange={(e) => handleDataChange(col.id, e.target.value)}
                                                rows={col.id === imageColumnId ? 1 : 2}
                                                disabled={isGenerating}
                                                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 disabled:opacity-70 transition-shadow shadow-sm"
                                                placeholder={`Enter ${col.name.toLowerCase()}...`}
                                            />
                                            {col.id === imageColumnId && editableRow.cols[col.id] && (
                                                <div className="mt-3">
                                                    <img
                                                        src={editableRow.cols[col.id]} alt="Preview"
                                                        className="max-h-48 rounded-lg object-contain border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                        onLoad={(e) => { e.currentTarget.style.display = 'block'; }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            {onAddColumn && (
                                <>
                                    {!isAddingColumn ? (
                                        <button type="button" onClick={() => setIsAddingColumn(true)} className="w-full mt-4 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors p-3 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                                            <Icon name="plus" className="w-4 h-4" /> Add Custom Field
                                        </button>
                                    ) : (
                                        <div className="mt-6 p-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-sm space-y-3 animate-fadeIn">
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Field Name</label>
                                            <Input
                                                type="text"
                                                value={newColumnName}
                                                onChange={e => setNewColumnName(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleSaveNewColumn()}
                                                placeholder="e.g., Synonyms, Part of Speech..."
                                                className="bg-slate-50 dark:bg-slate-900"
                                            />
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
                                                <Button type="button" size="sm" onClick={handleSaveNewColumn} disabled={!newColumnName.trim() || isSavingNewColumn}>
                                                    {isSavingNewColumn ? <Icon name="spinner" className="animate-spin w-4 h-4" /> : 'Add Field'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Performance Overview</h3>
                                    {/* Context Viewer for Stats Context if needed, usually links don't change here but showing connections is fine */}
                                    <ContextViewer links={contextLinks} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Study Metrics</h4>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                <span className="text-slate-600 dark:text-slate-300">Success Rate</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{stats.successRate.toFixed(0)}%</span>
                                            </div>
                                            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                <span className="text-slate-600 dark:text-slate-300">Encounters</span>
                                                <span className="font-bold text-slate-800 dark:text-white">{stats.encounters}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800">
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">Correct</div>
                                                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{editableRow.stats.correct}</div>
                                                </div>
                                                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                                                    <div className="text-xs text-red-600 dark:text-red-400 mb-1">Incorrect</div>
                                                    <div className="text-lg font-bold text-red-700 dark:text-red-300">{editableRow.stats.incorrect}</div>
                                                </div>
                                            </div>
                                            <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                                <span className="text-slate-600 dark:text-slate-300">Last Studied</span>
                                                <span className="font-medium text-slate-800 dark:text-white text-xs">{stats.lastStudied}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Anki SRS Configuration</h4>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <span className="text-slate-600 dark:text-slate-300">Next Review</span>
                                                <span className="font-bold text-blue-700 dark:text-blue-300">{editableRow.stats.ankiDueDate ? new Date(editableRow.stats.ankiDueDate).toISOString().split('T')[0] : 'Ready'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-2">
                                                <span className="text-slate-500">Repetitions</span>
                                                <span className="font-medium">{editableRow.stats.ankiRepetitions ?? 0}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-2">
                                                <span className="text-slate-500">Ease Factor</span>
                                                <span className="font-medium">{editableRow.stats.ankiEaseFactor ? `${Math.round(editableRow.stats.ankiEaseFactor * 100)}% ` : '—'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 py-2">
                                                <span className="text-slate-500">Interval</span>
                                                <span className="font-medium">{editableRow.stats.ankiInterval ? `${editableRow.stats.ankiInterval} d` : '—'}</span>
                                            </div>
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 mt-6">Advanced</h4>
                                        <div className="space-y-2 text-xs text-slate-500">
                                            <div className="flex justify-between"><span>Priority Score:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{advancedStats?.priorityScore}</span></div>
                                            <div className="flex justify-between"><span>Level:</span> <span className="text-slate-700 dark:text-slate-300">{advancedStats?.level}/6</span></div>
                                            <div className="flex justify-between"><span>Queue Count:</span> <span className="text-slate-700 dark:text-slate-300">{editableRow.stats.inQueueCount ?? 0}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <footer className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 flex-shrink-0 z-10 pb-20 sm:pb-4">
                    <Button variant="secondary" onClick={onClose} className="min-w-[100px]"> Cancel </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                        {isSaving && <Icon name="spinner" className="w-4 h-4 animate-spin mr-2" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </footer>
            </form>
        </div>,
        document.body
    );
};

export default WordDetailModal;
