import * as React from 'react';
import { VocabRow, Table } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { getPriorityScore, getRankPoint, getLevel } from '../../../utils/priorityScore';

interface WordInfoModalProps {
  row: VocabRow | null;
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const WordInfoModal: React.FC<WordInfoModalProps> = ({ row, table, isOpen, onClose, onEdit }) => {
  const [isStatsExpanded, setIsStatsExpanded] = React.useState(false);

  // Hooks must render unconditionally
  // Use optional chaining because row can be null here
  // const contextLinks = useContextLinks(row?.id); // REMOVED redundant legacy links

  const maxInQueue = React.useMemo(() => {
    if (!table || !table.rows) return 0;
    return Math.max(1, ...table.rows.map(r => r.stats.inQueueCount || 0));
  }, [table]);

  if (!isOpen || !row) return null;

  const imageColumnId = table.imageConfig?.imageColumnId;
  const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;

  const stats = row.stats;
  const encounters = stats.correct + stats.incorrect;
  const successRate = encounters > 0 ? (stats.correct / encounters) * 100 : 0;
  const lastStudied = stats.lastStudied ? new Date(stats.lastStudied).toLocaleString() : 'Never';

  const ankiEaseFactor = stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '—';
  const ankiInterval = stats.ankiInterval ? `${stats.ankiInterval}d` : '—';
  const ankiDueDate = stats.ankiDueDate ? new Date(stats.ankiDueDate).toISOString().split('T')[0] : '—';

  const priorityScore = getPriorityScore(row, maxInQueue).toFixed(2);
  const rankPoint = getRankPoint(row);
  const level = getLevel(row);
  const lastPracticeDate = stats.lastPracticeDate ? new Date(stats.lastPracticeDate).toLocaleString() : 'Never';


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Word Information"
      containerClassName="max-w-2xl w-full md:w-[600px] lg:w-[700px] mx-4"
    >
      <div className="p-4 sm:p-6 max-h-[85vh] overflow-y-auto">
        <div className="bg-surface dark:bg-secondary-800 rounded-lg shadow-md overflow-hidden border border-secondary-200 dark:border-secondary-700">
          {imageUrl && (
            <div className="h-40 bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center overflow-hidden">
              <img src={imageUrl} alt="Card image" className="object-contain w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            </div>
          )}
          <div className="p-4 space-y-3">
            {table.columns.map(col => {
              if (col.id === imageColumnId) return null;
              return (
                <div key={col.id}>
                  <p className="text-xs font-semibold text-text-subtle uppercase tracking-wide">{col.name}</p>
                  <p className="text-lg text-text-main dark:text-secondary-100 whitespace-pre-wrap leading-relaxed">{row.cols[col.id] || '—'}</p>
                </div>
              );
            })}
          </div>

          {/* Collapsible Stats Section */}
          <div className="bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 transition-all duration-300">
            <button
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              <h4 className="text-sm font-bold text-text-subtle">Statistics & Progress</h4>
              <Icon name={isStatsExpanded ? "chevron-up" : "chevron-down"} className="w-4 h-4 text-text-subtle" />
            </button>

            {isStatsExpanded && (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                  {/* Basic Stats */}
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Success Rate:</span> <span className="font-semibold">{successRate.toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span>Encounters:</span> <span className="font-semibold">{encounters}</span></div>
                    <div className="flex justify-between"><span>Correct:</span> <span className="font-semibold text-success-600">{stats.correct}</span></div>
                    <div className="flex justify-between"><span>Incorrect:</span> <span className="font-semibold text-error-600">{stats.incorrect}</span></div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between"><span>Level:</span> <span className="font-semibold">{level} / 6</span></div>
                    <div className="flex justify-between"><span>Rank Point:</span> <span className="font-semibold">{rankPoint}</span></div>
                    <div className="flex justify-between"><span>Last Studied:</span> <span className="font-semibold text-xs text-right">{lastStudied}</span></div>
                  </div>
                </div>

                {/* Advanced Stats Details */}
                <div className="pt-2 mt-2 border-t border-secondary-200 dark:border-secondary-700">
                  <h5 className="text-xs font-bold text-text-subtle mb-2 mt-1">Advanced Metrics</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex justify-between"><span>Priority Score:</span> <span className="font-mono">{priorityScore}</span></div>
                    <div className="flex justify-between"><span>Scramble:</span> <span>{stats.scrambleEncounters ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Theater:</span> <span>{stats.theaterEncounters ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Queue:</span> <span>{stats.inQueueCount ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Quit:</span> <span>{row.stats.wasQuit ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>

                {/* Anki SRS */}
                <div className="pt-2 mt-2 border-t border-secondary-200 dark:border-secondary-700">
                  <h5 className="text-xs font-bold text-text-subtle mb-2 mt-1">Spacer Repetition (Anki)</h5>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div className="flex justify-between"><span>Repetitions:</span> <span>{stats.ankiRepetitions ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Ease:</span> <span>{ankiEaseFactor}</span></div>
                    <div className="flex justify-between"><span>Interval:</span> <span>{ankiInterval}</span></div>
                    <div className="flex justify-between"><span>Due:</span> <span>{ankiDueDate}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={onEdit}>
          <Icon name="pencil" className="w-4 h-4 mr-2" />
          Edit
        </Button>
      </div>

    </Modal>
  );
};

export default WordInfoModal;