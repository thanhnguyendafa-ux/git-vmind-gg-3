import React from 'react';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';

const XP_PER_LEVEL = 1000;

interface StudySessionHeaderProps {
    onQuit: () => void;
    userLevel: number;
    userXp: number;
    sessionXp: number;
    masteredCount: number;
    totalCount: number;
    elapsedSeconds: number;
    isSpeedMode: boolean;
    onToggleSpeedMode: () => void;
    isImmersive: boolean;
    onToggleImmersiveMode: () => void;
}

const StudySessionHeader: React.FC<StudySessionHeaderProps> = ({ 
    onQuit, userLevel, userXp, sessionXp, masteredCount, totalCount, elapsedSeconds, isSpeedMode, onToggleSpeedMode, isImmersive, onToggleImmersiveMode
}) => {
    const totalXp = userXp + sessionXp;
    const currentLevel = Math.floor(totalXp / XP_PER_LEVEL) + 1;
    const currentLevelXp = totalXp % XP_PER_LEVEL;
    const progressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;
    const time = new Date(elapsedSeconds * 1000).toISOString().substr(14, 5);

    return (
        <header className="w-full max-w-4xl lg:max-w-7xl mx-auto p-3 flex items-center gap-4 text-sm">
            <button onClick={onQuit} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700"><Icon name="x" className="w-6 h-6"/></button>
            <div className="flex items-center gap-2 flex-1">
                <span className="font-bold text-primary-500">Lv {currentLevel}</span>
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2 flex-1 max-w-xs">
                    <div className="bg-primary-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>
            <div className="font-semibold text-text-main dark:text-secondary-100">{masteredCount} / {totalCount}</div>
            <div className="font-mono text-text-subtle w-12 text-center">{time}</div>
            <div className="flex items-center gap-2" title="Speed Mode: Automatically advance on correct answers">
                <Icon name="sparkles" className={`w-5 h-5 ${isSpeedMode ? 'text-warning-500' : 'text-text-subtle'}`}/>
                <button onClick={onToggleSpeedMode} className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${isSpeedMode ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'}`}>
                    <span className={`w-3.5 h-3.5 bg-white rounded-full transition-transform ${isSpeedMode ? 'translate-x-5' : ''}`}></span>
                </button>
            </div>
            <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={onToggleImmersiveMode}
                title={isImmersive ? "Maximize View (f)" : "Focus View (f)"}
            >
                <Icon name={isImmersive ? "arrows-pointing-out" : "arrows-pointing-in"} className="w-5 h-5"/>
            </Button>
        </header>
    );
};

export default StudySessionHeader;