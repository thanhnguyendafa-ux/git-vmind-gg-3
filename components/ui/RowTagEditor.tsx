import * as React from 'react';
import Icon from './Icon';
import { Input } from './Input';
import { Button } from './Button';
import { getTagStyle } from '../../utils/colorUtils';
import { useUserStore } from '../../stores/useUserStore';
import { useTagStore } from '../../stores/useTagStore';
import { Tag } from '../../types';

interface RowTagEditorProps {
  tagIds: string[];
  onUpdateTagIds: (tagIds: string[]) => void;
}

const RowTagEditor: React.FC<RowTagEditorProps> = ({ tagIds, onUpdateTagIds }) => {
  const [input, setInput] = React.useState('');
  const { settings } = useUserStore();
  const { tags: allTags, findOrCreateTagsByName } = useTagStore();

  const rowTags = React.useMemo(() => {
    const tagMap = new Map(allTags.map(t => [t.id, t]));
    return (tagIds || []).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
  }, [tagIds, allTags]);

  const handleAddTag = () => {
    const newTags = findOrCreateTagsByName([input.trim()]);
    if (newTags.length > 0) {
      const newTagId = newTags[0].id;
      if (!(tagIds || []).includes(newTagId)) {
        onUpdateTagIds([...(tagIds || []), newTagId]);
      }
    }
    setInput('');
  };

  const handleRemoveTag = (tagToRemove: Tag) => {
    onUpdateTagIds((tagIds || []).filter(id => id !== tagToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="p-2 space-y-3">
      <div>
        <label className="text-xs font-bold text-text-subtle">TAGS</label>
        <div className="mt-1 flex flex-wrap gap-1">
          {rowTags.length === 0 ? (
            <span className="text-xs text-text-subtle italic">No tags yet.</span>
          ) : (
            rowTags.map(tag => (
              <span
                key={tag.id}
                style={getTagStyle(tag.name, settings.tagColors || {})}
                className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full animate-fadeIn"
              >
                {tag.name}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="p-3 -mr-2 -my-2 rounded-full text-white/70 hover:text-white hover:bg-black/20"
                  aria-label={`Remove tag ${tag.name}`}
                >
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag..."
          className="flex-1 h-10 text-sm"
        />
        <Button
          size="sm"
          onClick={handleAddTag}
          disabled={!input.trim()}
          aria-label="Add tag"
        >
          <Icon name="plus" className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default RowTagEditor;
