import * as React from 'react';
import { VocabRow, Table } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { getPriorityScore, getRankPoint, getLevel } from '../../../utils/priorityScore';
import { useContextLinks } from '../../../hooks/useContextLinks';
import ContextViewer from '../../study/components/ContextViewer';

interface WordInfoModalProps {
  row: VocabRow | null;
  table: Table;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const WordInfoModal: React.FC<WordInfoModalProps> = ({ row, table, isOpen, onClose, onEdit }) => {
  if (!isOpen || !row) return null;

  const contextLinks = useContextLinks(row.id);

  const imageColumnId = table.imageConfig?.imageColumnId;
  const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;

  const stats = row.stats;
  const encounters = stats.correct + stats.incorrect;
  const successRate = encounters > 0 ? (stats.correct / encounters) * 100 : 0;
  const lastStudied = stats.lastStudied ? new Date(stats.lastStudied).toLocaleString() : 'Never';

  const ankiEaseFactor = stats.ankiEaseFactor ? `${Math.round(stats.ankiEaseFactor * 100)}%` : '—';
  const ankiInterval = stats.ankiInterval ? `${stats.ankiInterval}d` : '—';
  const ankiDueDate = stats.ankiDueDate ? new Date(stats.ankiDueDate).toISOString().split('T')[0] : '—';
  
  const maxInQueue = React.useMemo(() => Math.max(1, ...table.rows.map(r => r.stats.inQueueCount || 0)), [table.rows]);
  const priorityScore = getPriorityScore(row, maxInQueue).toFixed(2);
  const rankPoint = getRankPoint(row);
  const level = getLevel(row);
  const lastPracticeDate = stats.lastPracticeDate ? new Date(stats.lastPracticeDate).toLocaleString() : 'Never';


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Word Information" containerClassName="max-w-md w-full">
      <div className="p-4 sm:p-6">
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
                        <p className="text-xs font-semibold text-text-subtle">{col.name}</p>
                        <p className="text-base text-text-main dark:text-secondary-100 whitespace-pre-wrap">{row.cols[col.id] || '—'}</p>
                    </div>
                    );
                })}
            </div>
            <div className="bg-secondary-50 dark:bg-secondary-900/50 p-4 border-t border-secondary-200 dark:border-secondary-700">
                <h4 className="text-sm font-bold text-text-subtle mb-2">Statistics</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Success Rate:</span> <span className="font-semibold">{successRate.toFixed(0)}%</span></div>
                    <div className="flex justify-between"><span>Encounters:</span> <span className="font-semibold">{encounters}</span></div>
                    <div className="flex justify-between"><span>Correct:</span> <span className="font-semibold text-success-600">{stats.correct}</span></div>
                    <div className="flex justify-between"><span>Incorrect:</span> <span className="font-semibold text-error-600">{stats.incorrect}</span></div>
                    <div className="flex justify-between"><span>Last Studied:</span> <span className="font-semibold text-xs">{lastStudied}</span></div>
                    
                    {/* Study Session Details */}
                    <div className="pt-2 mt-2 border-t border-secondary-200 dark:border-secondary-700">
                        <h5 className="text-xs font-bold text-text-subtle mb-1">Advanced Study Stats</h5>
                    </div>
                    <div className="flex justify-between"><span>Priority Score:</span> <span className="font-semibold">{priorityScore}</span></div>
                    <div className="flex justify-between"><span>Rank Point:</span> <span className="font-semibold">{rankPoint}</span></div>
                    <div className="flex justify-between"><span>Mastery Level:</span> <span className="font-semibold">{level} / 6</span></div>
                    <div className="flex justify-between"><span>Last Practice:</span> <span className="font-semibold text-xs">{lastPracticeDate}</span></div>
                    <div className="flex justify-between"><span>Scramble Encounters:</span> <span className="font-semibold">{stats.scrambleEncounters ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Theater Encounters:</span> <span className="font-semibold">{stats.theaterEncounters ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Times in Queue:</span> <span className="font-semibold">{stats.inQueueCount ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Quit Mid-session:</span> <span className="font-semibold">{row.stats.wasQuit ? 'Yes' : 'No'}</span></div>

                    {/* Anki SRS */}
                    <div className="pt-2 mt-2 border-t border-secondary-200 dark:border-secondary-700">
                        <h5 className="text-xs font-bold text-text-subtle mb-1">Anki SRS</h5>
                    </div>
                    <div className="flex justify-between"><span>Repetitions:</span> <span className="font-semibold">{stats.ankiRepetitions ?? '—'}</span></div>
                    <div className="flex justify-between"><span>Ease Factor:</span> <span className="font-semibold">{ankiEaseFactor}</span></div>
                    <div className="flex justify-between"><span>Interval:</span> <span className="font-semibold">{ankiInterval}</span></div>
                    <div className="flex justify-between"><span>Next Due:</span> <span className="font-semibold">{ankiDueDate}</span></div>
                </div>
            </div>
        </div>
      </div>
      <div className="p-4 bg-secondary-50 dark:bg-secondary-900/50 border-t border-secondary-200 dark:border-secondary-700 flex items-center gap-2">
        <div>
            <ContextViewer links={contextLinks} />
        </div>
        <div className="flex-grow" /> {/* Spacer */}
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button onClick={onEdit}>
            <Icon name="pencil" className="w-4 h-4 mr-2"/>
            Edit
        </Button>
      </div>
    </Modal>
  );
};

export default WordInfoModal;