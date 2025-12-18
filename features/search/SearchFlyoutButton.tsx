
import * as React from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { playNavigateSound, playToggleSound } from '../../services/soundService';
import Icon from '../../components/ui/Icon';
import SearchIcon from '../../components/ui/SearchIcon';

const SearchFlyoutButton: React.FC = () => {
    const { setIsSearchOpen, setIsChatbotOpen, isChatbotOpen } = useUIStore();
    const [isSearchFlyoutOpen, setIsSearchFlyoutOpen] = React.useState(false);

    const handleToggleFlyout = () => {
        playToggleSound();
        setIsSearchFlyoutOpen(!isSearchFlyoutOpen);
    };

    return (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-0 h-16 flex items-center z-20 pointer-events-none">
            <div className="flex items-center pointer-events-auto">
                {isSearchFlyoutOpen && (
                    <div className="animate-slide-in-from-right pr-2 flex items-center gap-2">
                        <button
                            onClick={() => {
                                playNavigateSound();
                                setIsChatbotOpen(!isChatbotOpen);
                                setIsSearchFlyoutOpen(false);
                            }}
                            className="flex flex-col items-center justify-center w-[70px] h-14 bg-surface dark:bg-secondary-800 rounded-lg text-primary-500 shadow-lg border border-secondary-200 dark:border-secondary-700"
                            aria-label="Toggle Chatbot"
                        >
                            <Icon name="chat" className="w-6 h-6" />
                            <span className="text-xs mt-1">Chat</span>
                        </button>
                        <button
                            onClick={() => {
                                playNavigateSound();
                                setIsSearchOpen(true);
                                setIsSearchFlyoutOpen(false);
                            }}
                            className="flex flex-col items-center justify-center w-[70px] h-14 bg-surface dark:bg-secondary-800 rounded-lg text-primary-500 shadow-lg border border-secondary-200 dark:border-secondary-700"
                            aria-label="Search"
                        >
                            <SearchIcon className="w-6 h-6" />
                            <span className="text-xs mt-1">Search</span>
                        </button>
                    </div>
                )}
                <button
                    onClick={handleToggleFlyout}
                    className="w-10 h-14 flex items-center justify-center text-primary-500 bg-surface dark:bg-secondary-800 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors rounded-l-lg shadow-lg border-l border-t border-b border-secondary-200 dark:border-secondary-700"
                    aria-label="Toggle search button"
                >
                    <Icon name={isSearchFlyoutOpen ? 'chevron-right' : 'chevron-left'} className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};

export default SearchFlyoutButton;
