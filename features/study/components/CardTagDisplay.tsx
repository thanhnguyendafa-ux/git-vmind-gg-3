
import * as React from 'react';
import { useUserStore } from '../../../stores/useUserStore';
import { getTagStyle } from '../../../utils/colorUtils';

interface CardTagDisplayProps {
  tags: string[];
  tagCounts: Map<string, number>;
}

const CardTagDisplay: React.FC<CardTagDisplayProps> = ({ tags, tagCounts }) => {
  const { settings } = useUserStore();

  if (!tags || tags.length === 0) {
    return null;
  }

  return (
    <div className="w-full mt-4 flex-shrink-0">
      <div className="flex flex-wrap gap-2 items-center justify-center">
        {tags.map(tag => (
          <div
            key={tag}
            style={getTagStyle(tag, settings.tagColors || {})}
            className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
          >
            <span>{tag}</span>
            <span className="opacity-75">[{tagCounts.get(tag) || 0}]</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CardTagDisplay;