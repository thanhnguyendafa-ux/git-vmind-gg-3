

import * as React from 'react';
import { useCommunityStore } from '../../../stores/useCommunityStore';
import PostCard from './PostCard';
import Icon from '../../../components/ui/Icon';

const FeedStream: React.FC = () => {
    const { posts, activeTopicId, isLoading, fetchPosts } = useCommunityStore();

    React.useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const filteredPosts = React.useMemo(() => {
        if (!activeTopicId) return posts;
        return posts.filter(p => p.topicId === activeTopicId);
    }, [posts, activeTopicId]);

    // Sorting: Pinned first, then newest
    const sortedPosts = React.useMemo(() => {
        return [...filteredPosts].sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            return b.createdAt - a.createdAt;
        });
    }, [filteredPosts]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-primary-500">
                <Icon name="spinner" className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (sortedPosts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <div className="w-16 h-16 bg-secondary-100 dark:bg-secondary-800 rounded-full flex items-center justify-center mb-4 text-text-subtle">
                    <Icon name="message-circle" className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-text-main dark:text-secondary-100 mb-1">No posts here yet</h3>
                <p className="text-text-subtle text-sm">Be the first to start a conversation in this topic!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-20">
            {sortedPosts.map(post => (
                <div key={post.id} className="animate-slideInUp">
                    <PostCard post={post} />
                </div>
            ))}
        </div>
    );
};

export default FeedStream;
