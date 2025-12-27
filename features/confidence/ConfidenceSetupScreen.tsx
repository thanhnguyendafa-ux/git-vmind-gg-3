
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Table, Relation, VocabRow, Screen, ConfidenceProgress, FlashcardStatus, StudyMode } from '../../types';
import Icon from '../../components/ui/Icon';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../../components/ui/Button';

const DEFAULT_INTERVALS = {
  [FlashcardStatus.Again]: 3,
  [FlashcardStatus.Hard]: 5,
  [FlashcardStatus.Good]: 8,
  [FlashcardStatus.Easy]: 13,
  [FlashcardStatus.Perfect]: 21,
  [FlashcardStatus.Superb]: 34,
  [FlashcardStatus.New]: 0,
};

const ConfidenceSetupScreen: React.FC = () => {
  const { tables, loadingTableIds, fetchTablePayload } = useTableStore(useShallow(state => ({
    tables: state.tables,
    loadingTableIds: state.loadingTableIds,
    fetchTablePayload: state.fetchTablePayload
  })));
  const { saveConfidenceProgress } = useSessionDataStore();
  const { setCurrentScreen, showToast } = useUIStore();

  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [progressName, setProgressName] = useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const hasEditedNameRef = useRef(false);

  useEffect(() => {
    if (selectedTableIds.size > 0) {
      if (!hasEditedNameRef.current) {
        const tableNames = tables
          .filter(t => selectedTableIds.has(t.id))
          .map(t => t.name)
          .join(' & ');
        setProgressName(`Set: ${tableNames}`);
      }
    } else {
      setProgressName('');
      hasEditedNameRef.current = false;
    }
  }, [selectedTableIds, tables]);

  const { availableRelations, totalRows, availableTags } = useMemo(() => {
    if (selectedTableIds.size === 0) {
      return { availableRelations: [], totalRows: 0, availableTags: [] };
    }
    const relations: (Relation & { tableName: string })[] = [];
    let total = 0;
    const tags = new Set<string>();

    tables.forEach(table => {
      if (selectedTableIds.has(table.id)) {
        total += table.rowCount ?? table.rows.length;
        // Legacy `tags` string support for filtering
        const tagSourceRows = (table.rows.length > 0) ? table.rows : [];
        tagSourceRows.forEach(row => {
          (row.tags || []).forEach(tag => tags.add(tag));
        });
        table.relations
          .filter(rel => {
            const hasModes = (rel.compatibleModes?.length ?? 0) > 0 || (rel.interactionModes?.length ?? 0) > 0 || !!rel.interactionType;
            return hasModes;
          })
          .forEach(rel => relations.push({ ...rel, tableName: table.name }));
      }
    });
    return { availableRelations: relations, totalRows: total, availableTags: Array.from(tags).sort() };
  }, [tables, selectedTableIds]);

  useEffect(() => {
    // Auto-select all available relations when tables change
    setSelectedRelationIds(new Set(availableRelations.map(r => r.id)));
  }, [availableRelations]);

  const filteredRowCount = useMemo(() => {
    if (selectedTags.size === 0) return totalRows;
    let count = 0;
    tables.forEach(table => {
      if (selectedTableIds.has(table.id)) {
        // If rows aren't loaded, we can't filter by tag, so we assume all rows match for now
        if (table.rows.length === 0 && (table.rowCount ?? 0) > 0) {
          // This is an estimate; the real count happens on creation.
          count += table.rowCount ?? 0;
        } else {
          table.rows.forEach(row => {
            // Legacy support for string-based tags
            if (row.tags && row.tags.some(tag => selectedTags.has(tag))) {
              count++;
            }
          });
        }
      }
    });
    return count;
  }, [totalRows, selectedTags, selectedTableIds, tables]);

  const handleToggleTable = (tableId: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || loadingTableIds.has(table.id)) return;

    const newSet = new Set(selectedTableIds);
    if (newSet.has(tableId)) {
      newSet.delete(tableId);
    } else {
      newSet.add(tableId);
      // --- NEW: Proactive Data Loading ---
      if (table.rows.length === 0 && (table.rowCount ?? 0) > 0) {
        fetchTablePayload(tableId); // Fire-and-forget background fetch
      }
    }
    setSelectedTableIds(newSet);
    setSelectedTags(new Set());
    hasEditedNameRef.current = false;
  };

  const handleToggleRelation = (relationId: string) => {
    const newSet = new Set(selectedRelationIds);
    if (newSet.has(relationId)) newSet.delete(relationId); else newSet.add(relationId);
    setSelectedRelationIds(newSet);
  };

  const handleToggleTag = (tag: string) => {
    const newSet = new Set(selectedTags);
    if (newSet.has(tag)) newSet.delete(tag); else newSet.add(tag);
    setSelectedTags(newSet);
  };

  const handleSaveProgress = async () => {
    if (!progressName.trim() || !isReady || isCreating) return;
    setIsCreating(true);

    try {
      const currentTables = useTableStore.getState().tables;
      const queue: string[] = [];
      let dataIsLoading = false;

      for (const tableId of selectedTableIds) {
        const table = currentTables.find(t => t.id === tableId);
        if (table) {
          if (table.rows.length === 0 && (table.rowCount ?? 0) > 0) {
            dataIsLoading = true;
            break;
          }
          table.rows.forEach(row => {
            if (selectedTags.size === 0 || (row.tags && row.tags.some(tag => selectedTags.has(tag)))) {
              queue.push(row.id);
            }
          });
        }
      }

      if (dataIsLoading) {
        showToast("Data for selected tables is still loading. Please wait a moment.", "info");
        return;
      }

      if (queue.length === 0) {
        showToast("No words found matching your filters.", "error");
        return;
      }

      const newProgress: ConfidenceProgress = {
        id: crypto.randomUUID(),
        name: progressName.trim(),
        tableIds: Array.from(selectedTableIds),
        relationIds: Array.from(selectedRelationIds),
        tags: Array.from(selectedTags),
        createdAt: Date.now(),
        queue: queue,
        currentIndex: 0,
        intervalConfig: DEFAULT_INTERVALS,
      };

      // Replaced setConfidenceProgresses with saveConfidenceProgress to trigger proper sync
      await saveConfidenceProgress(newProgress);

      setProgressName('');
      setCurrentScreen(Screen.Confidence);
    } finally {
      setIsCreating(false);
    }
  };

  const isReady = selectedTableIds.size > 0 && selectedRelationIds.size > 0;

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setCurrentScreen(Screen.Confidence)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
          <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">New Confidence Set</h1>
          <p className="text-sm text-text-subtle">Select tables and relations to track.</p>
        </div>
      </header>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">1. Select Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => {
              const isLoading = loadingTableIds.has(table.id);
              const isSelected = selectedTableIds.has(table.id);
              return (
                <div
                  key={table.id}
                  onClick={() => !isLoading && handleToggleTable(table.id)}
                  className={`border rounded-lg p-3 transition-all ${isSelected ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-900/20 shadow-md' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-600'} ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-text-main dark:text-secondary-100">{table.name}</h3>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected && !isLoading ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>
                      {isLoading ? (
                        <Icon name="spinner" className="w-3 h-3 text-primary-500 animate-spin" />
                      ) : (
                        isSelected && <Icon name="check" className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-subtle">{(table.rowCount ?? table.rows.length).toLocaleString()} words</p>
                </div>
              )
            })}
          </div>
        </div>

        {selectedTableIds.size > 0 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">2. Select Relations</h2>
            {availableRelations.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {availableRelations.map(rel => {
                  const isSelected = selectedRelationIds.has(rel.id);

                  // Determine primary mode for icon display
                  let primaryMode = rel.interactionModes?.[0] || rel.compatibleModes?.[0] || StudyMode.Flashcards;
                  let modeIcon = "collection";
                  let modeLabel = "Flashcard";

                  if (primaryMode === StudyMode.Typing || primaryMode === StudyMode.Dictation) {
                    modeIcon = "pencil-alt";
                    modeLabel = "Typing";
                  } else if (primaryMode === StudyMode.MultipleChoice || primaryMode === StudyMode.TrueFalse) {
                    modeIcon = "view-list";
                    modeLabel = "Quiz";
                  } else if (primaryMode === StudyMode.Scrambled) {
                    modeIcon = "switch-horizontal";
                    modeLabel = "Scramble";
                  }

                  return (
                    <div key={rel.id} onClick={() => handleToggleRelation(rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-primary-500 bg-primary-500/10 shadow-sm' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50 hover:border-secondary-300'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary-500/20 text-primary-600' : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle'}`}>
                          <Icon name={modeIcon as any} className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-text-main dark:text-secondary-100">{rel.name}</h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 text-text-subtle font-medium uppercase">{modeLabel}</span>
                            <span className="text-xs text-text-subtle">from "{rel.tableName}"</span>
                          </div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>{isSelected && <Icon name="check" className="w-3 h-3 text-white" />}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-4 bg-surface dark:bg-secondary-800/50 rounded-md">
                <p className="text-sm text-text-subtle">No relations are tagged for 'Flashcard' in the selected tables.</p>
              </div>
            )}

            {availableTags.length > 0 && (
              <div className="mt-6 animate-fadeIn">
                <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">3. Filter by Tag (Optional)</h2>
                <div className="p-4 bg-surface dark:bg-secondary-800/50 rounded-lg border border-secondary-200/80 dark:border-secondary-700/50">
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = selectedTags.has(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleToggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${isSelected
                            ? 'bg-primary-500 text-white border-primary-500'
                            : 'bg-surface dark:bg-secondary-700 text-text-subtle border-secondary-300 dark:border-secondary-600 hover:border-primary-400'
                            }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isReady && (
              <div className="animate-fadeIn mt-6">
                <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">{availableTags.length > 0 ? '4.' : '3.'} Name Your Set</h2>
                <input
                  type="text"
                  value={progressName}
                  onChange={(e) => {
                    setProgressName(e.target.value);
                    hasEditedNameRef.current = true;
                  }}
                  className="w-full bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Japanese Verbs (JLPT N5)"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Button onClick={handleSaveProgress} disabled={!isReady || isCreating}>
        {isCreating ? (
          <>
            <Icon name="spinner" className="w-5 h-5 mr-2 animate-spin" />
            Creating...
          </>
        ) : (
          `Create Confidence Set (${filteredRowCount.toLocaleString()} words)`
        )}
      </Button>
    </div>
  );
};

export default ConfidenceSetupScreen;
