
import * as React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { TopicSidebar, MobileTopicBar } from './components/TopicSidebar';
import FeedStream from './components/FeedStream';
import PostComposerModal from './components/PostComposerModal';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../types';
import AuroraBackground from '../../components/ui/AuroraBackground';

const CommunityScreen: React.FC = () => {
    const { setCurrentScreen } = useUIStore();
    const [isComposerOpen, setIsComposerOpen] = React.useState(false);

    return (
        <div className="relative h-full w-full overflow-hidden">
            {/* 1. The Atmosphere */}
            <AuroraBackground />

            {/* 2. The Content Layer */}
            <div className="relative z-10 flex h-full w-full">
                {/* Desktop Sidebar (Left) */}
                <aside className="hidden md:flex w-64 flex-col border-r border-white/20 dark:border-white/5 bg-white/60 dark:bg-[#0F1A17]/60 backdrop-blur-xl z-10">
                    <div className="p-6 pb-2">
                        <button 
                            onClick={() => setCurrentScreen(Screen.Home)}
                            className="flex items-center gap-2 text-text-subtle hover:text-text-main transition-colors mb-6"
                        >
                            <Icon name="arrowLeft" className="w-5 h-5" />
                            <span className="font-bold text-sm">Back to Home</span>
                        </button>
                        <h1 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-emerald-600 dark:from-primary-400 dark:to-emerald-400">
                            Community
                        </h1>
                        <p className="text-xs text-text-subtle mt-1">Connect, share, and grow.</p>
                    </div>
                    
                    <div className="px-6 mb-4">
                         <Button 
                            onClick={() => setIsComposerOpen(true)}
                            className="w-full shadow-lg shadow-primary-500/20 bg-gradient-to-r from-primary-600 to-emerald-600 border-none"
                        >
                            <Icon name="plus" className="w-4 h-4 mr-2" /> New Post
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <TopicSidebar />
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col relative min-w-0">
                    {/* Mobile Header */}
                    <div className="md:hidden flex flex-col bg-white/70 dark:bg-[#0F1A17]/80 backdrop-blur-xl border-b border-white/20 dark:border-white/5 sticky top-0 z-20">
                         <div className="flex justify-between items-center p-4 pb-2">
                            <h1 className="text-xl font-bold text-text-main dark:text-white font-serif">Community</h1>
                            <button onClick={() => setIsComposerOpen(true)} className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full">
                                <Icon name="plus" className="w-5 h-5" />
                            </button>
                         </div>
                         <MobileTopicBar />
                    </div>

                    {/* Feed */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 max-w-3xl w-full mx-auto">
                        <FeedStream />
                    </div>
                </main>
            </div>
            
            <PostComposerModal 
                isOpen={isComposerOpen} 
                onClose={() => setIsComposerOpen(false)} 
            />
        </div>
    );
};

export default CommunityScreen;
