import * as React from 'react';
import { useMusicStore } from '../../stores/useMusicStore';
import { playToggleSound } from '../../services/soundService';
import Icon from '../../components/ui/Icon';

const MusicFlyoutButton: React.FC = () => {
    const { isOpen, toggleOpen } = useMusicStore();

    return (
        <div className="fixed bottom-16 left-0 h-16 flex items-center z-20 pointer-events-none">
            <div className="flex items-center pointer-events-auto">
                <button
                    onClick={() => {
                        playToggleSound();
                        toggleOpen();
                    }}
                    className="w-10 h-14 flex items-center justify-center text-primary-500 bg-surface dark:bg-secondary-800 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors rounded-r-lg shadow-lg border-r border-t border-b border-secondary-200 dark:border-secondary-700"
                    aria-label="Toggle music player"
                >
                    <Icon name={isOpen ? 'chevron-left' : 'music-note'} className="w-5 h-5"/>
                </button>
            </div>
        </div>
    );
};

export default MusicFlyoutButton;