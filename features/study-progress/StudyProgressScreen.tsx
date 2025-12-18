
import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Screen, StudyProgress, Question, Relation } from '../../types';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import Modal from '../../components/ui/Modal';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { generateStudySession } from '../../utils/studySessionGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

interface SessionStartConfirmationModalProps {
    progressToStart: { progress: StudyProgress; isResuming: boolean } | null;
    onClose: () => void;
    onConfirm: (isResuming: boolean) => void;
}

const SessionStartConfirmationModal: React.FC<SessionStartConfirmationModalProps> = ({ progressToStart, onClose, onConfirm }) => {
    if (!progressToStart) return null;

    const { progress, isResuming } = progressToStart;
    const { queue, currentIndex } = progress;

    const lastStudied = isResuming ? queue.slice(Math.max(0, currentIndex - 3), currentIndex) : [];
    const nextUp = queue.slice(currentIndex, currentIndex + 5);

    return (
        <Modal isOpen={!!progressToStart} onClose={onClose} title={`Start "${progress.name}"?`}>
            <div className="p-6 space-y-4">
                {isResuming && lastStudied.length > 0 && (
                    <div>
                        <h4 className="text-sm font-bold text-text-subtle mb-2">You'll resume after:</h4>
                        <ul className="list-disc list-inside bg-secondary-100 dark:bg-secondary-700/50 p-3 rounded-md text-sm text-text-subtle space-y-1">
                            {lastStudied.map((q, i) => <li key={i} className="truncate">{q.questionText}</li>)}
                        </ul>
                    </div>
                )}
                {nextUp.length > 0 && (
                     <div>
                        <h4 className="text-sm font-bold text-text-subtle mb-2">Next up:</h4>
                        <ul className="list-disc list-inside bg-secondary-100 dark:bg-secondary-700/50 p-3 rounded-md text-sm text-text-main dark:text-secondary-200 space-y-1">
                             {nextUp.map((q, i) => <li key={i} className="truncate">{q.questionText}</li>)}
                        </ul>
                    </div>
                )}
                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onConfirm(isResuming)}>
                        {isResuming ? `Resume Session (${currentIndex}/${queue.length})` : "Start Session"}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const ProgressCard: React.FC<{ progress: StudyProgress; onStart: (isResuming: boolean) => void; }> = ({ progress, onStart }) => {
    const deleteStudyProgress = useSessionDataStore(state => state.deleteStudyProgress);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    
    const { settings, queue, currentIndex } = progress;
    const questionsCount = queue.length;
    const isResumable = currentIndex > 0 && currentIndex < questionsCount;
    const progressPercent = questionsCount > 0 ? (currentIndex / questionsCount) * 100 : 0;

    const handleDelete = () => {
        deleteStudyProgress(progress.id);
        setIsConfirmDeleteOpen(false);
    };
    
    return (
        <>
            <div className="bg-surface dark:bg-secondary-800 rounded-xl shadow-lg hover:shadow-xl transition-shadow flex flex-col overflow-hidden">
                <div className="p-4 flex-grow">
                    <div className="flex items-center gap-2">
                      <Icon name="progress-arrows" className="w-5 h-5 text-primary-500 flex-shrink-0" />
                      <h3 className="font-bold text-text-main dark:text-secondary-100 truncate">{progress.name}</h3>
                    </div>
                    <p className="text-xs text-text-subtle mt-1">{questionsCount} questions</p>
                    <div className="mt-2 text-xs text-text-subtle">
                        Modes: {(settings.modes || []).join(', ')}
                    </div>
                     <div className="mt-3">
                        <div className="flex justify-between items-center text-xs text-text-subtle mb-1">
                            <span>Progress</span>
                            <span>{currentIndex} / {questionsCount}</span>
                        </div>
                        <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                            <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                    </div>
                </div>
                <div className="bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 p-2 flex justify-end items-center gap-2 rounded-b-xl">
                    <button onClick={() => setIsConfirmDeleteOpen(true)} title="Delete Progress" className="font-semibold text-sm text-error-600 dark:text-error-400 hover:bg-error-500/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
                        <Icon name="trash" className="w-4 h-4"/>
                    </button>
                    {isResumable ? (
                        <>
                            <Button variant="secondary" size="sm" onClick={() => onStart(false)}>
                                Restart
                            </Button>
                            <Button size="sm" onClick={() => onStart(true)}>
                                Resume
                            </Button>
                        </>
                    ) : (
                        <Button size="sm" onClick={() => onStart(false)} className="flex items-center gap-1.5">
                            <Icon name="play" className="w-4 h-4"/> Start
                        </Button>
                    )}
                </div>
            </div>
            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Delete Progress"
                message={`Are you sure you want to delete "${progress.name}"? This action cannot be undone.`}
                confirmText="Delete"
            />
        </>
    );
};

const StudyProgressScreen: React.FC = () => {
    const studyProgresses = useSessionDataStore(useShallow(state => state.studyProgresses));
    const { handleStartStudySession, setStudySetupSourceTableId } = useSessionStore();
    const { setCurrentScreen } = useUIStore();
    const tables = useTableStore(useShallow(state => state.tables));
    const [progressToStart, setProgressToStart] = useState<{ progress: StudyProgress; isResuming: boolean } | null>(null);
    const [activeTab, setActiveTab] = useState<'saved' | 'new'>('saved');

    useEffect(() => {
        // If there are no saved sessions, default to the 'Start New' tab for a better UX.
        if (studyProgresses.length === 0) {
            setActiveTab('new');
        }
    }, [studyProgresses]);

    const relationsByTable = useMemo(() => {
        const availableRelations = tables.flatMap(table =>
            (table.relations || [])
                .filter(rel => (rel.tags || []).includes('StudySession'))
                .map(rel => ({ ...rel, tableId: table.id, tableName: table.name }))
        );
        
        const grouped = new Map<string, (Relation & { tableId: string, tableName: string })[]>();
        availableRelations.forEach(rel => {
            if (!grouped.has(rel.tableName)) {
                grouped.set(rel.tableName, []);
            }
            grouped.get(rel.tableName)!.push(rel);
        });
        return grouped;
    }, [tables]);

    const handleQuickStart = (tableId: string) => {
        setStudySetupSourceTableId(tableId);
        setCurrentScreen(Screen.StudySetup);
    };

    const handleConfirmStart = (isResuming: boolean) => {
        if (!progressToStart) return;
        const { progress } = progressToStart;

        const questionsToUse = (progress.queue.length > 0) ? progress.queue : generateStudySession(tables, progress.settings);
        const startIndex = isResuming ? progress.currentIndex : 0;

        handleStartStudySession({
            questions: questionsToUse,
            startTime: Date.now(),
            settings: progress.settings,
            progressId: progress.id,
            startIndex: startIndex,
        });

        setProgressToStart(null);
    };

    const sortedProgresses = useMemo(() => {
        return [...studyProgresses].sort((a, b) => b.createdAt - a.createdAt);
    }, [studyProgresses]);

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                 <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Study Sessions</h1>
                    <p className="text-sm text-text-subtle">Resume a saved session or start a new one.</p>
                </div>
            </header>

             <div className="border-b border-secondary-200 dark:border-secondary-700 mb-6">
                <div className="flex space-x-4">
                    <button onClick={() => setActiveTab('saved')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'saved' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>
                        Saved Sessions ({sortedProgresses.length})
                    </button>
                    <button onClick={() => setActiveTab('new')} className={`px-1 py-3 font-semibold text-sm ${activeTab === 'new' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>
                        Start New
                    </button>
                </div>
            </div>
            
            <main>
                {activeTab === 'saved' && (
                    <div className="animate-fadeIn">
                        {sortedProgresses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedProgresses.map(progress => (
                                    <ProgressCard 
                                        key={progress.id} 
                                        progress={progress}
                                        onStart={(isResuming) => setProgressToStart({ progress, isResuming })}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Icon name="progress-arrows" className="w-16 h-16 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                                <h2 className="text-xl font-semibold text-secondary-700 dark:text-secondary-300">No Saved Progress</h2>
                                <p className="text-text-subtle mt-2">Go to 'Start New' to create a custom study session.</p>
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'new' && (
                    <div className="animate-fadeIn space-y-6">
                        <div>
                             <h2 className="text-lg font-bold text-text-main dark:text-secondary-100 mb-3">Quick Start</h2>
                             <p className="text-sm text-text-subtle mb-3">Start a session directly from a relation you've configured for study.</p>
                            <div className="space-y-4">
                                {Array.from(relationsByTable.entries()).map(([tableName, relations]) => (
                                    <Card key={tableName}>
                                        <CardHeader className="p-4">
                                            <CardTitle className="text-base">{tableName}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="space-y-2">
                                                {relations.map(rel => (
                                                    <button key={rel.id} onClick={() => handleQuickStart(rel.tableId)} className="w-full text-left p-3 rounded-md hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors border border-secondary-200 dark:border-secondary-700">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-sm">{rel.name}</span>
                                                            <Icon name="arrowRight" className="w-5 h-5 text-text-subtle"/>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                                {relationsByTable.size === 0 && (
                                    <div className="text-center py-12 bg-surface dark:bg-secondary-800/50 rounded-lg">
                                        <Icon name="cog" className="w-12 h-12 text-secondary-300 dark:text-secondary-700 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300">No Relations Ready for Study</h3>
                                        <p className="text-text-subtle mt-1 text-sm">Go to a table, edit a relation, and check 'Apply for Study Session'.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                         <div className="text-center pt-4 border-t border-secondary-200 dark:border-secondary-700">
                            <h2 className="text-lg font-bold text-text-main dark:text-secondary-100 mb-2">Advanced Setup</h2>
                            <p className="text-text-subtle mb-4">Create a fully customized session with specific words, modes, and sorting criteria.</p>
                            <Button size="lg" onClick={() => setCurrentScreen(Screen.StudySetup)}>
                                <Icon name="cog" className="w-5 h-5 mr-2" />
                                Create Custom Progress
                            </Button>
                        </div>
                    </div>
                )}
            </main>

            <SessionStartConfirmationModal
                progressToStart={progressToStart}
                onClose={() => setProgressToStart(null)}
                onConfirm={handleConfirmStart}
            />
        </div>
    );
};

export default StudyProgressScreen;