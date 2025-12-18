
import * as React from 'react';
import { useMusicStore } from '../../stores/useMusicStore';
import { playToggleSound } from '../../services/soundService';
import Icon from '../../components/ui/Icon';

const MusicFlyoutButton: React.FC = () => {
    const { isOpen, toggleOpen, isPlaying } = useMusicStore();

    // Check if music is playing in background (closed but playing)
    const isBackgroundPlaying = !isOpen && isPlaying;

    return (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 h-16 flex items-center z-20 pointer-events-none">
            <div className="flex items-center pointer-events-auto">
                <button
                    onClick={() => {
                        playToggleSound();
                        toggleOpen();
                    }}
                    className={`
                        w-10 h-14 flex items-center justify-center 
                        transition-all duration-300 rounded-r-lg shadow-lg border-r border-t border-b border-secondary-200 dark:border-secondary-700
                        ${isBackgroundPlaying 
                            ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800' 
                            : 'bg-surface dark:bg-secondary-800 text-primary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                        }
                    `}
                    aria-label="Toggle music player"
                >
                    <div className={isBackgroundPlaying ? 'animate-pulse' : ''}>
                        <Icon name={isOpen ? 'chevron-left' : 'music-note'} className="w-5 h-5"/>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default MusicFlyoutButton;
