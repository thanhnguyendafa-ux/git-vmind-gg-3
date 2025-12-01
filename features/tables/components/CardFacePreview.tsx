
import * as React from 'react';
import { Relation, Table, CardFaceDesign, Column, VocabRow, TypographyDesign, Theme } from '../../../types';
import { DARK_MODE_DEFAULT_TYPOGRAPHY, DEFAULT_TYPOGRAPHY } from '../designConstants';
import { resolveVariables } from '../../../utils/textUtils';

interface CardFacePreviewProps {
    relation: Relation;
    table: Table;
    design: CardFaceDesign;
    columns: Column[];
    sampleRow: VocabRow | null;
    theme: Theme;
    onSelect: (id: string) => void;
    selectedId: string | null;
    isFront: boolean;
}

const CardFacePreview: React.FC<CardFacePreviewProps> = ({ relation, table, design, columns, sampleRow, theme, onSelect, selectedId, isFront }) => {
    const defaultTypo: TypographyDesign = {
        ...(theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY),
        textAlign: 'center',
    };
    
    let background = design.backgroundValue;
    if (design.backgroundType === 'gradient' && design.backgroundValue.includes(',')) {
        const [c1, c2] = design.backgroundValue.split(',');
        background = `linear-gradient(${design.gradientAngle}deg, ${c1}, ${c2})`;
    } else if (design.backgroundType === 'image') {
        background = `url("${design.backgroundValue}") center/cover no-repeat`;
    }
    const cardStyle = { background };

    // Determine elements to render. Use elementOrder if available, otherwise fallback to column IDs.
    const elementsToRender = design.elementOrder && design.elementOrder.length > 0
        ? design.elementOrder
        : (isFront ? relation.questionColumnIds : relation.answerColumnIds);

    return (
        <div style={cardStyle} className="w-full h-full rounded-xl shadow-sm overflow-hidden relative transition-all duration-300 p-6 flex flex-col items-center justify-center gap-2 text-text-main dark:text-secondary-100" onClick={(e) => { e.stopPropagation(); onSelect(''); }}>
            {elementsToRender.map((id) => {
                const isSelected = id === selectedId;
                const wrapperClass = `cursor-pointer border-2 rounded px-2 py-1 w-full max-w-xs transition-all ${isSelected ? 'border-primary-500 bg-primary-500/10 shadow-sm scale-105' : 'border-transparent hover:border-primary-300/30'}`;
                
                // Case 1: Column Label
                if (id.startsWith('label-')) {
                    const colId = id.replace('label-', '');
                    const col = columns.find(c => c.id === colId);
                    if (!col) return null;
                    
                    // Use specific typography for this label if set, else default fallback
                    const typo = design.typography[id] || { ...defaultTypo, fontSize: '0.75rem', fontWeight: 'bold', opacity: 0.7 };
                    
                    return (
                        <div key={id} onClick={(e) => { e.stopPropagation(); onSelect(id); }} className={wrapperClass}>
                            <div style={typo} className="w-full break-words">
                                {col.name}
                            </div>
                        </div>
                    );
                }

                // Case 2: Static Text Box
                const txtBox = design.textBoxes?.find(t => t.id === id);
                if (txtBox) {
                    // Resolve variables in the text (e.g., {Meaning} -> "A fruit")
                    const resolvedText = resolveVariables(txtBox.text, sampleRow, columns);
                    return (
                        <div key={id} onClick={(e) => { e.stopPropagation(); onSelect(id); }} className={wrapperClass}>
                             <div style={txtBox.typography} className="w-full break-words">
                                {resolvedText}
                            </div>
                        </div>
                    );
                }

                // Case 3: Column Data (Fallback)
                const col = columns.find(c => c.id === id);
                if (col) {
                    const dataValue = sampleRow?.cols[id] || `[${col.name} Data]`;
                    const typo = design.typography[id] || defaultTypo;
                    return (
                        <div key={id} onClick={(e) => { e.stopPropagation(); onSelect(id); }} className={wrapperClass}>
                            <div style={typo} className="w-full break-words">
                                {dataValue}
                            </div>
                        </div>
                    );
                }

                return null;
            })}
            {elementsToRender.length === 0 && <p className="text-text-subtle text-sm italic">Empty Card Face</p>}
        </div>
    );
};

export default CardFacePreview;
