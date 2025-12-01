
import * as React from 'react';
import { Table, Relation, Column, VocabRow } from '../../../../types';
import Icon from '../../../../components/ui/Icon';

interface ColumnMapperProps {
    table: Table;
    relation: Relation;
    onChange: (updatedRelation: Relation) => void;
    sampleRow?: VocabRow | null;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ table, relation, onChange, sampleRow }) => {

    const handleToggle = (colId: string, type: 'Q' | 'A' | 'P' | 'S') => {
        const newRel = JSON.parse(JSON.stringify(relation));
        
        // Ensure audioConfig exists
        if (!newRel.audioConfig) newRel.audioConfig = { frontColumnIds: [], backColumnIds: [] };

        // Helper to add/remove from array
        const toggleInArray = (arr: string[], val: string) => {
            const idx = arr.indexOf(val);
            if (idx > -1) arr.splice(idx, 1);
            else arr.push(val);
            return arr;
        };

        // Helper to sync design elementOrder
        const syncDesign = (face: 'front' | 'back', colId: string, isAdding: boolean) => {
            if (!newRel.design) return;
            if (!newRel.design[face].elementOrder) newRel.design[face].elementOrder = [];
            
            if (isAdding) {
                // Add to end if not exists
                if (!newRel.design[face].elementOrder.includes(colId)) {
                    newRel.design[face].elementOrder.push(colId);
                }
            } else {
                // Remove if exists
                 newRel.design[face].elementOrder = newRel.design[face].elementOrder.filter((id: string) => id !== colId);
            }
        };

        if (type === 'Q') {
            const wasPresent = newRel.questionColumnIds.includes(colId);
            newRel.questionColumnIds = toggleInArray(newRel.questionColumnIds, colId);
            syncDesign('front', colId, !wasPresent);
        } else if (type === 'A') {
            const wasPresent = newRel.answerColumnIds.includes(colId);
            newRel.answerColumnIds = toggleInArray(newRel.answerColumnIds, colId);
            syncDesign('back', colId, !wasPresent);
        } else if (type === 'P') {
             newRel.audioConfig.frontColumnIds = toggleInArray(newRel.audioConfig.frontColumnIds, colId);
        } else if (type === 'S') {
             newRel.audioConfig.backColumnIds = toggleInArray(newRel.audioConfig.backColumnIds, colId);
        }

        onChange(newRel);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 items-center px-2 py-1 text-xs font-bold text-text-subtle uppercase border-b border-secondary-200 dark:border-secondary-700">
                <span>Column</span>
                <span className="w-8 text-center text-success-600" title="Question (Front)">Q</span>
                <span className="w-8 text-center text-info-600" title="Answer (Back)">A</span>
                <span className="w-8 text-center text-purple-500" title="Pronunciation (TTS)">P</span>
                <span className="w-8 text-center text-warning-500" title="Sound (File)">S</span>
            </div>
            <div className="space-y-2">
                {table.columns.map(col => {
                    const isQ = relation.questionColumnIds?.includes(col.id);
                    const isA = relation.answerColumnIds?.includes(col.id);
                    const isP = relation.audioConfig?.frontColumnIds?.includes(col.id); 
                    const isS = relation.audioConfig?.backColumnIds?.includes(col.id);
                    const sampleData = sampleRow?.cols[col.id];

                    return (
                        <div key={col.id} className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-4 items-center p-2 rounded-md bg-secondary-50 dark:bg-secondary-800/50 border border-secondary-100 dark:border-secondary-700 hover:border-secondary-300 transition-colors">
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-sm font-medium text-text-main dark:text-secondary-200 truncate" title={col.name}>{col.name}</span>
                                {sampleData && (
                                    <span className="text-xs text-text-subtle truncate italic opacity-80 block max-w-[200px]">: {sampleData}</span>
                                )}
                            </div>
                            
                            {/* Question Toggle */}
                            <button 
                                onClick={() => handleToggle(col.id, 'Q')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isQ ? 'bg-success-100 text-success-600 ring-1 ring-success-500 font-bold' : 'bg-secondary-200 dark:bg-secondary-700 text-text-subtle hover:bg-secondary-300'}`}
                            >
                                Q
                            </button>
                            
                            {/* Answer Toggle */}
                            <button 
                                onClick={() => handleToggle(col.id, 'A')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isA ? 'bg-info-100 text-info-600 ring-1 ring-info-500 font-bold' : 'bg-secondary-200 dark:bg-secondary-700 text-text-subtle hover:bg-secondary-300'}`}
                            >
                                A
                            </button>

                            {/* Pronunciation Toggle */}
                            <button 
                                onClick={() => handleToggle(col.id, 'P')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isP ? 'bg-purple-100 text-purple-600 ring-1 ring-purple-500 font-bold' : 'bg-secondary-200 dark:bg-secondary-700 text-text-subtle hover:bg-secondary-300'}`}
                            >
                                <Icon name="volume-up" className="w-4 h-4"/>
                            </button>

                            {/* Sound Toggle */}
                            <button 
                                onClick={() => handleToggle(col.id, 'S')}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isS ? 'bg-warning-100 text-warning-600 ring-1 ring-warning-500 font-bold' : 'bg-secondary-200 dark:bg-secondary-700 text-text-subtle hover:bg-secondary-300'}`}
                            >
                                <Icon name="music-note" className="w-4 h-4"/>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ColumnMapper;
