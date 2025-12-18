
import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
// FIX: Added FlashcardStatus import for the statusConfig object.
import { Screen, ConfidenceProgress, FlashcardStatus } from '../../types';
import Icon from '../../components/ui/Icon';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useTableStore } from '../../stores/useTableStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import ConfidenceSettingsModal from './components/ConfidenceSettingsModal';
import ConfidenceProgressStatsModal from './components/ConfidenceProgressStatsModal';
import ProgressRelationshipGraphModal from './components/ProgressRelationshipGraphModal';
import ConfidenceGuideModal from './components/ConfidenceGuideModal';
import NewArrivalsModal from './components/NewArrivalsModal';
import ConfidenceIcon from '../../components/ui/ConfidenceIcon';
import ConfidenceActivityChart from './components/ConfidenceActivityChart';
import { Card, CardContent } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';

// FIX: Copied statusConfig from ConfidenceSessionScreen to be used for the distribution bar.
const statusConfig: { [key in FlashcardStatus]: { label: string; color: string; hex: string; interval: number } } = {
  [FlashcardStatus.New]: { label: 'New', color: 'gray', hex: '#9ca3af', interval: 0 }, // gray-400
  [FlashcardStatus.Again]: { label: 'Again (Fail)', color: 'bg-error-500 hover:bg-error-600', hex: '#ef4444', interval: 3 }, // red-500
  [FlashcardStatus.Hard]: { label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', hex: '#f97316', interval: 5 }, // orange-500
  [FlashcardStatus.Good]: { label: 'Good', color: 'bg-warning-500 hover:bg-warning-600', hex: '#eab308', interval: 8 }, // yellow-500
  [FlashcardStatus.Easy]: { label: 'Easy', color: 'bg-success-500 hover:bg-success-600', hex: '#22c55e', interval: 13 }, // green-500
  [FlashcardStatus.Perfect]: { label: 'Perfect', color: 'bg-info-500 hover:bg-info-600', hex: '#06b6d4', interval: 21 }, // cyan-500
  [FlashcardStatus.Superb]: { label: 'Superb', color: 'bg-purple-500 hover:bg-purple-600', hex: '#a855f7', interval: 34 }, // purple-500
};

const ProgressCard: React.FC<{ 
    progress: ConfidenceProgress, 
    onSettingsClick: () => void,
    onStatsClick: () => void,
    onDeleteClick: () => void,
    onGraphClick: () => void,
    onResetClick: () => void,
    onRenameClick: () => void,
    onViewNewWords: () => void,
}> = ({ progress, onSettingsClick, onStatsClick, onDeleteClick, onGraphClick, onResetClick, onRenameClick, onViewNewWords }) => {
    const { handleStartConfidenceSession, handleViewConfidenceProgressContents, handleSelectTable } = useSessionStore();
    const { showToast } = useUIStore();
    const { tables } = useTableStore();
    const [isLoading, setIsLoading] = useState(false);

    // FIX: Changed 'learnedCards' to use filter for !== 'New' to be accurate even if 'New' keys exist
    const totalCards = progress.queue.length;
    const learnedCards = Object.values(progress.cardStates || {})
        .filter(status => status !== FlashcardStatus.New).length;
    
    // Resolve Table Names for Source Tags
    const sourceTables = useMemo(() => {
        return tables
            .filter(t => progress.tableIds.includes(t.id))
            .map(t => ({ id: t.id, name: t.name }));
    }, [progress.tableIds, tables]);

    // Generate Visual Gradient for Queue (Queue Map) to match Session Screen
    const queueGradient = React.useMemo(() => {
        const total = progress.queue.length;
        if (total === 0) return 'none';

        const states = progress.cardStates || {};
        const stops = progress.queue.map((rowId, index) => {
            const status = (states[rowId] as FlashcardStatus) || FlashcardStatus.New;
            const color = statusConfig[status].hex;
            const startPct = (index / total) * 100;
            const endPct = ((index + 1) / total) * 100;
            return `${color} ${startPct}% ${endPct}%`;
        });

        return `linear-gradient(to right, ${stops.join(', ')})`;
    }, [progress.queue, progress.cardStates]);


    const handleStart = async () => {
        if (totalCards === 0) {
            showToast("No cards in this set.", "error");
            return;
        }
        setIsLoading(true);
        try {
            await handleStartConfidenceSession(progress.id);
        } catch (error) {
            console.error("Failed to start session:", error);
            showToast("Could not start the session.", "error");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSourceClick = (e: React.MouseEvent, tableId: string) => {
        e.stopPropagation();
        handleSelectTable(tableId);
    };

    return (
        <div className="bg-surface dark:bg-secondary-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col relative group">
             {progress.newWordCount && progress.newWordCount > 0 ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewNewWords(); }}
                    className="absolute -top-2 -right-2 bg-error-500 hover:bg-error-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-pulse z-10 border border-surface hover:scale-110 transition-transform cursor-pointer"
                    title="Click to see new arrivals"
                >
                    +{progress.newWordCount} New
                </button>
            ) : null}
            
            <div className="p-4 flex-grow cursor-pointer" onClick={handleStart}>
                <div className="flex items-center gap-2 mb-2">
                     <ConfidenceIcon className="w-5 h-5 text-warning-500" />
                     <h3 className="font-bold text-text-main dark:text-secondary-100 truncate flex-1">{progress.name}</h3>
                </div>
                
                {/* Source Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {sourceTables.slice(0, 2).map(table => (
                        <button 
                            key={table.id}
                            onClick={(e) => handleSourceClick(e, table.id)}
                            className="flex items-center gap-1 px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700/50 border border-secondary-200 dark:border-secondary-600 rounded text-[10px] text-text-subtle font-medium hover:text-text-main hover:border-primary-300 transition-colors"
                            title="Go to source table"
                        >
                            <Icon name="table-cells" className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[80px]">{table.name}</span>
                        </button>
                    ))}
                    {sourceTables.length > 2 && (
                        <span className="text-[10px] text-text-subtle self-center">+{sourceTables.length - 2} more</span>
                    )}
                </div>
                
                <div className="mt-3">
                    <div className="flex justify-between items-center text-xs text-text-subtle mb-1">
                        <span>Progress</span>
                        <span>{learnedCards} / {totalCards}</span>
                    </div>
                    
                    {/* Queue Map Visualization */}
                    <div 
                        className="w-full h-2 rounded-full overflow-hidden bg-secondary-200 dark:bg-secondary-700"
                        style={{ background: queueGradient }}
                        title="Queue Distribution"
                    />
                </div>
            </div>
            
            <div className="bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 p-2 flex justify-end items-center gap-1 rounded-b-xl">
                <Button variant="ghost" size="sm" onClick={onGraphClick} title="View Relationship Graph" className="px-2"><Icon name="arrows-pointing-out" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => handleViewConfidenceProgressContents(progress.id)} title="View Cards Table" className="px-2"><Icon name="table-cells" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={onStatsClick} title="Statistics" className="px-2"><Icon name="chart-bar" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={onSettingsClick} title="Settings" className="px-2"><Icon name="cog" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={onRenameClick} title="Rename Set" className="px-2"><Icon name="pencil" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={onResetClick} title="Reset Progress" className="px-2 text-warning-600 hover:text-warning-700"><Icon name="repeat" className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={onDeleteClick} title="Delete" className="px-2 text-error-500 hover:text-error-600"><Icon name="trash" className="w-4 h-4" /></Button>
                <div className="w-px h-4 bg-secondary-300 dark:bg-secondary-600 mx-1"></div>
                <Button size="sm" onClick={handleStart} disabled={isLoading} className="flex items-center gap-1 ml-1 w-24 justify-center">
                    {isLoading ? (
                        <>
                            <Icon name="spinner" className="w-4 h-4 animate-spin" />
                            <span>Loading...</span>
                        </>
                    ) : (
                        <>
                            <Icon name="play" className="w-3 h-3" />
                            <span>Study</span>
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

const ConfidenceScreen: React.FC = () => {
    const { confidenceProgresses, deleteConfidenceProgress, resetConfidenceProgress, saveConfidenceProgress } = useSessionDataStore();
    const { setCurrentScreen, showToast } = useUIStore();
    
    const [settingsProgress, setSettingsProgress] = useState<ConfidenceProgress | null>(null);
    const [statsProgress, setStatsProgress] = useState<ConfidenceProgress | null>(null);
    const [graphProgress, setGraphProgress] = useState<ConfidenceProgress | null>(null);
    const [deleteProgress, setDeleteProgress] = useState<ConfidenceProgress | null>(null);
    const [resetProgress, setResetProgress] = useState<ConfidenceProgress | null>(null);
    const [newArrivalsProgress, setNewArrivalsProgress] = useState<ConfidenceProgress | null>(null);
    const [progressToRename, setProgressToRename] = useState<ConfidenceProgress | null>(null);
    const [renameInput, setRenameInput] = useState('');
    const [isGuideOpen, setIsGuideOpen] = useState(false);

    const handleDelete = () => {
        if (deleteProgress) {
            deleteConfidenceProgress(deleteProgress.id);
            setDeleteProgress(null);
        }
    };

    const handleReset = async () => {
        if (resetProgress) {
            await resetConfidenceProgress(resetProgress.id);
            showToast("Progress reset successfully.", "success");
            setResetProgress(null);
        }
    };

    const handleRenameClick = (progress: ConfidenceProgress) => {
        setProgressToRename(progress);
        setRenameInput(progress.name);
    };

    const handleSaveRename = async () => {
        if (progressToRename && renameInput.trim()) {
            await saveConfidenceProgress({ ...progressToRename, name: renameInput.trim() });
            showToast("Set renamed successfully.", "success");
            setProgressToRename(null);
            setRenameInput('');
        }
    };

    return (
        <div className="h-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 mx-auto animate-fadeIn pb-32">
            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                     <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                        <Icon name="arrowLeft" className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Confidence Sets</h1>
                        <p className="text-sm text-text-subtle">Master vocabulary with manual spaced repetition.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setIsGuideOpen(true)} title="Help Guide">
                        <Icon name="question-mark-circle" className="w-5 h-5" />
                    </Button>
                    <Button onClick={() => setCurrentScreen(Screen.ConfidenceSetup)}>
                        <Icon name="plus" className="w-4 h-4 mr-2" /> New Set
                    </Button>
                </div>
            </header>
            
            {/* New Activity Chart Widget */}
            <div className="mb-8">
                <Card>
                    <CardContent className="p-0">
                        <ConfidenceActivityChart />
                    </CardContent>
                </Card>
            </div>

            <main className="space-y-4">
                {confidenceProgresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {confidenceProgresses.map(progress => (
                            <ProgressCard 
                                key={progress.id} 
                                progress={progress} 
                                onSettingsClick={() => setSettingsProgress(progress)}
                                onStatsClick={() => setStatsProgress(progress)}
                                onDeleteClick={() => setDeleteProgress(progress)}
                                onGraphClick={() => setGraphProgress(progress)}
                                onResetClick={() => setResetProgress(progress)}
                                onRenameClick={() => handleRenameClick(progress)}
                                onViewNewWords={() => setNewArrivalsProgress(progress)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 rounded-lg border-2 border-dashed border-secondary-200 dark:border-secondary-700">
                        <ConfidenceIcon className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">No Sets Created</h2>
                        <p className="text-text-subtle mt-2 mb-6">Create a Confidence Set to start tracking your mastery of specific tables.</p>
                        <Button onClick={() => setCurrentScreen(Screen.ConfidenceSetup)}>Create Your First Set</Button>
                    </div>
                )}
            </main>
            
            {settingsProgress && (
                <ConfidenceSettingsModal 
                    progress={settingsProgress} 
                    onClose={() => setSettingsProgress(null)} 
                />
            )}

            {statsProgress && (
                <ConfidenceProgressStatsModal
                    progress={statsProgress}
                    onClose={() => setStatsProgress(null)}
                />
            )}
            
            {graphProgress && (
                <ProgressRelationshipGraphModal
                    progress={graphProgress}
                    onClose={() => setGraphProgress(null)}
                />
            )}
            
            {newArrivalsProgress && (
                <NewArrivalsModal
                    progress={newArrivalsProgress}
                    onClose={() => setNewArrivalsProgress(null)}
                />
            )}
            
            <ConfirmationModal
                isOpen={!!deleteProgress}
                onClose={() => setDeleteProgress(null)}
                onConfirm={handleDelete}
                title={`Delete "${deleteProgress?.name}"?`}
                message="Are you sure? This will remove your progress tracking for this set."
                confirmText="Delete"
            />

            <ConfirmationModal
                isOpen={!!resetProgress}
                onClose={() => setResetProgress(null)}
                onConfirm={handleReset}
                title={`Reset "${resetProgress?.name}"?`}
                message="This will reset your progress to 0% and clear all card statuses (colors) for this set. This action cannot be undone."
                confirmText="Reset Progress"
                confirmVariant="primary" // Less destructive look than delete
            />

            <Modal isOpen={!!progressToRename} onClose={() => setProgressToRename(null)} title="Rename Set">
                <form onSubmit={(e) => { e.preventDefault(); handleSaveRename(); }} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="rename-input" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Name</label>
                        <Input
                            id="rename-input"
                            type="text"
                            value={renameInput}
                            onChange={(e) => setRenameInput(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setProgressToRename(null)}>Cancel</Button>
                        <Button type="submit" disabled={!renameInput.trim() || renameInput.trim() === progressToRename?.name}>Save</Button>
                    </div>
                </form>
            </Modal>

            <ConfidenceGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </div>
    );
};

export default ConfidenceScreen;
