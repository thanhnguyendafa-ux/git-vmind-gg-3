

import * as React from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';
import { useCommunityStore } from '../../../stores/useCommunityStore';
import { useUIStore } from '../../../stores/useUIStore';

interface PostComposerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PostComposerModal: React.FC<PostComposerModalProps> = ({ isOpen, onClose }) => {
    const { topics, createPost, activeTopicId } = useCommunityStore();
    const { showToast } = useUIStore();
    
    const [title, setTitle] = React.useState('');
    const [content, setContent] = React.useState('');
    const [selectedTopicId, setSelectedTopicId] = React.useState<string>(activeTopicId || topics[0]?.id || '');
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTitle('');
            setContent('');
            // Default to active topic if set, otherwise first topic
            if (activeTopicId) setSelectedTopicId(activeTopicId);
        }
    }, [isOpen, activeTopicId]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;
        
        setIsSubmitting(true);
        try {
            await createPost(title.trim(), content.trim(), selectedTopicId);
            showToast("Post published successfully!", "success");
            onClose();
        } catch (error) {
            console.error(error);
            showToast("Failed to publish post.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedTopic = topics.find(t => t.id === selectedTopicId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create Post" containerClassName="max-w-xl w-full">
            <div className="p-6 space-y-4">
                {/* Topic Selector */}
                <div>
                    <label className="block text-xs font-bold text-text-subtle uppercase mb-2">Topic</label>
                    <div className="flex flex-wrap gap-2">
                        {topics.map(topic => (
                            <button
                                key={topic.id}
                                onClick={() => setSelectedTopicId(topic.id)}
                                className={`
                                    px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                                    ${selectedTopicId === topic.id 
                                        ? 'border-transparent text-white shadow-md' 
                                        : 'bg-surface dark:bg-secondary-800 text-text-subtle border-secondary-200 dark:border-secondary-700 hover:border-primary-300'
                                    }
                                `}
                                style={selectedTopicId === topic.id ? { backgroundColor: topic.color } : {}}
                            >
                                {topic.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Input 
                        placeholder="Title" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        className="text-lg font-bold border-none px-0 bg-transparent focus:ring-0 placeholder:text-secondary-300 dark:placeholder:text-secondary-600"
                        autoFocus
                    />
                </div>

                <div className="min-h-[150px] relative">
                    <textarea 
                        className="w-full h-full bg-transparent resize-none outline-none text-text-main dark:text-secondary-100 placeholder:text-text-subtle/50 text-sm leading-relaxed"
                        placeholder="What's on your mind?"
                        rows={8}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-secondary-100 dark:border-secondary-700/50">
                    <div className="flex gap-2">
                        <button className="p-2 text-text-subtle hover:text-primary-500 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors" title="Add Image (Coming Soon)">
                            <Icon name="photo" className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-text-subtle hover:text-primary-500 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors" title="Attach Table (Coming Soon)">
                            <Icon name="table-cells" className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex gap-3">
                         <Button variant="ghost" onClick={onClose}>Cancel</Button>
                         <Button 
                            onClick={handleSubmit} 
                            disabled={!title.trim() || !content.trim() || isSubmitting}
                            className="bg-gradient-to-r from-primary-600 to-emerald-600 border-none shadow-lg shadow-primary-500/20"
                        >
                            {isSubmitting ? 'Posting...' : 'Post'}
                         </Button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default PostComposerModal;
