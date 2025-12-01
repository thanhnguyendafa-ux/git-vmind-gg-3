
import * as React from 'react';
import { useTagStore } from '../../../stores/useTagStore';
import { getTagStyle } from '../../../utils/colorUtils';
import Popover from '../../../components/ui/Popover';
import RowTagEditor from '../../../components/ui/RowTagEditor';
import { VocabRow, Table, Tag } from '../../../types';
import { useTableStore } from '../../../stores/useTableStore';
import Icon from '../../../components/ui/Icon';

interface TagCellProps {
  row: VocabRow;
  table: Table;
}

const TagCell: React.FC<TagCellProps> = ({ row, table }) => {
  const { tags } = useTagStore();
  const { upsertRow } = useTableStore();
  const [isEditorOpen, setIsEditorOpen] = React.useState(false);

  const rowTags = React.useMemo(() => {
    const tagMap = new Map(tags.map(t => [t.id, t]));
    return (row.tagIds || [])
        .map(id => tagMap.get(id))
        .filter((t): t is Tag => !!t);
  }, [row.tagIds, tags]);

  const handleUpdateTags = (newTagIds: string[]) => {
    const updatedRow = { ...row, tagIds: newTagIds };
    upsertRow(table.id, updatedRow);
  };
  
  const MAX_TAGS_VISIBLE = 2;

  return (
    <div className="flex items-center gap-1">
      <Popover
        isOpen={isEditorOpen}
        setIsOpen={setIsEditorOpen}
        trigger={
            <div className="flex flex-wrap gap-1 items-center cursor-pointer">
              {rowTags.slice(0, MAX_TAGS_VISIBLE).map(tag => (
                <span
                  key={tag.id}
                  style={getTagStyle(tag.name, { [tag.name]: tag.color || '' })}
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                >
                  {tag.name}
                </span>
              ))}
              {rowTags.length > MAX_TAGS_VISIBLE && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary-200 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200">
                  +{rowTags.length - MAX_TAGS_VISIBLE}
                </span>
              )}
               {rowTags.length === 0 && (
                 <div className="w-6 h-5 flex items-center justify-center rounded-md bg-secondary-100 dark:bg-secondary-700/50 group-hover:bg-secondary-200 dark:group-hover:bg-secondary-700">
                    <Icon name="plus" className="w-3 h-3 text-secondary-400"/>
                 </div>
              )}
            </div>
        }
        contentClassName="w-72"
      >
        <RowTagEditor
          tagIds={row.tagIds || []}
          onUpdateTagIds={handleUpdateTags}
        />
      </Popover>
    </div>
  );
};

export default TagCell;