import React from 'react';
import { VocabRow } from '../../../types';
import { useConceptStore } from '../../../stores/useConceptStore';

interface ConceptIndicatorCellProps {
    row: VocabRow;
    onDoubleClick?: () => void;
}

const ConceptIndicatorCell: React.FC<ConceptIndicatorCellProps> = ({ row, onDoubleClick }) => {
    const { concepts, conceptLevels } = useConceptStore();

    // Get first concept link
    const firstLevelId = row.conceptLevelIds?.[0] || row.conceptLevelId;

    if (!firstLevelId) {
        return <div className="w-3 h-full" />;
    }

    // Find the level and concept
    const level = conceptLevels.find(l => l.id === firstLevelId);
    const concept = level ? concepts.find(c => c.id === level.conceptId) : null;

    if (!concept || !level) {
        return <div className="w-3 h-full" />;
    }

    // Generate color from concept name (deterministic hash)
    const getConceptColor = (conceptName: string): string => {
        let hash = 0;
        for (let i = 0; i < conceptName.length; i++) {
            hash = conceptName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 60%)`;
    };

    const color = concept.color || getConceptColor(concept.name);
    const tooltipContent = `${concept.name} > ${level.name}`;

    return (
        <div
            className="w-3 h-full flex items-center justify-center cursor-pointer group"
            onDoubleClick={onDoubleClick}
            title={tooltipContent}
        >
            <div
                className="w-2 h-4/5 rounded-sm transition-all group-hover:w-2.5 group-hover:shadow-lg"
                style={{ backgroundColor: color }}
            />
        </div>
    );
};

export default ConceptIndicatorCell;
