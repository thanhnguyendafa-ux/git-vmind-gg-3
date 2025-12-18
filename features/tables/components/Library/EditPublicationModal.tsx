
import * as React from 'react';
import Modal from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { LibraryItem } from '../../../../types';
import { updateLibraryItem } from '../../../../services/libraryService';
import { useUIStore } from '../../../../stores/useUIStore';

interface EditPublicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: LibraryItem;
    onSuccess: () => void;
}

const EditPublicationModal: React.FC<EditPublicationModalProps> = ({ isOpen, onClose, item, onSuccess }) => {
    const { showToast } = useUIStore();
    
    const [title, setTitle] = React.useState(item.title);
    const [description, setDescription] = React.useState(item.description || '');
    const [tagsInput, setTagsInput] = React.useState((item.tags || []).join(', '));
    const [isSaving, setIsSaving] = React.useState(false);

    // Reset state when item changes
    React.useEffect(() => {
        if (isOpen) {
            setTitle(item.title);
            setDescription(item.description || '');
            setTagsInput((item.tags || []).join(', '));
        }
    }, [isOpen, item]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            
            await updateLibraryItem(item.id, {
                title,
                description,
                tags
            });

            showToast("Publication updated successfully!", "success");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Failed to update publication.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Publication">
            <div className="p-6 space-y-4">
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
                        placeholder="What is this list about?"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-text-subtle">Tags (comma separated)</label>
                    <Input value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. spanish, verbs, beginner" />
                </div>
                
                <div className="pt-2 flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default EditPublicationModal;
