
import React, { useState, useEffect } from 'react';
import { ConfidenceProgress, FlashcardStatus } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useSessionDataStore } from '../../../stores/useSessionDataStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useTagStore } from '../../../stores/useTagStore';
import { useUserStore } from '../../../stores/useUserStore';
import { getTagStyle } from '../../../utils/colorUtils';
import Icon from '../../../components/ui/Icon';

interface ConfidenceSettingsModalProps {
    progress: ConfidenceProgress;
    onClose: () => void;
}

const statusConfig = {
  [FlashcardStatus.Again]: { label: 'Again (Fail)', color: 'bg-error-500' },
  [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500' },
  [FlashcardStatus.Good]: { label: 'Good', color: 'bg-warning-500' },
  [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-success-500' },
  [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-info-500' },
  [FlashcardStatus.Superb]: { label: 'Superb', color: 'bg-purple-500' },
};

const PRESETS = [
    {
        id: 'fibonacci',
        name: 'Fibonacci (Standard)',
        description: 'Golden ratio spacing. Balanced for natural memory retention.',
        icon: 'spiral',
        values: {
            [FlashcardStatus.Again]: 3,
            [FlashcardStatus.Hard]: 5,
            [FlashcardStatus.Good]: 8,
            [FlashcardStatus.Easy]: 13,
            [FlashcardStatus.Perfect]: 21,
            [FlashcardStatus.Superb]: 34,
        }
    },
    {
        id: 'drill',
        name: 'Deep Drill (Short)',
        description: 'Very short intervals. Best for difficult concepts or cramming.',
        icon: 'hammer',
        values: {
            [FlashcardStatus.Again]: 1,
            [FlashcardStatus.Hard]: 2,
            [FlashcardStatus.Good]: 3,
            [FlashcardStatus.Easy]: 5,
            [FlashcardStatus.Perfect]: 8,
            [FlashcardStatus.Superb]: 13,
        }
    },
    {
        id: 'leitner',
        name: 'Leitner (Long)',
        description: 'Aggressive spacing. Pushes known cards far back quickly.',
        icon: 'archive-box',
        values: {
            [FlashcardStatus.Again]: 5,
            [FlashcardStatus.Hard]: 10,
            [FlashcardStatus.Good]: 25,
            [FlashcardStatus.Easy]: 50,
            [FlashcardStatus.Perfect]: 100,
            [FlashcardStatus.Superb]: 200,
        }
    }
];

const ConfidenceSettingsModal: React.FC<ConfidenceSettingsModalProps> = ({ progress, onClose }) => {
    const { setConfidenceProgresses, saveConfidenceProgress } = useSessionDataStore();
    const { showToast } = useUIStore();
    const { tables } = useTableStore();
    const { settings } = useUserStore();
    const { tags: allTags } = useTagStore();
    
    const [intervals, setIntervals] = useState(progress.intervalConfig || PRESETS[0].values);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Determine initial preset based on value matching
    const findMatchingPreset = (currentValues: any) => {
        const match = PRESETS.find(p => 
            JSON.stringify(p.values) === JSON.stringify(currentValues)
        );
        return match ? match.id : 'custom';
    };

    const [activePresetId, setActivePresetId] = useState<string>(() => 
        findMatchingPreset(progress.intervalConfig || PRESETS[0].values)
    );

    const handleChange = (status: FlashcardStatus, value: string) => {
        if (activePresetId !== 'custom') return; // Safety check
        const numValue = Math.max(1, parseInt(value, 10) || 1);
        setIntervals(prev => ({ ...prev, [status]: numValue }));
    };

    const handlePresetSelect = (presetId: string) => {
        setActivePresetId(presetId);
        if (presetId !== 'custom') {
            const preset = PRESETS.find(p => p.id === presetId);
            if (preset) {
                setIntervals(preset.values);
            }
        }
    };

    const handleSave = () => {
        setConfidenceProgresses(prev => prev.map(p => 
            p.id === progress.id ? { ...p, intervalConfig: intervals as any } : p
        ));
        showToast("Algorithm settings updated.", "success");
        onClose();
    };

    const handleManualSync = async () => {
        setIsSyncing(true);
        try {
            // 1. Identify Source Rows
            const sourceTables = tables.filter(t => progress.tableIds.includes(t.id));
            const allSourceRows = sourceTables.flatMap(t => t.rows);

            // 2. Identify Filter Criteria
            // Filter out internal tags (usually starting with FC+)
            const filterTagNames = (progress.tags || []).filter(t => !t.startsWith('FC+'));
            const hasFilter = filterTagNames.length > 0;

            const validRowIds = new Set<string>();

            // 3. Evaluate Match
            allSourceRows.forEach(row => {
                let matches = true;
                if (hasFilter) {
                    // Map row's tag IDs to names to compare with filter strings
                    const rowTagNames = (row.tagIds || [])
                        .map(id => allTags.find(t => t.id === id)?.name)
                        .filter(Boolean) as string[];
                    
                    matches = rowTagNames.some(name => filterTagNames.includes(name));
                }
                
                if (matches) {
                    validRowIds.add(row.id);
                }
            });

            // 4. Reconcile with Queue
            const currentQueueSet = new Set(progress.queue);
            
            // Items to ADD (Valid but not in queue)
            const toAdd = Array.from(validRowIds).filter(id => !currentQueueSet.has(id));
            
            // Items to REMOVE (In queue but no longer valid)
            const toRemove = progress.queue.filter(id => !validRowIds.has(id));

            if (toAdd.length === 0 && toRemove.length === 0) {
                showToast("Queue is already up to date.", "info");
                return;
            }

            // 5. Apply Updates
            // Construct new queue: Keep existing valid items + Append new items
            const newQueue = [
                ...progress.queue.filter(id => !toRemove.includes(id)), 
                ...toAdd
            ];

            // Clean up card states for removed items
            const newCardStates = { ...progress.cardStates };
            toRemove.forEach(id => delete newCardStates[id]);

            // Adjust current index if needed
            let newIndex = progress.currentIndex;
            if (newIndex >= newQueue.length) {
                newIndex = Math.max(0, newQueue.length - 1);
            }

            const updatedProgress: ConfidenceProgress = {
                ...progress,
                queue: newQueue,
                cardStates: newCardStates,
                currentIndex: newIndex,
                newWordCount: (progress.newWordCount || 0) + toAdd.length
            };

            await saveConfidenceProgress(updatedProgress);
            
            const addedMsg = toAdd.length > 0 ? `+${toAdd.length} added` : '';
            const removedMsg = toRemove.length > 0 ? `-${toRemove.length} removed` : '';
            const msg = [addedMsg, removedMsg].filter(Boolean).join(', ');
            
            showToast(`Synced: ${msg}`, "success");

        } catch (error) {
            console.error("Manual sync failed", error);
            showToast("Failed to sync queue.", "error");
        } finally {
            setIsSyncing(false);
        }
    };

    const isCustom = activePresetId === 'custom';

    // Source Logic
    const sourceTableNames = tables.filter(t => progress.tableIds.includes(t.id)).map(t => t.name);
    // Filter out internal tags (usually starting with FC+)
    const activeTags = (progress.tags || []).filter(t => !t.startsWith('FC+'));

    return (
        <Modal isOpen={true} onClose={onClose} title={`Settings: ${progress.name}`} containerClassName="max-w-2xl w-full max-h-[90vh]">
            <div className="p-6 flex flex-col h-full overflow-hidden">
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-8">

                    {/* Auto-Sync Info */}
                    <div className="bg-info-50 dark:bg-info-900/10 border border-info-200 dark:border-info-800/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-info-100 dark:bg-info-900/30 rounded-full text-info-600 dark:text-info-400">
                                <Icon name="wifi" className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-sm text-text-main dark:text-secondary-100 mb-1">Dynamic Queue Active</h4>
                                        <p className="text-xs text-text-subtle mb-3">
                                            This set automatically pulls new cards from the tables below whenever they match the tag filters.
                                        </p>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="secondary" 
                                        onClick={handleManualSync} 
                                        disabled={isSyncing}
                                        className="h-8 px-3 text-xs"
                                    >
                                        {isSyncing ? <Icon name="spinner" className="w-3 h-3 animate-spin mr-1"/> : <Icon name="arrow-down-tray" className="w-3 h-3 mr-1"/>}
                                        Check Now
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Sources:</span>
                                        {sourceTableNames.map(name => (
                                            <span key={name} className="px-2 py-1 bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-md text-xs font-medium truncate max-w-[150px]">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                    {activeTags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-xs font-semibold text-text-subtle uppercase tracking-wider">Required Tags:</span>
                                            {activeTags.map(tag => (
                                                <span 
                                                    key={tag} 
                                                    style={getTagStyle(tag, settings.tagColors || {})}
                                                    className="px-2 py-1 rounded-full text-xs font-bold shadow-sm"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                     {activeTags.length === 0 && (
                                        <p className="text-xs text-text-subtle italic mt-1">
                                            (No tag filters applied — all cards from source tables are included)
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Presets Selection */}
                    <div>
                        <label className="block text-xs font-bold text-text-subtle uppercase mb-3">Strategy Preset</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => handlePresetSelect(preset.id)}
                                    className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                        activePresetId === preset.id 
                                            ? 'bg-primary-50 border-primary-500 shadow-sm dark:bg-primary-900/20' 
                                            : 'bg-surface dark:bg-secondary-800 border-transparent hover:border-secondary-300 dark:hover:border-secondary-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        {activePresetId === preset.id && (
                                            <Icon name="check-circle" className="w-4 h-4 text-primary-600 dark:text-primary-400" variant="filled" />
                                        )}
                                        <span className={`font-bold text-sm ${activePresetId === preset.id ? 'text-primary-700 dark:text-primary-300' : 'text-text-main dark:text-secondary-200'}`}>
                                            {preset.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-subtle">{preset.description}</p>
                                </button>
                            ))}
                            
                            {/* Explicit Custom Option */}
                            <button
                                onClick={() => handlePresetSelect('custom')}
                                className={`relative p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                    isCustom
                                        ? 'bg-primary-50 border-primary-500 shadow-sm dark:bg-primary-900/20' 
                                        : 'bg-surface dark:bg-secondary-800 border-transparent hover:border-secondary-300 dark:hover:border-secondary-600'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                     {isCustom ? (
                                        <Icon name="check-circle" className="w-4 h-4 text-primary-600 dark:text-primary-400" variant="filled" />
                                     ) : (
                                        <Icon name="cog" className="w-4 h-4 text-text-subtle" />
                                     )}
                                    <span className={`font-bold text-sm ${isCustom ? 'text-primary-700 dark:text-primary-300' : 'text-text-main dark:text-secondary-200'}`}>
                                        Custom Intervals
                                    </span>
                                </div>
                                <p className="text-xs text-text-subtle">Manually configure every jump step.</p>
                            </button>
                        </div>
                    </div>

                    {/* Inputs Section */}
                    <div className={`space-y-1 transition-opacity duration-300 ${!isCustom ? 'opacity-80 grayscale-[0.3]' : ''}`}>
                        <div className="flex items-center justify-between mb-2 px-1">
                            <label className="text-xs font-bold text-text-subtle uppercase">Interval Configuration</label>
                            {!isCustom && (
                                <div className="flex items-center gap-1 text-xs text-warning-600 dark:text-warning-400 bg-warning-50 dark:bg-warning-900/20 px-2 py-1 rounded-full">
                                    <Icon name="lock-closed" className="w-3 h-3" />
                                    <span>Locked by Preset</span>
                                </div>
                            )}
                        </div>

                        <div className="bg-secondary-50 dark:bg-secondary-800/30 rounded-xl border border-secondary-200 dark:border-secondary-700 divide-y divide-secondary-200 dark:divide-secondary-700 overflow-hidden">
                            {(Object.keys(statusConfig) as FlashcardStatus[]).map(status => (
                                <div key={status} className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-secondary-800 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${statusConfig[status].color} shadow-sm`}></div>
                                        <label htmlFor={`input-${status}`} className={`text-sm font-medium transition-colors ${isCustom ? 'text-text-main dark:text-secondary-200' : 'text-text-subtle'}`}>
                                            {statusConfig[status].label}
                                        </label>
                                    </div>
                                    <div className="flex items-center gap-2 relative">
                                        <span className="text-xs text-text-subtle font-medium">+</span>
                                        <Input
                                            id={`input-${status}`}
                                            type="number"
                                            value={intervals[status]}
                                            onChange={(e) => handleChange(status, e.target.value)}
                                            disabled={!isCustom}
                                            className={`w-20 h-9 text-right font-mono text-sm transition-colors ${
                                                !isCustom 
                                                    ? 'bg-secondary-100 text-text-subtle border-transparent cursor-not-allowed dark:bg-secondary-700' 
                                                    : 'bg-white dark:bg-secondary-900 border-secondary-300 focus:border-primary-500'
                                            }`}
                                            min={1}
                                        />
                                        <span className="text-xs text-text-subtle w-8">spots</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ConfidenceSettingsModal;
