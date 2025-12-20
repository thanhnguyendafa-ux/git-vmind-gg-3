import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { VocabRow } from '../../../types';
import CardPreview from './CardPreview';

interface DraggableCardProps {
    card: VocabRow;
    onClick: () => void;
}

const DraggableCard: React.FC<DraggableCardProps> = ({ card, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'opacity 0.2s ease'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="touch-none"
        >
            <CardPreview card={card} onClick={onClick} />
        </div>
    );
};

export default DraggableCard;
