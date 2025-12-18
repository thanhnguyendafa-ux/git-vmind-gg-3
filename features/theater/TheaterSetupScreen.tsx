
import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { StudySource, Screen, TheaterSessionSettings } from '../../types';
import Icon from '../../components/ui/Icon';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUIStore } from '../../stores/useUIStore';
import { playToggleSound } from '../../services/soundService';

const partDelayOptions = [{ label: '0.5s', value: 500 }, { label: '1s', value: 1000 }, { label: '1.5s', value: 1500 }, { label: '2s', value: 2000 }];
const cardIntervalOptions = [{ label: '2s', value: 2000 }, { label: '3s', value: 3000 }, { label: '5s', value: 5000 }, { label: '8s', value: 8000 }];
const sessionDurationOptions = [{ label: '5m', value: 5 }, { label: '10m', value: 10 }, { label: '15m', value: 15 }, { label: '∞', value: 0 }];

const TheaterSetupScreen: React.FC = () => {
    const tables = useTableStore(useShallow(state => state.tables));
    const { handleStartTheaterSession, studySetupSourceTableId, setStudySetupSourceTableId } = useSessionStore();
    const { setCurrentScreen } = useUIStore();
    const [selectedSources, setSelectedSources] = useState<StudySource[]>([]);
    const [partDelay, setPartDelay] = useState<number>(1000);
    const [cardInterval, setCardInterval] = useState<number>(3000);
    const [sessionDuration, setSessionDuration] = useState<number>(0);

    const availableRelations = useMemo(() => {
        return tables.flatMap(table => 
            table.relations
                .filter(rel => (rel.tags || []).includes('Theater'))
                .map(rel => ({ ...rel, tableId: table.id, tableName: table.name }))
        );
    }, [tables]);

    useEffect(() => {
        if (studySetupSourceTableId) {
            const sourceTable = tables.find(t => t.id === studySetupSourceTableId);
            if (sourceTable && sourceTable.relations.length > 0) {
                // Find first relation in the source table that is theater-compatible
                const theaterRelation = sourceTable.relations.find(r => (r.tags || []).includes('Theater'));
                if (theaterRelation) {
                    setSelectedSources([{ tableId: studySetupSourceTableId, relationId: theaterRelation.id }]);
                }
            }
            setStudySetupSourceTableId(null);
        }
    }, [studySetupSourceTableId, setStudySetupSourceTableId, tables]);

    const handleToggleSource = (tableId: string, relationId: string) => {
        playToggleSound();
        setSelectedSources(prev => {
            const exists = prev.some(s => s.tableId === tableId && s.relationId === relationId);
            if (exists) {
                return prev.filter(s => !(s.tableId === tableId && s.relationId === relationId));
            } else {
                return [...prev, { tableId, relationId }];
            }
        });
    };

    const handleStart = () => {
        const settings: TheaterSessionSettings = {
            sources: selectedSources,
            partDelay,
            cardInterval,
            sessionDuration,
        };
        handleStartTheaterSession(settings);
    };

    const isReady = selectedSources.length > 0;

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.Vmind)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Setup Theater Mode</h1>
                    <p className="text-sm text-slate-500 dark:text-gray-400">Configure your passive review session.</p>
                </div>
            </header>
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-6 shadow-md space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">1. Select Content</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Choose the tables and relations you want to watch.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {availableRelations.length > 0 ? availableRelations.map(rel => {
                            const isSelected = selectedSources.some(s => s.tableId === rel.tableId && s.relationId === rel.id);
                            return (
                                <div key={`${rel.tableId}-${rel.id}`} onClick={() => handleToggleSource(rel.tableId, rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-slate-800 dark:text-white text-sm">{rel.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">from "{rel.tableName}"</p>
                                        </div>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                            {isSelected && <Icon name="check" className="w-3 h-3 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <p className="text-sm text-slate-500 dark:text-slate-400">No relations are tagged for Theater mode.</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Edit a relation in a table and check 'Apply for Theater Mode'.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">2. Configure Timings</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Part Delay (between fields)</label>
                            <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                {partDelayOptions.map(opt => (
                                    <button key={opt.value} onClick={() => { playToggleSound(); setPartDelay(opt.value); }} className={`px-4 py-1.5 rounded-full ${partDelay === opt.value ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Card Interval (between cards)</label>
                            <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                {cardIntervalOptions.map(opt => (
                                    <button key={opt.value} onClick={() => { playToggleSound(); setCardInterval(opt.value); }} className={`px-4 py-1.5 rounded-full ${cardInterval === opt.value ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Session Duration</label>
                             <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                {sessionDurationOptions.map(opt => (
                                    <button key={opt.value} onClick={() => { playToggleSound(); setSessionDuration(opt.value); }} className={`px-4 py-1.5 rounded-full ${sessionDuration === opt.value ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>{opt.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={handleStart} disabled={!isReady} className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6">
                <Icon name="play" className="w-5 h-5" />
                Start Theater
            </button>
        </div>
    );
};

export default TheaterSetupScreen;
