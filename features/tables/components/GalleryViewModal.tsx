
import React, { useEffect, useRef } from 'react';
import { Table, VocabRow } from '../../../types';
import Icon from '../../../components/ui/Icon';

interface GalleryCardProps {
  row: VocabRow;
  table: Table;
  isInitial: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
}

const GalleryCard: React.FC<GalleryCardProps> = ({ row, table, isInitial, scrollRef }) => {
  const imageColumnId = table.imageConfig?.imageColumnId;
  const imageUrl = imageColumnId ? row.cols[imageColumnId] : null;

  const stats = row.stats;
  const encounters = stats.correct + stats.incorrect;
  const successRate = encounters > 0 ? (stats.correct / encounters) * 100 : 0;

  return (
    <div ref={isInitial ? scrollRef : null} className="bg-surface dark:bg-secondary-800 border border-secondary-200/80 dark:border-secondary-700/50 rounded-xl shadow-md overflow-hidden flex flex-col animate-fadeIn">
      {imageUrl && (
        <div className="h-40 bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center overflow-hidden">
          <img src={imageUrl} alt="Card image" className="object-contain w-full h-full" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}
      <div className="p-4 flex-grow">
        <ul className="space-y-2">
          {table.columns.map(col => {
            if (col.id === imageColumnId) return null;
            return (
              <li key={col.id}>
                <p className="text-xs font-semibold text-text-subtle">{col.name}</p>
                <p className="text-sm text-text-main dark:text-secondary-100">{row.cols[col.id] || '—'}</p>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200/80 dark:border-secondary-700/50 p-2 flex justify-around text-xs text-text-subtle">
        <span title="Success Rate" className="font-medium">{successRate.toFixed(0)}%</span>
        <span title="Correct" className="text-success-500 font-bold">✓ {stats.correct}</span>
        <span title="Incorrect" className="text-error-500 font-bold">✗ {stats.incorrect}</span>
      </div>
    </div>
  );
};

interface GalleryViewModalProps {
  table: Table;
  initialRowId?: string;
  onClose: () => void;
}

const GalleryViewModal: React.FC<GalleryViewModalProps> = ({ table, initialRowId, onClose }) => {
  const initialCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the initial card after a short delay to allow rendering
    const timer = setTimeout(() => {
      initialCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    return () => clearTimeout(timer);
  }, [initialRowId]);

  return (
    <div className="fixed inset-0 bg-background/80 dark:bg-secondary-900/80 backdrop-blur-sm z-50 flex flex-col animate-fadeIn">
      <header className="flex-shrink-0 bg-surface/80 dark:bg-secondary-800/80 backdrop-blur-md p-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 truncate pr-4">
          Gallery: {table.name}
        </h2>
        <button onClick={onClose} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
          <Icon name="x" className="w-6 h-6" />
        </button>
      </header>
      <div className="flex-grow overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {table.rows.map(row => (
            <GalleryCard 
              key={row.id} 
              row={row} 
              table={table} 
              isInitial={row.id === initialRowId} 
              scrollRef={initialCardRef}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default GalleryViewModal;