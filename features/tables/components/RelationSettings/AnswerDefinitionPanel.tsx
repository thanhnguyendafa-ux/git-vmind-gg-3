
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

    const renderPreviewContent = (text: string) => {
        if (!text || text === '...' || text === '(Empty)') {
            return <span className="font-mono font-bold text-success-600 dark:text-success-400 bg-white dark:bg-black/20 px-1 rounded">{text || '(Empty)'}</span>;
        }

        // Regex for detecting image URLs (standard formats + data URIs)
        const imageRegex = /\.(jpeg|jpg|gif|png|webp)($|\?)/i;
        const urlRegex = /(https?:\/\/[^\s]+|data:image\/[a-zA-Z]+;base64,[^\s]+)/g;

        const isPureImage = urlRegex.test(text) && imageRegex.test(text) && text.split(urlRegex).every(part => !part.trim() || urlRegex.test(part));

        if (isPureImage) {
            // If the entire string is just one or more image URLs (unlikely to have multiple without spaces, but safe to treat as image container)
            // We just grab the first match for simplicity of "Pure Image" preview, or splitting if multiple.
            // For logic preview, usually it's one image.
            const match = text.match(urlRegex);
            if (match && match[0]) {
                 return (
                    <div className="mt-2">
                        <img 
                            src={match[0]} 
                            alt="Preview" 
                            className="max-h-32 rounded-md border border-black/10 dark:border-white/10 object-contain bg-white dark:bg-black/20 shadow-sm" 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    </div>
                );
            }
        }

        // Mixed Content Check
        const parts = text.split(urlRegex);
        const hasImage = parts.some(part => imageRegex.test(part));

        if (hasImage) {
            return (
                <div className="flex flex-col gap-2 items-start mt-1">
                    {parts.map((part, index) => {
                        const isUrl = urlRegex.test(part);
                        // Re-check regex on the specific part to confirm it's an image url
                        const isImg = isUrl && (imageRegex.test(part) || part.startsWith('data:image'));

                        if (isImg) {
                            return (
                                <img 
                                    key={index}
                                    src={part} 
                                    alt="Preview" 
                                    className="max-h-24 rounded-md border border-black/10 dark:border-white/10 object-contain bg-white dark:bg-black/20" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            );
                        }
                        if (!part.trim()) return null;
                        return <span key={index} className="font-mono text-success-800 dark:text-success-200">{part}</span>;
                    })}
                </div>
            );
        }

        // Default Text
        return <span className="font-mono font-bold text-success-600 dark:text-success-400 bg-white dark:bg-black/20 px-1 rounded">{text}</span>;
    };

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
                    <div className="font-semibold text-text-subtle mb-1">Correct Answer:</div>
                    {renderPreviewContent(effectivePreview)}
                </div>
            </div>
        </div>
    );
};

export default AnswerDefinitionPanel;
