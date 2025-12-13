
import React, { useState, useMemo, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Table, Relation, StudyMode, StudySettings, CriteriaSort, StudySource, VocabRow, Screen, StudyProgress, Question } from '../../types';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { playToggleSound, playSuccessSound } from '../../services/soundService';
import { generateStudySession } from '../../utils/studySessionGenerator';
import { getPriorityScore, getRankPoint, getLevel, getSuccessRate, getTotalAttempts } from '../../utils/priorityScore';
import StudyGuideModal from './components/StudyGuideModal';
import Popover from '../../components/ui/Popover';
import StudyWheel, { WheelItem } from './components/StudyWheel';
import { getTagSolidColor } from '../../utils/colorUtils';

const SORT_PRESETS: { id: string; name: string; description: string; sorts: CriteriaSort[] }[] = [
    {
        id: 'vmind',
        name: "Vmind's Choice",
        description: "A balanced approach for daily learning. It prioritizes difficult, forgotten, and quit words to ensure well-rounded progress.",
        sorts: [
            { field: 'priorityScore', direction: 'desc' },
            { field: 'totalAttempts', direction: 'desc' },
            { field: 'random', direction: 'asc' },
        ],
    },
    {
        id: 'weakest',
        name: 'Weakest Links',
        description: "Focuses intensely on words you get wrong most often. Ideal for turning weaknesses into strengths.",
        sorts: [
            { field: 'successRate', direction: 'asc' },
            { field: 'failed', direction: 'desc' },
            { field: 'lastPracticeDate', direction: 'asc' },
        ],
    },
    {
        id: 'spaced',
        name: 'Spaced Repetition',
        description: "Brings back old vocabulary you haven't seen in a while to fight the 'forgetting curve' and reinforce long-term memory.",
        sorts: [
            { field: 'lastPracticeDate', direction: 'asc' },
            { field: 'wasQuit', direction: 'desc' },
            { field: 'successRate', direction: 'asc' },
        ],
    },
    {
        id: 'new',
        name: 'New Words First',
        description: "Introduces you to vocabulary you haven't studied yet. Perfect for exploring a new table.",
        sorts: [
            { field: 'totalAttempts', direction: 'asc' },
            { field: 'lastPracticeDate', direction: 'asc' },
            { field: 'random', direction: 'asc' },
        ],
    },
    {
        id: 'polish',
        name: 'Final Polish',
        description: "Crams words you've almost mastered but still make mistakes on. Great for pre-test review.",
        sorts: [
            { field: 'level', direction: 'desc' },
            { field: 'successRate', direction: 'asc' },
            { field: 'lastPracticeDate', direction: 'desc' },
        ],
    },
];


const quizModes = [StudyMode.MultipleChoice, StudyMode.Typing, StudyMode.TrueFalse, StudyMode.Scrambled, StudyMode.Stroke];
const criteriaFields: { id: CriteriaSort['field']; name: string }[] = [
    { id: 'priorityScore', name: 'Priority Score (Hardest First)' },
    { id: 'rankPoint', name: 'Rank Point (Lowest First)' },
    { id: 'successRate', name: 'Success Rate (Lowest First)' },
    { id: 'lastPracticeDate', name: 'Least Recent' },
    { id: 'random', name: 'Random' },
];
const wordCountOptions = [5, 8, 13, 21];

const studyModeIcons: { [key in StudyMode]: string } = {
    [StudyMode.Flashcards]: 'flashcards',
    [StudyMode.MultipleChoice]: 'list-bullet',
    [StudyMode.Typing]: 'keyboard',
    [StudyMode.TrueFalse]: 'check',
    [StudyMode.Scrambled]: 'arrows-right-left',
    [StudyMode.ClozeTyping]: 'keyboard',
    [StudyMode.ClozeMCQ]: 'list-bullet',
    [StudyMode.Dictation]: 'headphones',
    [StudyMode.Stroke]: 'brush',
};

const StudySetupScreen: React.FC = () => {
    const tables = useTableStore(useShallow(state => state.tables));
    const { handleStartStudySession, studySetupSourceTableId, setStudySetupSourceTableId, studySetupOverrides, setStudySetupOverrides } = useSessionStore();
    const { saveStudyProgress } = useSessionDataStore();
    const { setCurrentScreen, theme, showToast } = useUIStore();
    const [selectedSources, setSelectedSources] = useState<StudySource[]>([]);
    const [wordCount, setWordCount] = useState<number>(13);
    const [selectedModes, setSelectedModes] = useState<Set<StudyMode>>(new Set(quizModes));
    const [criteriaSorts, setCriteriaSorts] = useState<CriteriaSort[]>(SORT_PRESETS[0].sorts);
    const [randomizeModes, setRandomizeModes] = useState(true);
    const [wordSelectionMode, setWordSelectionMode] = useState<'auto' | 'manual'>('auto');
    const [manualWordIds, setManualWordIds] = useState<Set<string>>(new Set());

    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [progressName, setProgressName] = useState('');
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [activePresetId, setActivePresetId] = useState<string>(SORT_PRESETS[0].id);
    const [popoverStates, setPopoverStates] = useState<Record<string, boolean>>({});
    
    // New: Source Selection View Mode
    const [selectionViewMode, setSelectionViewMode] = useState<'list' | 'wheel'>('list');


  useEffect(() => {
    if (studySetupOverrides) {
        // Apply overrides to local state
        setSelectedSources(studySetupOverrides.sources || []);
        setSelectedModes(new Set(studySetupOverrides.modes || []));
        setRandomizeModes(studySetupOverrides.randomizeModes ?? true);
        setWordSelectionMode(studySetupOverrides.wordSelectionMode || 'auto');
        setManualWordIds(new Set(studySetupOverrides.manualWordIds || []));
        setCriteriaSorts(studySetupOverrides.criteriaSorts || SORT_PRESETS[0].sorts);
        setWordCount(studySetupOverrides.wordCount || 13);
        
        // Clear the overrides so they aren't used again on re-render
        setStudySetupOverrides(null);
    } else if (studySetupSourceTableId) {
        const sourceTable = tables.find(t => t.id === studySetupSourceTableId);
        if (sourceTable && sourceTable.relations.length > 0) {
            setSelectedSources([{ tableId: studySetupSourceTableId, relationId: sourceTable.relations[0].id }]);
        }
        setStudySetupSourceTableId(null);
    }
  }, [studySetupSourceTableId, setStudySetupSourceTableId, tables, studySetupOverrides, setStudySetupOverrides]);

  useEffect(() => {
      const sourceNames = tables
        .filter(t => selectedSources.some(s => s.tableId === t.id))
        .map(t => t.name)
        .join(' & ');
      setProgressName(sourceNames ? `Study: ${sourceNames}` : 'New Study Progress');
  }, [selectedSources, tables]);

  const availableRelations = useMemo(() => {
    return tables.flatMap(table =>
        (table.relations || [])
            .filter(rel => (rel.tags || []).includes('StudySession'))
            .map(rel => ({ ...rel, tableId: table.id, tableName: table.name, }))
    );
  }, [tables]);
  
  // Prepare items for the Wheel
  const wheelItems: WheelItem[] = useMemo(() => {
      return availableRelations.map(rel => {
          const table = tables.find(t => t.id === rel.tableId);
          // Use table tags to determine color for visual grouping
          const primaryTagId = table?.tagIds?.[0] || '';
          const color = primaryTagId ? getTagSolidColor(primaryTagId, theme, {}) : (theme === 'dark' ? '#475569' : '#cbd5e1');
          
          return {
              id: `${rel.tableId}:${rel.id}`,
              label: rel.name,
              color: color
          };
      });
  }, [availableRelations, tables, theme]);
  
  const wordsForManualSelection = useMemo(() => {
    const rowMap = new Map<string, VocabRow & { sourceDisplay: string }>();
    selectedSources.forEach(source => {
        const table = tables.find(t => t.id === source.tableId);
        const relation = table?.relations.find(r => r.id === source.relationId);
        if (table && relation) {
            const questionColName = table.columns.find(c => c.id === relation.questionColumnIds[0])?.name || '...';
            table.rows.forEach(row => { if (!rowMap.has(row.id)) { rowMap.set(row.id, { ...row, sourceDisplay: row.cols[relation.questionColumnIds[0]] || `[Empty ${questionColName}]` }); } });
        }
    });
    return Array.from(rowMap.values());
  }, [selectedSources, tables]);

  const maxWords = wordsForManualSelection.length;
  
  useEffect(() => {
      if (wordCount > maxWords) {
          const largestValidOption = wordCountOptions.slice().reverse().find(opt => opt <= maxWords);
          setWordCount(largestValidOption || 13);
      }
      setManualWordIds(prev => {
          const availableIds = new Set(wordsForManualSelection.map(w => w.id));
          const newSet = new Set<string>();
          prev.forEach(id => { if (availableIds.has(id)) newSet.add(id); });
          return newSet;
      });
  }, [maxWords, wordsForManualSelection, wordCount]);

  const handleToggleSource = (tableId: string, relationId: string) => { setSelectedSources(prev => { const exists = prev.some(s => s.tableId === tableId && s.relationId === relationId); if (exists) { return prev.filter(s => !(s.tableId === tableId && s.relationId === relationId)); } else { return [...prev, { tableId, relationId }]; } }); };
  const handleToggleMode = (mode: StudyMode) => { setSelectedModes(prev => { const newSet = new Set(prev); if (newSet.has(mode)) newSet.delete(mode); else newSet.add(mode); return newSet; }); };
  const handleCriteriaChange = (index: number, field: keyof CriteriaSort, value: string) => { setCriteriaSorts(prev => { const newSorts = [...prev]; newSorts[index] = { ...newSorts[index], [field]: value }; return newSorts; }); setActivePresetId(''); };
  const addCriteria = () => { if (criteriaSorts.length < 3) { setCriteriaSorts(prev => [...prev, { field: 'priorityScore', direction: 'desc' }]); setActivePresetId(''); } };
  const removeCriteria = (index: number) => { setCriteriaSorts(prev => prev.filter((_, i) => i !== index)); setActivePresetId(''); };
  const handleToggleManualWord = (rowId: string) => { setManualWordIds(prev => { const newSet = new Set(prev); if (newSet.has(rowId)) newSet.delete(rowId); else newSet.add(rowId); return newSet; }) };
  const handleSelectPreset = (presetId: string) => { const preset = SORT_PRESETS.find(p => p.id === presetId); if (preset) { setCriteriaSorts(preset.sorts); setActivePresetId(presetId); playToggleSound(); } };
  
  const handleWheelSpinComplete = async (selectedItemId: string) => {
      const [tableId, relationId] = selectedItemId.split(':');
      
      // Select a random preset for variety
      const randomPreset = SORT_PRESETS[Math.floor(Math.random() * SORT_PRESETS.length)];
      
      const settings: StudySettings = {
          sources: [{ tableId, relationId }],
          modes: quizModes,
          randomizeModes: true,
          wordSelectionMode: 'auto',
          wordCount: 5, // Quick Race length
          criteriaSorts: randomPreset.sorts,
      };
      
      const questions = generateStudySession(tables, settings);
      
      if (questions.length === 0) {
          showToast("Not enough words for a Quick Race.", "error");
          setSelectionViewMode('list');
          return;
      }

      const table = tables.find(t => t.id === tableId);
      const newProgress: StudyProgress = {
          id: crypto.randomUUID(),
          name: `Quick Race: ${table?.name || 'Unknown'}`,
          createdAt: Date.now(),
          settings: settings,
          queue: questions,
          currentIndex: 0
      };

      await saveStudyProgress(newProgress);
      playSuccessSound();

      handleStartStudySession({
          questions: newProgress.queue,
          startTime: Date.now(),
          settings: newProgress.settings,
          progressId: newProgress.id,
          startIndex: 0,
      });
  };

  const handleCreateAndStart = async () => {
    if (!isReady || !progressName.trim()) return;

    const settings: StudySettings = {
        sources: selectedSources,
        modes: Array.from(selectedModes),
        randomizeModes,
        wordSelectionMode,
        wordCount: wordSelectionMode === 'auto' ? Math.min(wordCount, maxWords) : undefined,
        manualWordIds: wordSelectionMode === 'manual' ? Array.from(manualWordIds) : undefined,
        criteriaSorts: criteriaSorts,
    };
    
    const questions = generateStudySession(tables, settings);
    
    const newProgress: StudyProgress = {
        id: crypto.randomUUID(),
        name: progressName.trim(),
        createdAt: Date.now(),
        settings: settings,
        queue: questions,
        currentIndex: 0
    };

    await saveStudyProgress(newProgress);

    handleStartStudySession({
        questions: newProgress.queue,
        startTime: Date.now(),
        settings: newProgress.settings,
        progressId: newProgress.id,
        startIndex: 0,
    });
  };
  
  const currentWordCount = wordSelectionMode === 'auto' ? Math.min(wordCount, maxWords) : manualWordIds.size;
  const isReady = selectedSources.length > 0 && selectedModes.size > 0 && currentWordCount > 0;

  const sessionPreviewWords = useMemo(() => {
    if (wordSelectionMode !== 'auto' || selectedSources.length === 0) {
        return [];
    }
    const tablesById = new Map<string, Table>(tables.map(t => [t.id, t]));
    const allRowsMap = new Map<string, VocabRow>();
    for (const source of selectedSources) {
        const table = tablesById.get(source.tableId);
        if (table) {
            table.rows.forEach(row => { if (!allRowsMap.has(row.id)) { allRowsMap.set(row.id, row); } });
        }
    }
    let candidateRows: VocabRow[] = Array.from(allRowsMap.values());
    
    if (criteriaSorts && criteriaSorts.length > 0) {
        const maxInQueue = Math.max(1, ...candidateRows.map(r => r.stats.inQueueCount || 0));
        candidateRows.sort((a: VocabRow, b: VocabRow) => {
            for (const sort of criteriaSorts) {
                let valA, valB;
                let comparison = 0;
                switch(sort.field) {
                    case 'priorityScore': valA = getPriorityScore(a, maxInQueue); valB = getPriorityScore(b, maxInQueue); comparison = valB - valA; break;
                    case 'rankPoint': valA = getRankPoint(a); valB = getRankPoint(b); comparison = valA - valB; break;
                    case 'level': valA = getLevel(a); valB = getLevel(b); comparison = valA - valB; break;
                    case 'successRate': valA = getSuccessRate(a); valB = getSuccessRate(b); comparison = valA - valB; break;
                    case 'lastPracticeDate': valA = a.stats.lastPracticeDate || 0; valB = b.stats.lastPracticeDate || 0; comparison = valA - valB; break;
                    case 'failed': valA = a.stats.incorrect || 0; valB = b.stats.incorrect || 0; comparison = valB - valA; break;
                    case 'totalAttempts': valA = getTotalAttempts(a); valB = getTotalAttempts(b); comparison = valA - valB; break;
                    case 'inQueueCount': valA = a.stats.inQueueCount || 0; valB = b.stats.inQueueCount || 0; comparison = valA - valB; break;
                    case 'wasQuit': valA = a.stats.wasQuit ? 1 : 0; valB = b.stats.wasQuit ? 1 : 0; comparison = valB - valA; break;
                    case 'random': comparison = Math.random() - 0.5; break;
                }
                if (comparison !== 0) { return sort.direction === 'asc' ? comparison : -comparison; }
            }
            return 0;
        });
    }

    return candidateRows.slice(0, 5).map((row: VocabRow) => {
        const maxInQueue = Math.max(1, ...candidateRows.map((r: VocabRow) => r.stats.inQueueCount || 0));
        return {
            row,
            score: getPriorityScore(row, maxInQueue)
        }
    });

  }, [selectedSources, criteriaSorts, tables, wordSelectionMode]);

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
        <header className="flex items-center gap-3 mb-6">
            <button onClick={() => setCurrentScreen(Screen.StudyProgress)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
                <Icon name="arrowLeft" className="w-6 h-6"/>
            </button>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create Study Progress</h1>
                <p className="text-sm text-slate-500 dark:text-gray-400">Configure and save a new quiz session.</p>
            </div>
        </header>
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/50 rounded-xl p-6 shadow-md">
            <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                     <h2 className="text-lg font-semibold text-slate-800 dark:text-white">1. Select Content</h2>
                     <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5 gap-0.5">
                        <button 
                            onClick={() => setSelectionViewMode('list')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectionViewMode === 'list' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}
                        >
                            List
                        </button>
                        <button 
                            onClick={() => setSelectionViewMode('wheel')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectionViewMode === 'wheel' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}
                        >
                            Wheel
                        </button>
                     </div>
                </div>
                
                {selectionViewMode === 'wheel' ? (
                     <div className="flex flex-col items-center justify-center p-4 bg-secondary-50 dark:bg-secondary-900/50 rounded-xl border border-secondary-200 dark:border-secondary-700 mb-4 animate-fadeIn">
                        <p className="text-xs text-text-subtle mb-4">Spin to start a 5-question Quick Race!</p>
                        <StudyWheel items={wheelItems} onSpinComplete={handleWheelSpinComplete} />
                     </div>
                ) : (
                    <>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Select all relations you want to draw from. Only relations tagged for 'StudySession' will appear here.</p>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {availableRelations.length > 0 ? availableRelations.map(rel => { const isSelected = selectedSources.some(s => s.tableId === rel.tableId && s.relationId === rel.id); return ( <div key={`${rel.tableId}-${rel.id}`} onClick={() => handleToggleSource(rel.tableId, rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300'}`}> <div className="flex items-center justify-between"> <div> <h3 className="font-bold text-slate-800 dark:text-white text-sm">{rel.name}</h3> <p className="text-xs text-slate-500 dark:text-slate-400">from "{rel.tableName}"</p> </div> <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-600'}`}> {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>} </div> </div> </div> ) }) : (
                            <div className="text-center p-4 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <p className="text-sm text-slate-500 dark:text-slate-400">No relations are configured for Study Sessions.</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Go to a table's 'Relations' tab, edit a relation, and check 'Apply for Study Session'.</p>
                            </div>
                        )}
                        </div>
                    </>
                )}
            </div>
            
            {/* Standard Config Section - Only show if not in Wheel mode, or if user scrolls down */}
            {selectionViewMode === 'list' && (
            <>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">2. Configure Session</h2>
                 <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold mb-4 w-fit">
                    <button onClick={() => setWordSelectionMode('auto')} className={`px-4 py-1.5 rounded-full ${wordSelectionMode === 'auto' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Automatic</button>
                    <button onClick={() => setWordSelectionMode('manual')} className={`px-4 py-1.5 rounded-full ${wordSelectionMode === 'manual' ? 'bg-white dark:bg-slate-600 shadow' : ''}`}>Manual</button>
                </div>
                {wordSelectionMode === 'auto' ? (
                    <div className="animate-fadeIn">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Number of Rows ({maxWords} available)</label>
                            <div className="flex rounded-full bg-slate-200 dark:bg-slate-700 p-1 text-sm font-semibold w-fit">
                                {wordCountOptions.map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => { playToggleSound(); setWordCount(num); }}
                                        className={`px-4 py-1.5 rounded-full disabled:opacity-50 disabled:cursor-not-allowed ${wordCount === num ? 'bg-white dark:bg-slate-600 shadow' : ''}`}
                                        disabled={(maxWords > 0 && num > maxWords) || maxWords === 0}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Sort Strategy</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {SORT_PRESETS.map(preset => (
                                    <div key={preset.id} className="flex items-center gap-1">
                                        <Button
                                            variant={activePresetId === preset.id ? 'primary' : 'secondary'}
                                            onClick={() => handleSelectPreset(preset.id)}
                                            className="w-full justify-start text-left flex-1"
                                        >
                                            {preset.name}
                                        </Button>
                                        <Popover
                                            isOpen={!!popoverStates[preset.id]}
                                            setIsOpen={isOpen => setPopoverStates(prev => ({ ...prev, [preset.id]: isOpen }))}
                                            trigger={
                                                <Button variant="ghost" size="sm" className="px-2" aria-label={`Info about ${preset.name}`}>
                                                    <Icon name="question-mark-circle" className="w-5 h-5" />
                                                </Button>
                                            }
                                            contentClassName="max-w-xs"
                                        >
                                            <p className="text-sm">{preset.description}</p>
                                        </Popover>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-3 mt-4">
                            <div className="flex items-center gap-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Custom Sort</label>
                                <button onClick={() => setIsGuideModalOpen(true)} className="text-text-subtle hover:text-primary-500">
                                    <Icon name="question-mark-circle" className="w-5 h-5" />
                                </button>
                            </div>
                            {criteriaSorts.map((sort, index) => (
                                <div key={index} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{index + 1}.</span>
                                    <select value={sort.field} onChange={e => handleCriteriaChange(index, 'field', e.target.value)} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm">
                                        {criteriaFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                    <button onClick={() => removeCriteria(index)} className="p-1 text-slate-400 hover:text-red-500" disabled={criteriaSorts.length <= 1}>
                                        <Icon name="trash" className="w-4 h-4"/>
                                    </button>
                                </div>
                            ))}
                            {criteriaSorts.length < 3 && ( <button onClick={addCriteria} className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"> <Icon name="plus" className="w-4 h-4"/> Add Sort Criterion </button> )}
                        </div>
                         {sessionPreviewWords.length > 0 && (
                            <div className="mt-4 p-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 animate-fadeIn">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Session Preview</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">These are the top 5 words that will be included in your session based on the current sorting.</p>
                                <ul className="space-y-2">
                                    {sessionPreviewWords.map(({ row, score }) => {
                                        const colorClass = score > 0.7 ? 'bg-error-500' : score > 0.4 ? 'bg-warning-500' : 'bg-success-500';
                                        return (
                                            <li key={row.id} className="flex items-center gap-3 text-sm">
                                                <div className="w-1/3 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full ${colorClass}`} style={{ width: `${score * 100}%` }}></div>
                                                </div>
                                                <span className="flex-1 truncate">{row.cols[Object.keys(row.cols)[0]] || '[Empty]'}</span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Select Rows ({manualWordIds.size} / {maxWords} selected)</label>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 border rounded-md p-2 bg-slate-50 dark:bg-slate-800/50">
                            {wordsForManualSelection.length > 0 ? wordsForManualSelection.map(word => { const isSelected = manualWordIds.has(word.id); return <div key={word.id} onClick={() => handleToggleManualWord(word.id)} className={`p-2 rounded-md cursor-pointer flex items-center gap-3 text-sm ${isSelected ? 'bg-primary-100 dark:bg-primary-900/40' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}> <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-600'}`}> {isSelected && <Icon name="check" className="w-3 h-3 text-white"/>} </div> <span className="truncate">{word.sourceDisplay}</span> </div> }) : <p className="text-xs text-center text-slate-500 p-4">Select relations above to see available rows.</p>}
                        </div>
                    </div>
                )}
            </div>
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">3. Select Question Types</h2>
                    {selectedModes.size > 1 && ( <div className="flex items-center gap-2"> <label htmlFor="randomize-modes" className="text-xs text-slate-500 dark:text-slate-400">Randomize Modes</label> <button id="randomize-modes" onClick={() => setRandomizeModes(!randomizeModes)} className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${randomizeModes ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}> <span className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${randomizeModes ? 'translate-x-5' : ''}`}></span> </button> </div> )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {quizModes.map(mode => { const isSelected = selectedModes.has(mode); return ( <div key={mode} onClick={() => handleToggleMode(mode)} className={`border rounded-lg p-3 cursor-pointer transition-all text-center ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/50 hover:border-slate-300'}`}> <Icon name={studyModeIcons[mode]} className={`w-5 h-5 mb-1 mx-auto ${isSelected ? 'text-primary-500' : 'text-slate-500'}`} /> <h3 className="font-semibold text-xs text-slate-800 dark:text-white">{mode}</h3> </div> ) })}
                </div>
            </div>
            </>
            )}

        </div>
        
        {/* Only show the "Create & Start" button in List Mode. In Wheel Mode, it's automatic. */}
        {selectionViewMode === 'list' && (
            <button onClick={() => setIsSaveModalOpen(true)} disabled={!isReady} className="w-full bg-primary-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6">
                <Icon name="play" className="w-5 h-5" />
                Create & Start ({currentWordCount} Questions)
            </button>
        )}

        <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Study Progress">
          <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleCreateAndStart(); }}>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Progress Name</label>
                  <input
                      type="text"
                      value={progressName}
                      onChange={(e) => setProgressName(e.target.value)}
                      autoFocus
                      className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="mt-6 flex justify-end gap-2">
                      <Button type="button" variant="secondary" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={!progressName.trim()}>Save & Start</Button>
                  </div>
              </form>
          </div>
      </Modal>
      <StudyGuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />
    </div>
  );
};

export default StudySetupScreen;
