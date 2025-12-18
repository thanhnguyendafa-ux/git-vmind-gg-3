
import * as React from 'react';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';
import { gradients, getTagStyle } from '../../../utils/colorUtils';
import { Tag } from '../../../types';

interface TagFilterItemProps {
  tag: Tag;
  isChecked: boolean;
  onToggle: () => void;
  onColorChange: (tag: string, color: string) => void;
  customColors: Record<string, string>;
  count: number;
}

const TagFilterItem: React.FC<TagFilterItemProps> = ({ tag, isChecked, onToggle, onColorChange, customColors, count }) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = React.useState(false);
  const tagStyle = getTagStyle(tag.name, customColors);

  const handleColorSelect = (color: string) => {
    onColorChange(tag.name, color);
    setIsColorPickerOpen(false);
  };

  return (
    <div className="flex items-center justify-between p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
      <label className="flex items-center gap-2 cursor-pointer flex-grow">
        <input type="checkbox" checked={isChecked} onChange={onToggle} className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-black/20" />
        <span style={tagStyle} className="text-xs font-bold px-2 py-1 rounded-full border border-black/5 shadow-sm">
            {tag.name}
            {count > 0 && <span className="ml-1.5 font-normal opacity-75">[{count}]</span>}
        </span>
      </label>
      <Popover
        isOpen={isColorPickerOpen}
        setIsOpen={setIsColorPickerOpen}
        trigger={
          <button className="p-1 text-slate-400 hover:text-primary-500 dark:text-slate-500 dark:hover:text-white">
            <Icon name="palette" className="w-4 h-4" />
          </button>
        }
        contentClassName="w-40"
      >
        <div className="grid grid-cols-4 gap-2">
          {gradients.map((gradient, index) => (
            <button
              key={index}
              onClick={() => handleColorSelect(gradient)}
              className="w-8 h-8 rounded-full border border-black/10"
              style={{ background: gradient }}
              title={`Select color ${index + 1}`}
            />
          ))}
        </div>
      </Popover>
    </div>
  );
};

export default TagFilterItem;
