
import * as React from 'react';
import { Badge } from '../../types';
import Icon from '../../components/ui/Icon';
import BadgeIcon from '../../components/ui/BadgeIcon';
import { useUserStore } from '../../stores/useUserStore';
import { BADGES } from '../../constants';
import { formatDuration } from '../../utils/timeUtils';
import ActivityStats from './components/ActivityStats';

const XP_PER_LEVEL = 1000;

const RewardsScreen: React.FC = () => {
  const { stats } = useUserStore();
  const allBadges = BADGES;

  const getProgress = (badge: Badge): { current: number, target: number, percentage: number } => {
    const target = badge.value;
    const current = stats.totalStudyTime;
    const percentage = Math.min((current / target) * 100, 100);
    return { current, target, percentage };
  }
  
  const currentLevelXp = stats.xp % XP_PER_LEVEL;
  const progressPercentage = (currentLevelXp / XP_PER_LEVEL) * 100;
  
  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <div className="flex items-center mb-6">
        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Progress & Rewards</h1>
      </div>

      <div className="bg-surface dark:bg-secondary-800 rounded-xl p-4 sm:p-5 shadow-lg mb-6">
            <h2 className="text-base font-semibold text-primary-600 dark:text-primary-400 mb-3">Your Progress</h2>
            <div>
                <div className="flex justify-between items-baseline mb-1">
                    <span className="font-bold text-text-main dark:text-secondary-100">Level {stats.level}</span>
                    <span className="text-xs text-text-subtle">{stats.xp.toLocaleString()} XP Total</span>
                </div>
                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <p className="text-right text-xs text-text-subtle mt-1">{currentLevelXp} / {XP_PER_LEVEL} XP</p>
            </div>
        </div>

      <ActivityStats />

      <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-4">Badges</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {allBadges.map(badge => {
          const isUnlocked = stats.unlockedBadges.includes(badge.id);
          const progress = getProgress(badge);
          
          return (
            <div 
              key={badge.id}
              className={`rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 shadow-md ${isUnlocked ? 'bg-success-500/10 dark:bg-success-900/40 ring-2 ring-success-500/30' : 'bg-surface dark:bg-secondary-800'}`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 p-2 ${isUnlocked ? 'bg-success-500' : 'bg-secondary-200 dark:bg-secondary-700'}`}>
                <BadgeIcon 
                  iconName={badge.icon}
                  className={`w-full h-full object-contain ${!isUnlocked ? 'opacity-70' : ''}`}
                />
              </div>
              <h3 className={`font-bold text-base mb-1 ${isUnlocked ? 'text-success-800 dark:text-white' : 'text-text-main dark:text-secondary-300'}`}>{badge.name}</h3>
              <p className="text-xs text-text-subtle flex-grow mb-3">{badge.description}</p>
              
              {!isUnlocked && (
                <div className="w-full">
                    <p className="text-xs text-secondary-500 dark:text-secondary-500 mb-1 text-right">
                        {formatDuration(progress.current)} / {formatDuration(progress.target)}
                    </p>
                    <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
                        <div 
                            className="bg-primary-500 h-1.5 rounded-full" 
                            style={{ width: `${progress.percentage}%` }}>
                        </div>
                    </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default RewardsScreen;
