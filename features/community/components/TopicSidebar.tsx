

import * as React from 'react';
import { useCommunityStore } from '../../../stores/useCommunityStore';
import Icon from '../../../components/ui/Icon';
import { CommunityTopic } from '../../../types';

const TopicButton: React.FC<{ 
    topic: CommunityTopic | null; 
    isActive: boolean; 
    onClick: () => void 
}> = ({ topic, isActive, onClick }) => {
    // Handle "All" case where topic is null
    const label = topic ? topic.name : "All Topics";
    const icon = topic ? topic.icon : "globe";
    const color = topic ? topic.color : "#64748b";

    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                    ? 'bg-white dark:bg-white/10 shadow-md border border-primary-100 dark:border-primary-500/30' 
                    : 'hover:bg-white/50 dark:hover:bg-white/5 border border-transparent'
                }
            `}
        >
            <div 
                className={`
                    p-2 rounded-lg transition-transform group-hover:scale-110 flex-shrink-0
                    ${isActive ? 'bg-primary-500 text-white' : 'bg-secondary-100 dark:bg-secondary-800 text-text-subtle'}
                `}
                style={isActive && topic ? { backgroundColor: topic.color } : {}}
            >
                <Icon name={icon} className="w-4 h-4" variant={isActive ? 'filled' : 'outline'} />
            </div>
            <span className={`text-sm font-semibold ${isActive ? 'text-text-main dark:text-white' : 'text-text-subtle'}`}>
                {label}
            </span>
        </button>
    );
};

export const TopicSidebar: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { topics, activeTopicId, setActiveTopic } = useCommunityStore();

    return (
        <div className={`flex flex-col gap-2 p-4 ${className}`}>
            <h3 className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-2 px-2">Discover</h3>
            
            <TopicButton 
                topic={null} 
                isActive={activeTopicId === null} 
                onClick={() => setActiveTopic(null)} 
            />

            <div className="h-px bg-secondary-200 dark:bg-secondary-700 mx-2 my-1" />

            {topics.map(topic => (
                <TopicButton
                    key={topic.id}
                    topic={topic}
                    isActive={activeTopicId === topic.id}
                    onClick={() => setActiveTopic(topic.id)}
                />
            ))}
        </div>
    );
};

export const MobileTopicBar: React.FC = () => {
    const { topics, activeTopicId, setActiveTopic } = useCommunityStore();

    return (
        <div className="flex gap-2 overflow-x-auto p-4 hide-scrollbar">
             <button
                onClick={() => setActiveTopic(null)}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors
                    ${activeTopicId === null 
                        ? 'bg-text-main text-white border-transparent' 
                        : 'bg-surface dark:bg-secondary-800 text-text-subtle border-secondary-200 dark:border-secondary-700'
                    }
                `}
            >
                All Topics
            </button>
            {topics.map(topic => (
                <button
                    key={topic.id}
                    onClick={() => setActiveTopic(topic.id)}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all
                        ${activeTopicId === topic.id
                            ? 'text-white border-transparent shadow-md'
                            : 'bg-surface dark:bg-secondary-800 text-text-subtle border-secondary-200 dark:border-secondary-700'
                        }
                    `}
                    style={activeTopicId === topic.id ? { backgroundColor: topic.color } : {}}
                >
                    {topic.name}
                </button>
            ))}
        </div>
    );
}
