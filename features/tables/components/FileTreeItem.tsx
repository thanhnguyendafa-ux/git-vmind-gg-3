
import * as React from 'react';
import Icon from '../../../components/ui/Icon';

interface FileTreeItemProps {
  label: string;
  icon: string;
  iconColor?: string;
  level: number;
  isExpanded?: boolean;
  isSelected?: boolean;
  hasChildren?: boolean;
  onToggle?: (e: React.MouseEvent) => void;
  onSelect: () => void;
  actions?: React.ReactNode; // For future edit/delete buttons
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({
  label,
  icon,
  iconColor = 'text-secondary-500',
  level,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
  actions,
}) => {
  return (
    <div
      className={`
        group flex items-center gap-1 py-1.5 pr-2 rounded-md cursor-pointer transition-colors select-none
        ${isSelected 
          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-white font-bold' 
          : 'hover:bg-black/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-100 font-medium'
        }
      `}
      style={{ paddingLeft: `${level * 12 + 8}px` }}
      onClick={onSelect}
    >
      {/* Toggle Arrow or Spacer */}
      <div 
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        onClick={(e) => {
             // If it has children, toggle. If not, don't bubble select event if clicking empty space
             if (hasChildren && onToggle) {
                 e.stopPropagation();
                 onToggle(e);
             }
        }}
      >
        {hasChildren && (
          <Icon 
            name="chevron-right" 
            className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
          />
        )}
      </div>

      {/* Main Icon */}
      <Icon 
        name={icon} 
        className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-primary-600 dark:text-primary-400' : iconColor}`} 
        variant={isSelected ? 'filled' : 'outline'}
      />

      {/* Label */}
      <span className="text-sm truncate flex-1 leading-tight">
        {label}
      </span>

      {/* Actions (Hover only) */}
      {actions && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
        </div>
      )}
    </div>
  );
};

export default FileTreeItem;
