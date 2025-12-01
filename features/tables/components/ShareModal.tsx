
import * as React from 'react';
import { Table } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { useTagStore } from '../../../stores/useTagStore';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: Table;
  onShare: (description: string, tags: string) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, table, onShare }) => {
  const { tags: allTags } = useTagStore();
  const [description, setDescription] = React.useState(table.description || '');
  const [tags, setTags] = React.useState('');
  
  React.useEffect(() => {
    if (isOpen) {
      const tagMap = new Map(allTags.map(t => [t.id, t.name]));
      const tagNames = (table.tagIds || []).map(id => tagMap.get(id)).filter(Boolean);
      
      setDescription(table.description || '');
      setTags(tagNames.join(', '));
    }
  }, [isOpen, table, allTags]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Share "${table.name}"`}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            placeholder="Add a brief description..."
            className="w-full bg-slate-100 dark:bg-slate-700 border rounded-md px-3 py-2 text-sm"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (comma-separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
            placeholder="e.g., science, language"
            className="w-full bg-slate-100 dark:bg-slate-700 border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="bg-white dark:bg-slate-700 font-semibold px-4 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600 border">Cancel</button>
          <button onClick={() => onShare(description, tags)} className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-emerald-700">Update & Share</button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareModal;
