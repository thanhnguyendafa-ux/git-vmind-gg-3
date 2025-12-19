
import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, AnkiProgress } from '../../types';
import Icon from '../../components/ui/Icon';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useTableStore } from '../../stores/useTableStore';
import { useCounterStore } from '../../stores/useCounterStore';
import { Button } from '../../components/ui/Button';
import AnkiSettingsModal from './AnkiSettingsModal';
import ConfirmationModal from '../../components/ui/ConfirmationModal';

const DeckCard: React.FC<{
    progress: AnkiProgress,
    onSettingsClick: () => void,
    onDeleteClick: () => void,
    isLoadingMetadata?: boolean,
    isSharedWithOtherSets?: boolean,
}> = ({ progress, onSettingsClick, onDeleteClick, isLoadingMetadata = false, isSharedWithOtherSets = false }) => {
    const { handleStartAnkiSession, setAnkiStatsProgressId, handleViewAnkiDeckContents } = useSessionStore();
    const { setCurrentScreen } = useUIStore();

    // Optimization: Select ONLY the tables relevant to this deck.
    // This prevents the card from re-rendering if a table NOT in this deck is updated.
    const tables = useTableStore(useShallow(state =>
        state.tables.filter(t => progress.tableIds.includes(t.id))
    ));

    const { addCounter, toggleTracking } = useCounterStore();
    const counter = useCounterStore(useShallow(state => state.counters.find(c => c.targetId === progress.id)));
    const isTracking = counter?.isActive ?? false;

    const handleTrackingToggle = () => {
        if (!counter) {
            addCounter(progress.id, 'anki', progress.name);
        } else {
            toggleTracking(progress.id);
        }
    };

    const { dueCount, newCount } = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        let due = 0;
        let newCards = 0;

        const rows = tables.flatMap(t => t.rows);

        rows.forEach(row => {
            const { ankiDueDate } = row.stats;
            if (ankiDueDate === undefined || ankiDueDate === null) {
                newCards++;
            } else if (ankiDueDate <= todayTimestamp) {
                due++;
            }
        });
        return { dueCount: due, newCount: newCards };
    }, [tables]);

    const config = progress.ankiConfig;
    const newLimit = config?.newCardsPerDay ?? 20;
    const reviewLimit = config?.maxReviewsPerDay ?? 200;

    const cardsToStudy = Math.min(newLimit, newCount) + Math.min(reviewLimit, dueCount);

    const handleStatsClick = () => {
        setAnkiStatsProgressId(progress.id);
        setCurrentScreen(Screen.AnkiStats);
    };

    return (
        <div className="bg-surface dark:bg-secondary-800 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-text-main dark:text-secondary-100">{progress.name}</h3>
                    {isSharedWithOtherSets && (
                        <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-medium rounded-md"
                            title="This set shares card statistics with other sets using the same table"
                        >
                            <Icon name="link" className="w-3 h-3" />
                            Shared Progress
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4 text-sm mt-1">
                    {isLoadingMetadata ? (
                        <span className="text-text-subtle animate-pulse">Loading metadata...</span>
                    ) : (
                        <>
                            <span className="font-semibold text-blue-500">{newCount} New</span>
                            <span className="font-semibold text-green-500">{dueCount} Due</span>
                        </>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
                <Button variant="secondary" size="sm" onClick={handleTrackingToggle} title={isTracking ? "Tracking Active" : "Track Activity"}>
                    <Icon name="chart-bar" className={`w-4 h-4 ${isTracking ? 'text-primary-500' : 'text-text-subtle'}`} variant={isTracking ? 'filled' : 'outline'} />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => handleViewAnkiDeckContents(progress.id)} title="View Deck Cards"><Icon name="table-cells" className="w-4 h-4" /></Button>
                <Button variant="secondary" size="sm" onClick={handleStatsClick} title="View Statistics"><Icon name="chart-bar" className="w-4 h-4" /></Button>
                <Button variant="secondary" size="sm" onClick={onSettingsClick}><Icon name="cog" className="w-4 h-4" /></Button>
                <Button variant="secondary" size="sm" onClick={onDeleteClick} className="text-error-500 hover:bg-error-500/10"><Icon name="trash" className="w-4 h-4" /></Button>
                <Button
                    onClick={() => handleStartAnkiSession(progress.id)}
                    disabled={cardsToStudy === 0}
                    title={isSharedWithOtherSets ? "Progress is saved to the table and synced across all sets using this table" : "Start studying"}
                >
                    Study Now
                </Button>
            </div>
        </div>
    );
};


const AnkiSetupScreen: React.FC = () => {
    const { ankiProgresses, saveAnkiProgress, deleteAnkiProgress } = useSessionDataStore(useShallow(state => ({
        ankiProgresses: state.ankiProgresses,
        saveAnkiProgress: state.saveAnkiProgress,
        deleteAnkiProgress: state.deleteAnkiProgress,
    })));
    const { setCurrentScreen } = useUIStore();
    const { tables, fetchTablePayload, loadingTableIds } = useTableStore(useShallow(state => ({
        tables: state.tables,
        fetchTablePayload: state.fetchTablePayload,
        loadingTableIds: state.loadingTableIds
    })));
    const [settingsForProgress, setSettingsForProgress] = useState<AnkiProgress | null>(null);
    const [progressToDelete, setProgressToDelete] = useState<AnkiProgress | null>(null);
    const [showInfoBanner, setShowInfoBanner] = useState(() => {
        const dismissed = localStorage.getItem('anki-shared-stats-info-dismissed');
        return dismissed !== 'true';
    });

    const handleDismissInfo = () => {
        localStorage.setItem('anki-shared-stats-info-dismissed', 'true');
        setShowInfoBanner(false);
    };

    // Proactive Metadata Loading: Ensure table rows are loaded for accurate counts
    useEffect(() => {
        if (ankiProgresses.length === 0) return;

        const tablesToLoad = new Set<string>();

        // Collect all unique table IDs from Anki progresses that need loading
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const table = tables.find(t => t.id === tableId);
                // Load if: table exists, has no rows in memory, but has rowCount > 0 (metadata exists)
                if (table && table.rows.length === 0 && (table.rowCount || 0) > 0 && !loadingTableIds.has(tableId)) {
                    tablesToLoad.add(tableId);
                }
            });
        });

        // Fire-and-forget background fetch (cache will prevent redundant loads)
        tablesToLoad.forEach(tableId => {
            fetchTablePayload(tableId).catch(err =>
                console.warn(`Background metadata fetch failed for ${tableId}:`, err)
            );
        });
    }, [ankiProgresses, tables, fetchTablePayload, loadingTableIds]);

    // Detect which progresses share tables with other progresses
    const sharedTableInfo = useMemo(() => {
        const tableUsageMap = new Map<string, string[]>();

        // Build map of which progresses use which tables
        ankiProgresses.forEach(progress => {
            progress.tableIds.forEach(tableId => {
                const existing = tableUsageMap.get(tableId) || [];
                existing.push(progress.id);
                tableUsageMap.set(tableId, existing);
            });
        });

        // Map each progress ID to whether it has shared tables
        const result = new Map<string, boolean>();
        ankiProgresses.forEach(progress => {
            const hasShared = progress.tableIds.some(tid =>
                (tableUsageMap.get(tid)?.length || 0) > 1
            );
            result.set(progress.id, hasShared);
        });

        return result;
    }, [ankiProgresses]);

    const handleSaveSettings = (progressId: string, newConfig: AnkiProgress['ankiConfig']) => {
        const progress = ankiProgresses.find(p => p.id === progressId);
        if (progress) {
            saveAnkiProgress({ ...progress, ankiConfig: newConfig });
        }
        setSettingsForProgress(null);
    };

    const handleDelete = () => {
        if (progressToDelete) {
            deleteAnkiProgress(progressToDelete.id);
            setProgressToDelete(null);
        }
    };


    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            {/* Informational Banner */}
            {showInfoBanner && ankiProgresses.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 animate-fadeIn">
                    <div className="flex items-start gap-3">
                        <Icon name="information-circle" className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                                Shared Learning Progress
                            </h3>
                            <p className="text-blue-800 dark:text-blue-200 text-xs mt-1 leading-relaxed">
                                Your card statistics (due dates, intervals, etc.) are stored at the <strong>table level</strong>.
                                This means studying a card in one set will update its progress across <strong>all sets</strong>
                                using the same table. This is the standard Anki behavior.
                            </p>
                        </div>
                        <button
                            onClick={handleDismissInfo}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                            title="Dismiss"
                        >
                            <Icon name="x" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <header className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                        <Icon name="arrowLeft" className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Anki Decks</h1>
                        <p className="text-sm text-text-subtle">Select a deck to review with Spaced Repetition.</p>
                    </div>
                </div>
                <Button onClick={() => setCurrentScreen(Screen.AnkiProgressSetup)}>
                    <Icon name="plus" className="w-4 h-4 mr-2" />
                    New Set
                </Button>
            </header>

            <main className="space-y-4">
                {ankiProgresses.length > 0 ? (
                    ankiProgresses.map(progress => {
                        const isLoadingMetadata = progress.tableIds.some(tid => loadingTableIds.has(tid));
                        const isSharedWithOtherSets = sharedTableInfo.get(progress.id) || false;
                        return (
                            <DeckCard
                                key={progress.id}
                                progress={progress}
                                onSettingsClick={() => setSettingsForProgress(progress)}
                                onDeleteClick={() => setProgressToDelete(progress)}
                                isLoadingMetadata={isLoadingMetadata}
                                isSharedWithOtherSets={isSharedWithOtherSets}
                            />
                        );
                    })
                ) : (
                    <div className="text-center py-16 bg-surface dark:bg-secondary-800/50 rounded-lg">
                        <Icon name="stack-of-cards" className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">No Anki Sets Found</h2>
                        <p className="text-text-subtle mt-2">Click "New Set" to create your first SRS deck from your tables.</p>
                    </div>
                )}
            </main>

            {settingsForProgress && (
                <AnkiSettingsModal
                    progress={settingsForProgress}
                    onClose={() => setSettingsForProgress(null)}
                    onSave={handleSaveSettings}
                />
            )}

            <ConfirmationModal
                isOpen={!!progressToDelete}
                onClose={() => setProgressToDelete(null)}
                onConfirm={handleDelete}
                title={`Delete "${progressToDelete?.name}"?`}
                message="Are you sure you want to delete this Anki set? Your card review progress (due dates, etc.) will not be affected, but this saved set will be removed."
                confirmText="Delete"
            />
        </div>
    );
};

export default AnkiSetupScreen;
