
import * as React from 'react';
import { Table, Relation, VocabRow } from '../../../../types';
import { evaluateFormula } from '../../../../utils/textUtils';
import { Button } from '../../../../components/ui/Button';

interface AnswerDefinitionPanelProps {
    table: Table;
    relation: Relation;
    onChange: (updatedRelation: Relation) => void;
    sampleRow?: VocabRow | null;
}

const AnswerDefinitionPanel: React.FC<AnswerDefinitionPanelProps> = ({ table, relation, onChange, sampleRow }) => {
    const [formula, setFormula] = React.useState(relation.answerFormula || '');
    
    const handleFormulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFormula(val);
        onChange({ ...relation, answerFormula: val });
    };

    const insertColumn = (colName: string) => {
        const newFormula = `${formula}{${colName}}`;
        setFormula(newFormula);
        onChange({ ...relation, answerFormula: newFormula });
    };
    
    const previewResult = sampleRow ? evaluateFormula(formula, sampleRow, table.columns) : '...';
    
    // If no formula, show what legacy behavior would produce
    const effectivePreview = formula 
        ? previewResult 
        : (sampleRow ? relation.answerColumnIds.map(id => sampleRow.cols[id]).filter(Boolean).join(' / ') : '');

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-secondary-50 dark:bg-secondary-800/50 p-4 rounded-lg border border-secondary-200 dark:border-secondary-700">
                <h4 className="text-xs font-bold text-text-subtle uppercase mb-3">Answer Logic</h4>
                
                <div>
                    <label className="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                        Answer Formula <span className="text-text-subtle font-normal">(Pattern to check against)</span>
                    </label>
                    <input 
                        type="text" 
                        value={formula} 
                        onChange={handleFormulaChange}
                        placeholder="{Word} ({Definition})"
                        className="w-full bg-white dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {table.columns.map(col => (
                            <button 
                                key={col.id} 
                                onClick={() => insertColumn(col.name)}
                                className="px-2 py-1 text-xs bg-secondary-200 dark:bg-secondary-700 rounded-full hover:bg-secondary-300 dark:hover:bg-secondary-600 transition-colors"
                            >
                                + {col.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-100 dark:border-primary-800">
                <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase mb-2">Logic Preview</h4>
                <div className="text-sm">
                    <p>
                        <span className="font-semibold text-text-subtle">Correct Answer:</span> <span className="font-mono font-bold text-success-600 dark:text-success-400 bg-white dark:bg-black/20 px-1 rounded">{effectivePreview || '(Empty)'}</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AnswerDefinitionPanel;
