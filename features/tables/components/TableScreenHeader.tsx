
import * as React from 'react';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';
import { getTagStyle } from '../../../utils/colorUtils';
import { useTagStore } from '../../../stores/useTagStore';
import { Tag } from '../../../types';

// FIX: Removed 'Scramble' as it is an obsolete navigation mode.
type StudyNavigationMode = 'StudySession' | 'Confidence' | 'Theater';

interface TableScreenHeaderProps {
  tableName: string;
  isGuest: boolean;
  isPublic?: boolean;
  tagIds: string[];
  tagColors: Record<string, string>;
  onBack: () => void;
  onUpdateName: (newName: string) => void;
  onShareClick: () => void;
  onStudyClick: (mode: StudyNavigationMode) => void;
  onUpdateTagIds: (tagIds: string[]) => void;
}

const TableScreenHeader: React.FC<TableScreenHeaderProps> = ({
  tableName,
  isGuest,
  isPublic,
  tagIds,
  tagColors,
  onBack,
  onUpdateName,
  onShareClick,
  onStudyClick,
  onUpdateTagIds,
}) => {
    const [isStudyOptionsOpen, setIsStudyOptionsOpen] = React.useState(false);
    const [isEditingTags, setIsEditingTags] = React.useState(false);
    const [tagInput, setTagInput] = React.useState('');
    const tagInputRef = React.useRef<HTMLInputElement>(null);
    const editorRef = React.useRef<HTMLDivElement>(null);
    
    const { tags: allTags, findOrCreateTagsByName } = useTagStore();

    const displayTags = React.useMemo(() => {
        const tagMap = new Map(allTags.map(t => [t.id, t]));
        return (tagIds || []).map(id => tagMap.get(id)).filter((t): t is Tag => !!t);
    }, [tagIds, allTags]);

    React.useEffect(() => {
        if (isEditingTags) {
            tagInputRef.current?.focus();
        }
    }, [isEditingTags]);

    const handleAddTag = () => {
        const newTags = findOrCreateTagsByName([tagInput.trim()]);
        if (newTags.length > 0) {
            const newTagId = newTags[0].id;
            if (!tagIds.includes(newTagId)) {
                onUpdateTagIds([...tagIds, newTagId]);
            }
        }
        setTagInput('');
    };
    
    const handleRemoveTag = (tagToRemove: Tag) => {
        onUpdateTagIds(tagIds.filter(id => id !== tagToRemove.id));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        } else if (e.key === 'Escape') {
            setIsEditingTags(false);
        } else if (e.key === 'Backspace' && tagInput === '' && displayTags.length > 0) {
            handleRemoveTag(displayTags[displayTags.length - 1]);
        }
    };
    
    const handleEditorBlur = (e: React.FocusEvent<HTMLDivElement>) => {
        if (!editorRef.current?.contains(e.relatedTarget as Node)) {
            setIsEditingTags(false);
            setTagInput('');
        }
    };


    const studyOptions = [
        { label: 'Confidence', mode: 'Confidence' as StudyNavigationMode, icon: 'flashcards' },
        { label: 'Theater', mode: 'Theater' as StudyNavigationMode, icon: 'film' },
    ];
    
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
      <div className="flex items-start gap-2 flex-1">
        <button onClick={onBack} className="p-2 rounded-full text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-1">
          <Icon name="arrowLeft" className="w-6 h-6" />
        </button>
        <div className="flex-1">
            <input
                type="text"
                value={tableName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateName(e.target.value)}
                className="text-2xl font-bold bg-transparent focus:outline-none focus:bg-white dark:focus:bg-slate-800 w-full rounded-md p-1 -m-1 text-slate-800 dark:text-white"
            />
            <div
                ref={editorRef}
                onBlur={handleEditorBlur}
                tabIndex={-1}
                onClick={() => setIsEditingTags(true)}
                className={`mt-2 flex flex-wrap items-center gap-2 min-h-[34px] p-1 rounded-lg transition-colors ${isEditingTags ? 'bg-surface dark:bg-secondary-900/50 ring-2 ring-primary-500' : 'hover:bg-secondary-100/50 dark:hover:bg-secondary-800/50'}`}
            >
              {displayTags.map(tag => (
                  <span
                      key={tag.id}
                      style={getTagStyle(tag.name, tagColors)}
                      className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full animate-fadeIn"
                  >
                      {tag.name}
                      {isEditingTags && (
                          <button
                              onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}
                              className="text-white/70 hover:text-white"
                          >
                              <Icon name="x" className="w-3 h-3"/>
                          </button>
                      )}
                  </span>
              ))}
              {isEditingTags ? (
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 text-sm bg-transparent focus:outline-none min-w-[80px]"
                    placeholder="Add tag..."
                  />
              ) : (
                  displayTags.length === 0 && <span className="text-xs text-text-subtle italic px-1">No tags. Click to add.</span>
              )}
            </div>
        </div>
      </div>
      <div className="flex gap-2 self-start">
        {!isGuest && (
          <button onClick={onShareClick} className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold px-4 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 transition-colors flex items-center gap-2 text-sm">
            <Icon name="arrow-up-tray" className="w-4 h-4" />
            <span>{isPublic ? 'Sharing Settings' : 'Share'}</span>
          </button>
        )}
        <div className="flex rounded-md shadow-sm">
            <button 
                onClick={() => onStudyClick('StudySession')}
                className="relative inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary-600 rounded-l-md hover:bg-primary-700 focus:z-10 focus:ring-2 focus:ring-primary-500"
            >
                <Icon name="brain" className="w-4 h-4" />
                Study Session
            </button>
            <Popover
                isOpen={isStudyOptionsOpen}
                setIsOpen={setIsStudyOptionsOpen}
                trigger={
                    <button
                        type="button"
                        className="relative -ml-px inline-flex items-center bg-primary-600 p-2 text-white rounded-r-md hover:bg-primary-700 focus:z-10 focus:ring-2 focus:ring-primary-500"
                    >
                        <Icon name="chevron-down" className="h-5 w-5" />
                    </button>
                }
                contentClassName="w-48"
            >
                <div className="py-1">
                    {studyOptions.map((option) => (
                        <button
                            key={option.mode}
                            onClick={() => {
                                onStudyClick(option.mode);
                                setIsStudyOptionsOpen(false);
                            }}
                            className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-text-main dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                            <Icon name={option.icon} className="w-5 h-5 text-text-subtle"/>
                            {option.label}
                        </button>
                    ))}
                </div>
            </Popover>
        </div>
      </div>
    </header>
  );
};

export default TableScreenHeader;
