import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Table, Relation, VocabRow, Screen, AnkiProgress, AnkiConfig } from '../../types';
import Icon from '../../components/ui/Icon';
import { useTableStore } from '../../stores/useTableStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useUIStore } from '../../stores/useUIStore';
import { Button } from '../../components/ui/Button';
import { generateUUID } from '../../utils/uuidUtils';

const DEFAULT_ANKI_CONFIG: AnkiConfig = {
  newCardsPerDay: 20,
  learningSteps: [1, 10],
  graduatingInterval: 1,
  easyInterval: 4,
  maxReviewsPerDay: 200,
  easyBonus: 1.3,
  intervalModifier: 1.0,
  lapseSteps: [10],
  newIntervalPercent: 0,
};

const AnkiProgressSetupScreen: React.FC = () => {
  const { tables } = useTableStore();
  const { saveAnkiProgress } = useSessionDataStore();
  const { setCurrentScreen } = useUIStore();

  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set());
  const [selectedRelationIds, setSelectedRelationIds] = useState<Set<string>>(new Set());
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [progressName, setProgressName] = useState('');
  const hasEditedNameRef = useRef(false);

  useEffect(() => {
    if (selectedTableIds.size > 0) {
      if (!hasEditedNameRef.current) {
        const tableNames = tables
          .filter(t => selectedTableIds.has(t.id))
          .map(t => t.name)
          .join(' & ');
        setProgressName(`Anki: ${tableNames}`);
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
        total += table.rows.length;
        table.rows.forEach(row => {
          (row.tags || []).forEach(tag => tags.add(tag));
        });
        table.relations
          // .filter(rel => (rel.tags || []).includes('Anki')) // Removed strict filter
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
    let count = 0;
    tables.forEach(table => {
      if (selectedTableIds.has(table.id)) {
        let tableRowCount = 0;
        if (selectedTags.size === 0) {
          tableRowCount = table.rows.length;
        } else {
          table.rows.forEach(row => {
            if (row.tags && row.tags.some(tag => selectedTags.has(tag))) {
              tableRowCount++;
            }
          });
        }

        const selectedRelCountForTable = table.relations.filter(r => selectedRelationIds.has(r.id)).length;
        if (selectedRelCountForTable > 0) {
          count += (tableRowCount * selectedRelCountForTable);
        }
      }
    });
    return count;
  }, [selectedTags, selectedTableIds, selectedRelationIds, tables]);

  const handleToggleTable = (tableId: string) => {
    const newSet = new Set(selectedTableIds);
    if (newSet.has(tableId)) newSet.delete(tableId); else newSet.add(tableId);
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
    if (!progressName.trim() || !isReady) return;

    const newProgress: AnkiProgress = {
      id: generateUUID(),
      name: progressName.trim(),
      tableIds: Array.from(selectedTableIds),
      relationIds: Array.from(selectedRelationIds),
      tags: Array.from(selectedTags),
      ankiConfig: DEFAULT_ANKI_CONFIG,
      createdAt: Date.now(),
    };

    await saveAnkiProgress(newProgress);

    setProgressName('');
    setCurrentScreen(Screen.AnkiSetup);
  };

  const isReady = selectedTableIds.size > 0 && selectedRelationIds.size > 0 && filteredRowCount > 0;

  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => setCurrentScreen(Screen.AnkiSetup)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
          <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">New Anki Set</h1>
          <p className="text-sm text-text-subtle">Select tables and relations to create a new SRS deck.</p>
        </div>
      </header>

      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">1. Select Tables</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map(table => (
              <div key={table.id} onClick={() => handleToggleTable(table.id)} className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedTableIds.has(table.id) ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-900/20 shadow-md' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-600'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-text-main dark:text-secondary-100">{table.name}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedTableIds.has(table.id) ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>
                    {selectedTableIds.has(table.id) && <Icon name="check" className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs text-text-subtle font-medium">{table.rows.length} rows</p>
                  <div className="flex gap-2 text-[10px] text-text-subtle/80">
                    <span>{table.columns.length} columns</span>
                    {table.modifiedAt && <span>• Upd {new Date(table.modifiedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedTableIds.size > 0 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-3">2. Select Relations</h2>
            {availableRelations.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {availableRelations.map(rel => {
                  const isSelected = selectedRelationIds.has(rel.id);
                  return (
                    <div key={rel.id} onClick={() => handleToggleRelation(rel.id)} className={`border rounded-lg p-3 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'border-primary-500 bg-primary-500/10' : 'bg-surface dark:bg-secondary-800 border-secondary-200/80 dark:border-secondary-700/50'}`}>
                      <div><h4 className="font-semibold text-text-main dark:text-secondary-100">{rel.name}</h4><p className="text-xs text-text-subtle">from "{rel.tableName}"</p></div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-secondary-300 dark:border-secondary-600'}`}>{isSelected && <Icon name="check" className="w-3 h-3 text-white" />}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-4 bg-surface dark:bg-secondary-800/50 rounded-md">
                <p className="text-sm text-text-subtle">No relations found in the selected tables.</p>
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

      <Button onClick={handleSaveProgress} disabled={!isReady || !progressName.trim()} className="w-full mt-6">
        Create Anki Set ({filteredRowCount} cards)
      </Button>
    </div>
  );
};

export default AnkiProgressSetupScreen;