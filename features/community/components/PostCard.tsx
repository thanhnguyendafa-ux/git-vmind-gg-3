

import * as React from 'react';
import { CommunityPost } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useCommunityStore } from '../../../stores/useCommunityStore';
import { formatShortDuration } from '../../../utils/timeUtils';

const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
};

interface PostCardProps {
    post: CommunityPost;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const { topics, toggleLike } = useCommunityStore();
    const topic = topics.find(t => t.id === post.topicId);
    
    // Animation state for like button
    const [isBeating, setIsBeating] = React.useState(false);

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsBeating(true);
        toggleLike(post.id);
        setTimeout(() => setIsBeating(false), 300);
    };

    return (
        <div className="group relative overflow-hidden bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-100 to-emerald-100 dark:from-primary-900/30 dark:to-emerald-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-lg shadow-inner">
                        {post.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-text-main dark:text-secondary-100">{post.userName}</span>
                            {post.isPinned && (
                                <Icon name="pin" variant="filled" className="w-3 h-3 text-primary-500" />
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-subtle">
                            <span>{timeAgo(post.createdAt)}</span>
                            <span>•</span>
                            {topic && (
                                <span style={{ color: topic.color }} className="font-semibold">
                                    {topic.name}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mb-4">
                <h3 className="text-lg font-bold text-text-main dark:text-white mb-2 leading-tight">{post.title}</h3>
                <p className="text-sm text-text-subtle line-clamp-3 leading-relaxed">{post.content}</p>
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between border-t border-secondary-200/50 dark:border-secondary-700/50 pt-3 mt-2">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleLike}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${post.isLiked ? 'text-error-500' : 'text-text-subtle hover:text-error-500'} active:scale-125 transition-transform duration-150 ${isBeating ? 'scale-125' : ''}`}
                    >
                        <Icon name="heart" variant={post.isLiked ? 'filled' : 'outline'} className="w-4 h-4" />
                        <span>{post.likes}</span>
                    </button>
                    
                    <button className="flex items-center gap-1.5 text-xs font-bold text-text-subtle hover:text-primary-500 transition-colors">
                        <Icon name="message-circle" className="w-4 h-4" />
                        <span>{post.comments}</span>
                    </button>
                </div>

                <button className="text-text-subtle hover:text-text-main transition-colors">
                    <Icon name="share" className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default PostCard;
