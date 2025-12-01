import * as React from 'react';
import { Column, Table } from '../../../types';
import { getTagStyle } from '../../../utils/colorUtils';
import { useUserStore } from '../../../stores/useUserStore';
import Icon from '../../../components/ui/Icon';

interface RichCellProps {
  value: string;
  column: Column;
  table: Table;
  isTextWrapEnabled: boolean;
  fontSizeClasses: string;
}

const isUrl = (text: string) => /^(https?:\/\/)/.test(text);

const getPosColor = (pos: string) => {
    const lowerPos = pos.toLowerCase();
    if (lowerPos.includes('noun')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    if (lowerPos.includes('verb')) return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    if (lowerPos.includes('adjective')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    if (lowerPos.includes('adverb')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
    return 'bg-secondary-200 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200';
};

export const RichCell: React.FC<RichCellProps> = ({ value, column, table, isTextWrapEnabled, fontSizeClasses }) => {
    const { settings } = useUserStore();
    const isImageColumn = table.imageConfig?.imageColumnId === column.id;
    const isTagColumn = /tags?/i.test(column.name);
    const isPosColumn = /part of speech/i.test(column.name);

    // Image Renderer
    if (isImageColumn && value) {
        return (
            <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary-100 dark:bg-secondary-700 border border-border flex items-center justify-center">
                <img
                    src={value}
                    alt={column.name}
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
            </div>
        );
    }

    // Tag Renderer
    if (isTagColumn && value) {
        const tags = value.split(',').map(t => t.trim()).filter(Boolean);
        return (
            <div className="flex flex-wrap gap-1">
                {tags.map(tag => (
                    <span
                        key={tag}
                        style={getTagStyle(tag, settings.tagColors || {})}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                    >
                        {tag}
                    </span>
                ))}
            </div>
        );
    }
    
    // Part of Speech Renderer
    if (isPosColumn && value) {
        return (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${getPosColor(value)}`}>
                {value}
            </span>
        );
    }

    // URL Renderer
    if (isUrl(value)) {
        return (
            <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1.5 ${fontSizeClasses}`}
            >
                <span className="truncate">{value}</span>
                <Icon name="arrowRight" className="w-3 h-3 flex-shrink-0 transform -rotate-45" />
            </a>
        );
    }

    // Default Text Renderer
    return (
        <div className={`${fontSizeClasses} ${isTextWrapEnabled ? 'whitespace-normal break-words' : 'truncate'}`}>
            {value}
        </div>
    );
};

export default RichCell;
