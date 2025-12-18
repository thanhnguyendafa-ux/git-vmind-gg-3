

import { create } from 'zustand';
import { CommunityPost, CommunityTopic } from '../types';
import { useUserStore } from './useUserStore';

// --- MOCK DATA ---

const MOCK_TOPICS: CommunityTopic[] = [
    { id: 'topic-general', name: 'General', slug: 'general', icon: 'message-circle', color: '#64748b' }, // Slate
    { id: 'topic-qa', name: 'Q&A', slug: 'qa', icon: 'question-mark-circle', color: '#0ea5e9' }, // Sky
    { id: 'topic-showcase', name: 'Showcase', slug: 'showcase', icon: 'sparkles', color: '#f59e0b' }, // Amber
    { id: 'topic-tips', name: 'Tips & Tricks', slug: 'tips', icon: 'light-bulb', color: '#10b981' }, // Emerald
    { id: 'topic-requests', name: 'Requests', slug: 'requests', icon: 'inbox', color: '#8b5cf6' }, // Violet
];

const MOCK_POSTS: CommunityPost[] = [
    {
        id: 'post-1',
        userId: 'user-1',
        userName: 'LanguageLearner99',
        title: 'Best strategy for Kanji?',
        content: 'I\'m struggling to remember stroke orders. Should I focus on recognition first or writing? The handwriting input in Vmind is helping, but I feel slow.',
        topicId: 'topic-qa',
        likes: 12,
        comments: 5,
        isPinned: false,
        isLiked: false,
        createdAt: Date.now() - 3600000 * 2, // 2 hours ago
    },
    {
        id: 'post-2',
        userId: 'user-2',
        userName: 'VocabMaster',
        title: 'JLPT N5 Core 1000 - Public Table',
        content: 'I just published a comprehensive list for N5. It includes audio for every word and example sentences generated via Gemini. Check it out in the Library!',
        topicId: 'topic-showcase',
        likes: 45,
        comments: 12,
        isPinned: true,
        isLiked: true,
        createdAt: Date.now() - 86400000 * 1, // 1 day ago
    },
    {
        id: 'post-3',
        userId: 'user-3',
        userName: 'Newbie',
        title: 'How to use Confidence Mode?',
        content: 'Does "Again" reset the progress completely? I\'m confused about the intervals.',
        topicId: 'topic-qa',
        likes: 3,
        comments: 2,
        isPinned: false,
        isLiked: false,
        createdAt: Date.now() - 3600000 * 5, // 5 hours ago
    },
    {
        id: 'post-4',
        userId: 'user-system',
        userName: 'Vmind Team',
        title: 'Welcome to the Community!',
        content: 'This is a space to share your tables, ask questions, and connect with other learners. Be kind and keep growing!',
        topicId: 'topic-general',
        likes: 100,
        comments: 0,
        isPinned: true,
        isLiked: false,
        createdAt: Date.now() - 86400000 * 7, // 7 days ago
    }
];

interface CommunityState {
    posts: CommunityPost[];
    topics: CommunityTopic[];
    activeTopicId: string | null;
    isLoading: boolean;

    // Actions
    fetchPosts: () => Promise<void>;
    setActiveTopic: (topicId: string | null) => void;
    toggleLike: (postId: string) => void;
    createPost: (title: string, content: string, topicId: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>()(
    (set, get) => ({
        posts: [],
        topics: MOCK_TOPICS,
        activeTopicId: null,
        isLoading: false,

        fetchPosts: async () => {
            set({ isLoading: true });
            // Simulate API call
            setTimeout(() => {
                set({ posts: MOCK_POSTS, isLoading: false });
            }, 600);
        },

        setActiveTopic: (topicId) => {
            set({ activeTopicId: topicId });
        },

        toggleLike: (postId) => {
            set(state => ({
                posts: state.posts.map(p => {
                    if (p.id === postId) {
                        return {
                            ...p,
                            isLiked: !p.isLiked,
                            likes: p.isLiked ? p.likes - 1 : p.likes + 1
                        };
                    }
                    return p;
                })
            }));
            // In a real app, we would fire an API call here without awaiting
        },

        createPost: async (title, content, topicId) => {
            const { session } = useUserStore.getState();
            const userName = session?.user?.email?.split('@')[0] || 'Anonymous';
            const userId = session?.user?.id || 'guest';

            const newPost: CommunityPost = {
                id: `post-${Date.now()}`,
                userId,
                userName,
                title,
                content,
                topicId,
                likes: 0,
                comments: 0,
                isPinned: false,
                isLiked: false,
                createdAt: Date.now(),
            };

            // Optimistic update
            set(state => ({
                posts: [newPost, ...state.posts]
            }));

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    })
);
