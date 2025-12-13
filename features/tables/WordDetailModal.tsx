
import React, { useState, useMemo, useEffect, useRef } from 'react';
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

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fadeIn">
      <form onSubmit={handleSave} className="bg-slate-100 dark:bg-slate-900 w-full max-w-xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp">
        <header className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{quickAddMode ? 'Quick Add Cards' : 'Edit Row'}</h2>
          <div className="flex items-center gap-2">
            {!quickAddMode && (
              <button type="button" onClick={handleDelete} className="text-red-500 hover:bg-red-500/10 p-2 rounded-md font-semibold flex items-center gap-2">
                <Icon name="trash" className="w-5 h-5"/>
              </button>
            )}
            <button type="button" onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 p-2 rounded-full">
              <Icon name="x" className="w-6 h-6"/>
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content: Fields */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Fields</h3>
              <div className="space-y-4">
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
                        <div key={col.id}>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">{col.name}</label>
                                <div className="flex items-center gap-1">
                                    {audioConfig?.sourceColumnId === col.id && editableRow.cols[col.id] && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const text = editableRow.cols[col.id]!;
                                                const lang = table.columnAudioConfig?.[col.id]?.language || table.audioConfig?.language || 'en-US';
                                                playQueue([{ text, lang }], editableRow.id);
                                            }}
                                            className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                                            disabled={audioState.playingId === editableRow.id && audioState.status === 'loading'}
                                            title="Play audio"
                                        >
                                            {audioState.playingId === editableRow.id ? (
                                                <Icon name="x" className="w-5 h-5 text-red-500" />
                                            ) : (
                                                <Icon name="play" className="w-5 h-5"/>
                                            )}
                                        </button>
                                    )}
                                     {isImageColumn && (
                                        <button
                                            type="button"
                                            onClick={handleGenerateImage}
                                            disabled={isDisabled || !hasImageSourceContent}
                                            title={!hasImageSourceContent ? "Source column for image prompt is empty" : "Generate Image"}
                                            className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGenerating ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : <Icon name="photo" className="w-5 h-5"/>}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleAiClick}
                                        disabled={isDisabled}
                                        title={title}
                                        className="text-slate-400 dark:text-slate-500 hover:text-primary-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                                    >
                                        {isGenerating ? <Icon name="spinner" className="w-5 h-5 animate-spin"/> : <Icon name={promptForCell ? 'star' : 'star-outline'} className="w-5 h-5"/>}
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => onConfigureAI(col)} 
                                        title={`Configure AI prompt for "${col.name}"`}
                                        className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-colors p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
                                    >
                                        <Icon name="chat" className="w-5 h-5" />
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
                            className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-70"
                            />
                            {col.id === imageColumnId && editableRow.cols[col.id] && (
                                <div className="mt-2">
                                    <img 
                                        src={editableRow.cols[col.id]} alt="Preview" 
                                        className="max-h-32 rounded-md object-contain border border-slate-200 dark:border-slate-700"
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
                        <button type="button" onClick={() => setIsAddingColumn(true)} className="w-full mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary-500 transition-colors p-2 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-500">
                            <Icon name="plus" className="w-4 h-4"/> Add new field
                        </button>
                        ) : (
                        <div className="mt-4 p-3 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 space-y-2 animate-fadeIn">
                            <label className="text-sm font-medium">New Column Name</label>
                            <Input
                                type="text"
                                value={newColumnName}
                                onChange={e => setNewColumnName(e.target.value)}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSaveNewColumn()}
                                placeholder="e.g., Pronunciation"
                            />
                            <div className="flex justify-end gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setIsAddingColumn(false)}>Cancel</Button>
                                <Button type="button" size="sm" onClick={handleSaveNewColumn} disabled={!newColumnName.trim() || isSavingNewColumn}>
                                    {isSavingNewColumn ? <Icon name="spinner" className="animate-spin w-4 h-4"/> : 'Save'}
                                </Button>
                            </div>
                        </div>
                        )}
                    </>
                )}
            </div>
          </div>
          {/* Sidebar: Stats */}
          {!quickAddMode && (
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 self-start">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">Statistics</h3>
                    <ContextViewer links={contextLinks} />
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Correct</span>
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{editableRow.stats.correct}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Incorrect</span>
                        <span className="font-medium text-red-600 dark:text-red-400">{editableRow.stats.incorrect}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Encounters</span>
                        <span className="font-medium">{stats.encounters}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Success %</span>
                        <span className="font-medium">{stats.successRate.toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Last Studied</span>
                        <span className="font-medium text-right text-xs">{stats.lastStudied}</span>
                    </div>

                    {/* Study Session Details */}
                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-text-subtle mb-1">Advanced Study Stats</h4>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Priority Score:</span>
                        <span className="font-medium">{advancedStats?.priorityScore}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Rank Point:</span>
                        <span className="font-medium">{advancedStats?.rankPoint}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Mastery Level:</span>
                        <span className="font-medium">{advancedStats?.level} / 6</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Last Practice:</span>
                        <span className="font-medium text-right text-xs">{advancedStats?.lastPracticeDate}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Scramble Encounters:</span>
                        <span className="font-medium">{editableRow.stats.scrambleEncounters ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Theater Encounters:</span>
                        <span className="font-medium">{editableRow.stats.theaterEncounters ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Times in Queue:</span>
                        <span className="font-medium">{editableRow.stats.inQueueCount ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Quit Mid-session:</span>
                        <span className="font-medium">{editableRow.stats.wasQuit ? 'Yes' : 'No'}</span>
                    </div>

                    {/* Anki Stats */}
                    <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                         <h4 className="text-xs font-bold text-text-subtle mb-1">Anki SRS</h4>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Repetitions:</span>
                        <span className="font-semibold">{editableRow.stats.ankiRepetitions ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Ease Factor:</span>
                        <span className="font-semibold">{editableRow.stats.ankiEaseFactor ? `${Math.round(editableRow.stats.ankiEaseFactor * 100)}%` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Interval:</span>
                        <span className="font-semibold">{editableRow.stats.ankiInterval ? `${editableRow.stats.ankiInterval}d` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Next Due:</span>
                        <span className="font-semibold">{editableRow.stats.ankiDueDate ? new Date(editableRow.stats.ankiDueDate).toISOString().split('T')[0] : '—'}</span>
                    </div>
                </div>
              </div>
          )}
        </div>
        <footer className="p-4 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="bg-surface dark:bg-secondary-700 text-text-main dark:text-secondary-200 font-semibold px-4 py-2 rounded-md border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-600 transition-colors text-sm">{quickAddMode ? 'Done' : 'Cancel'}</button>
          <button type="submit" disabled={isSaving} className="bg-primary-500 text-white font-semibold px-6 py-2 rounded-md hover:bg-primary-600 transition-colors text-sm disabled:opacity-50 flex items-center gap-2">
            {isSaving && <Icon name="spinner" className="w-4 h-4 animate-spin"/>}
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </footer>
      </form>
    </div>
  );
};

export default WordDetailModal;
