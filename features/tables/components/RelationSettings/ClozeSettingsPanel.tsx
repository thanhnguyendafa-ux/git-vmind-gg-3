
import * as React from 'react';
import { Table, Relation } from '../../../../types';
import Icon from '../../../../components/ui/Icon';

interface ClozeSettingsPanelProps {
    table: Table;
    relation: Relation;
    onChange: (updatedRelation: Relation) => void;
}

const ClozeSettingsPanel: React.FC<ClozeSettingsPanelProps> = ({ table, relation, onChange }) => {
    const [isSelectingExtra, setIsSelectingExtra] = React.useState(false);

    // Auto-detect columns if not set
    React.useEffect(() => {
        if (relation.questionColumnIds.length === 0 && table.columns.length > 0) {
            // First column usually 'Sentence' or similar for Cloze
            handleColumnChange('question', table.columns[0].id);
        }
        if (relation.answerColumnIds.length === 0 && table.columns.length > 1) {
            // Second column usually 'Target Word'
            handleColumnChange('answer', table.columns[1].id);
        }
    }, []);

    const handleColumnChange = (type: 'question' | 'answer', colId: string) => {
        const oldColId = type === 'question' ? relation.questionColumnIds[0] : relation.answerColumnIds[0];
        const newRel = JSON.parse(JSON.stringify(relation));

        if (type === 'question') {
            newRel.questionColumnIds = [colId];
            // Update Design Front Face: Replace old column ID with new one in elementOrder
            if (newRel.design?.front) {
                // Ensure elementOrder array exists
                if (!newRel.design.front.elementOrder) {
                    newRel.design.front.elementOrder = [];
                }

                const idx = newRel.design.front.elementOrder.indexOf(oldColId);
                if (idx !== -1) {
                    // Swap: Replace old column with new column in place
                    newRel.design.front.elementOrder[idx] = colId;
                    
                    // Transfer Typography to preserve styling
                    if (newRel.design.front.typography && newRel.design.front.typography[oldColId]) {
                        newRel.design.front.typography[colId] = { ...newRel.design.front.typography[oldColId] };
                        delete newRel.design.front.typography[oldColId];
                    }
                } else {
                    // Insert: Prepend to top if not present (Auto-Inject Context)
                    newRel.design.front.elementOrder.unshift(colId);
                }
            }
        } else {
            newRel.answerColumnIds = [colId];
             // Update Design Back Face
            if (newRel.design?.back) {
                if (!newRel.design.back.elementOrder) {
                    newRel.design.back.elementOrder = [];
                }

                const idx = newRel.design.back.elementOrder.indexOf(oldColId);
                if (idx !== -1) {
                    newRel.design.back.elementOrder[idx] = colId;
                     // Transfer Typography
                    if (newRel.design.back.typography && newRel.design.back.typography[oldColId]) {
                        newRel.design.back.typography[colId] = { ...newRel.design.back.typography[oldColId] };
                        delete newRel.design.back.typography[oldColId];
                    }
                } else {
                    newRel.design.back.elementOrder.unshift(colId);
                }
            }
        }
        onChange(newRel);
    };

    const handleConfigChange = (key: 'hint', value: string) => {
        const config = relation.clozeConfig || { hint: 'wordCount', contextBefore: 0, contextAfter: 0 };
        onChange({ 
            ...relation, 
            clozeConfig: { ...config, [key]: value } 
        });
    };
    
    const handleExtraInfoChange = (colId: string | undefined) => {
        const config = relation.clozeConfig || { hint: 'wordCount', contextBefore: 0, contextAfter: 0 };
        onChange({ 
            ...relation, 
            clozeConfig: { ...config, extraInfoColId: colId } 
        });
        setIsSelectingExtra(false);
    };

    const extraInfoColName = relation.clozeConfig?.extraInfoColId 
        ? table.columns.find(c => c.id === relation.clozeConfig?.extraInfoColId)?.name 
        : null;

    // Filter out columns already used for Q/A to avoid redundancy in "Extra Info"
    const availableForExtra = table.columns.filter(c => 
        !relation.questionColumnIds.includes(c.id) && 
        !relation.answerColumnIds.includes(c.id)
    );

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg border border-purple-200 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-3">
                    <Icon name="puzzle-piece" className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h4 className="text-sm font-bold text-purple-800 dark:text-purple-200 uppercase">Cloze Configuration</h4>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-text-subtle mb-1 flex items-center gap-1.5">
                            <Icon name="table-cells" className="w-3 h-3 opacity-50" />
                            Sentence Column
                        </label>
                        <div className="relative">
                            <select 
                                value={relation.questionColumnIds[0] || ''} 
                                onChange={(e) => handleColumnChange('question', e.target.value)}
                                className="w-full bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-md px-3 py-2 text-sm text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            >
                                 <option value="" disabled>Select Sentence Column</option>
                                 {table.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                            </select>
                        </div>
                        <p className="text-[10px] text-text-subtle mt-1 opacity-70">
                            Primary context. Must contain the full sentence.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-text-subtle mb-1 flex items-center gap-1.5">
                             <Icon name="tag" className="w-3 h-3 opacity-50" />
                            Target Word Column
                        </label>
                        <div className="relative">
                            <select 
                                value={relation.answerColumnIds[0] || ''} 
                                onChange={(e) => handleColumnChange('answer', e.target.value)}
                                className="w-full bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-md px-3 py-2 text-sm text-text-main dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            >
                                 <option value="" disabled>Select Target Column</option>
                                 {table.columns.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                            </select>
                        </div>
                         <p className="text-[10px] text-text-subtle mt-1 opacity-70">
                            The word to extract and test.
                        </p>
                    </div>
                    
                    {/* Extra Info Section */}
                    <div className="pt-2 border-t border-purple-200 dark:border-purple-800/30 mt-2">
                        {extraInfoColName ? (
                             <div>
                                <label className="block text-xs font-semibold text-text-subtle mb-1">Extra Information</label>
                                <div className="flex items-center gap-2 bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm">
                                    <span className="flex-1 truncate font-medium text-success-600 dark:text-success-400">
                                        Field: {extraInfoColName}
                                    </span>
                                    <button 
                                        onClick={() => handleExtraInfoChange(undefined)}
                                        className="text-text-subtle hover:text-error-500 transition-colors"
                                        title="Remove Extra Info"
                                    >
                                        <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : isSelectingExtra ? (
                            <div className="animate-fade-in-up">
                                <label className="block text-xs font-semibold text-text-subtle mb-1">Select Field for Extra Info</label>
                                <select 
                                    onChange={(e) => handleExtraInfoChange(e.target.value)}
                                    className="w-full bg-white dark:bg-secondary-900 border border-success-300 dark:border-success-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-success-500 outline-none"
                                    defaultValue=""
                                    autoFocus
                                >
                                     <option value="" disabled>Choose a column...</option>
                                     {availableForExtra.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
                                </select>
                                <button onClick={() => setIsSelectingExtra(false)} className="text-xs text-text-subtle mt-1 hover:underline">Cancel</button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsSelectingExtra(true)}
                                className="flex items-center gap-1.5 text-xs font-bold text-success-600 dark:text-success-400 hover:text-success-700 dark:hover:text-success-300 transition-colors"
                            >
                                <Icon name="plus" className="w-4 h-4" />
                                Add Extra Info (e.g. Translation)
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-secondary-50 dark:bg-secondary-800/50 p-4 rounded-lg border border-secondary-200 dark:border-secondary-700">
                <h4 className="text-xs font-bold text-text-subtle uppercase mb-3">Hint Style</h4>
                <div className="flex gap-2">
                     <button 
                        onClick={() => handleConfigChange('hint', 'none')}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md border transition-all ${relation.clozeConfig?.hint === 'none' ? 'bg-purple-100 text-purple-700 border-purple-500' : 'bg-white dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600'}`}
                    >
                        [ ... ]
                     </button>
                     <button 
                        onClick={() => handleConfigChange('hint', 'wordCount')}
                        className={`flex-1 py-2 px-3 text-xs font-semibold rounded-md border transition-all ${relation.clozeConfig?.hint === 'wordCount' ? 'bg-purple-100 text-purple-700 border-purple-500' : 'bg-white dark:bg-secondary-700 border-secondary-300 dark:border-secondary-600'}`}
                    >
                        [ 3 words ]
                     </button>
                </div>
            </div>
        </div>
    );
};

export default ClozeSettingsPanel;
