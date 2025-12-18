
import * as React from 'react';
import Modal from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Table } from '../../../../types';
import { publishTable } from '../../../../services/libraryService';
import { useUserStore } from '../../../../stores/useUserStore';
import { useUIStore } from '../../../../stores/useUIStore';
import { useTableStore } from '../../../../stores/useTableStore';
import Icon from '../../../../components/ui/Icon';

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    table: Table;
}

const PublishModal: React.FC<PublishModalProps> = ({ isOpen, onClose, table }) => {
    const { session } = useUserStore();
    const { showToast } = useUIStore();
    const { setTablePublicStatus } = useTableStore();
    
    const [title, setTitle] = React.useState(table.name);
    const [description, setDescription] = React.useState(table.description || '');
    const [tagsInput, setTagsInput] = React.useState((table.tags || []).join(', '));
    const [isPublishing, setIsPublishing] = React.useState(false);

    const handlePublish = async () => {
        if (!session?.user) {
            showToast("You must be logged in to publish.", "error");
            return;
        }

        setIsPublishing(true);
        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            const authorName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Anonymous';

            await publishTable(table, {
                title,
                description,
                tags,
                authorName
            }, session.user.id);
            
            // Sync local state
            setTablePublicStatus(table.id, true);

            showToast("Table published to Community Library!", "success");
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Failed to publish table.", "error");
        } finally {
            setIsPublishing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Publish to Library">
            <div className="p-6 space-y-4">
                <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-lg flex gap-3 items-start border border-primary-100 dark:border-primary-800">
                    <Icon name="info" className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">Public Sharing</p>
                        <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                            Your table structure and words will be shared publicly. Your personal progress, stats, and history will <strong>NOT</strong> be shared.
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-text-subtle">Title</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name your list..." />
                </div>
                
                <div>
                    <label className="block text-sm font-medium mb-1 text-text-subtle">Description</label>
                    <textarea 
                        className="w-full bg-surface dark:bg-secondary-800 border border-border dark:border-secondary-700 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        rows={3}
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="What is this list about? Who is it for?"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-text-subtle">Tags (comma separated)</label>
                    <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. spanish, verbs, beginner" />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isPublishing}>Cancel</Button>
                    <Button onClick={handlePublish} disabled={isPublishing || !title.trim()}>
                        {isPublishing ? 'Publishing...' : 'Publish Now'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default PublishModal;
