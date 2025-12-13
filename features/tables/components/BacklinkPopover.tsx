
import * as React from 'react';
import { ConfidenceProgress, Screen, FlashcardStatus } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';
import Icon from '../../../components/ui/Icon';
import Popover from '../../../components/ui/Popover';

interface BacklinkPopoverProps {
  usedBy: ConfidenceProgress[];
}

const BacklinkPopover: React.FC<BacklinkPopoverProps> = ({ usedBy }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { setCurrentScreen } = useUIStore();

  const handleNavigate = (e: React.MouseEvent) => {
      e.stopPropagation();
      setCurrentScreen(Screen.Confidence);
      // In a future update, we can pass a specific ID to highlight/scroll to
  };

  if (usedBy.length === 0) return null;

  return (
    <Popover
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
            className="flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-[10px] font-bold uppercase tracking-wide hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors border border-amber-200 dark:border-amber-800"
            title="View linked study sets"
        >
            <Icon name="link" className="w-3 h-3" />
            <span>{usedBy.length} {usedBy.length === 1 ? 'Set' : 'Sets'}</span>
        </button>
      }
      contentClassName="w-64"
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-secondary-200 dark:border-secondary-700">
            <span className="text-xs font-bold text-text-subtle uppercase">Used In</span>
            <Icon name="stack-of-cards" className="w-4 h-4 text-amber-500" />
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
            {usedBy.map(progress => {
                const total = progress.queue.length;
                // Updated Logic: Count any card that is not 'New' as part of the learning progress (including 'Again')
                const learned = Object.values(progress.cardStates || {})
                    .filter(status => status !== FlashcardStatus.New).length;
                const pct = total > 0 ? (learned / total) * 100 : 0;

                return (
                    <button 
                        key={progress.id}
                        onClick={handleNavigate}
                        className="w-full text-left p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors group"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm text-text-main dark:text-secondary-100 truncate flex-1 pr-2">
                                {progress.name}
                            </span>
                            <Icon name="arrowRight" className="w-3 h-3 text-text-subtle opacity-0 group-hover:opacity-100 transition-opacity -rotate-45" />
                        </div>
                        <div className="w-full h-1 bg-secondary-200 dark:bg-secondary-600 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-text-subtle">{learned}/{total} learned</span>
                            <span className="text-[10px] text-text-subtle font-mono">{Math.round(pct)}%</span>
                        </div>
                    </button>
                );
            })}
        </div>
      </div>
    </Popover>
  );
};

export default BacklinkPopover;
