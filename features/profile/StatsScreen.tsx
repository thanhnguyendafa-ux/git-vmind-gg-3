
import React, { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Icon from '../../components/ui/Icon';
import BadgeIcon from '../../components/ui/BadgeIcon';
import RestorationGarden from '../garden/components/RestorationGarden';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { useGardenStore, isGardenAwake } from '../../stores/useGardenStore';
import { Screen, SessionEntry, Badge } from '../../types';
import TimeSpentBarChart from '../home/components/TimeSpentBarChart';
import StatCard from '../home/components/StatCard';
import { useTableStats } from '../tables/hooks/useTableStats';
import { formatDuration, formatShortDuration } from '../../utils/timeUtils';
import { BADGES } from '../../constants';

const HeaderSection: React.FC = () => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    const isAwake = isGardenAwake(stats.lastSessionDate);

    return (
        <div className="relative w-full mb-6">
            <div className="relative z-0 shadow-xl rounded-2xl overflow-hidden bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700">
                 <RestorationGarden className="h-64 sm:h-80 w-full" isAwake={isAwake} />
                 
                 {/* Stats Overlay */}
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-5 px-6 flex items-end justify-between">
                    <div className="text-white">
                        <div className="flex items-center gap-3 mb-1">
                             <span className="text-4xl font-black tracking-tight drop-shadow-md">{stats.level}</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">Level</span>
                        </div>
                        <p className="text-xs text-white/80 font-mono pl-1">{stats.xp.toLocaleString()} XP Total</p>
                    </div>

                    <div className="flex items-center gap-4 text-white">
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-0.5">Streak</p>
                            <div className="flex items-baseline justify-end gap-1">
                                <span className="text-2xl font-bold drop-shadow-sm">{stats.studyStreak}</span>
                                <span className="text-xs font-medium opacity-80">days</span>
                            </div>
                        </div>
                         <div className={`p-3 rounded-full shadow-lg border border-white/10 ${isAwake ? 'bg-orange-500 text-white animate-pulse' : 'bg-white/10 text-white/50 backdrop-blur-md'}`}>
                            <Icon name="fire" variant="filled" className="w-6 h-6" />
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

const MetricsSection: React.FC = () => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    const { wordsMastered } = useTableStats();
    const totalDrops = useGardenStore(state => state.totalDrops);

    return (
        <div className="space-y-6">
            {/* Primary Chart Widget */}
            <section>
                <TimeSpentBarChart />
            </section>

            {/* Stat Cards Grid */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="transition-transform hover:-translate-y-1">
                    <StatCard 
                        icon="clock" 
                        label="Total Study Time" 
                        value={formatDuration(stats.totalStudyTime)} 
                    />
                </div>
                <div className="transition-transform hover:-translate-y-1">
                    <StatCard 
                        icon="star" 
                        label="Words Mastered" 
                        value={wordsMastered.toLocaleString()} 
                    />
                </div>
                <div className="transition-transform hover:-translate-y-1">
                    <StatCard 
                        icon="cloud-rain" 
                        label="Total Drops" 
                        value={totalDrops.toLocaleString()} 
                    />
                </div>
            </section>
        </div>
    );
};

// --- Details Tabs Logic ---

const modeDisplayMap: { [key: string]: { icon: string; name: string } } = {
    'Queue': { icon: 'progress-arrows', name: 'Queue' },
    'Confidence': { icon: 'stack-of-cards', name: 'Confidence' },
    'Anki': { icon: 'brain', name: 'Anki' },
    'Theater': { icon: 'film', name: 'Theater' },
    'Dictation': { icon: 'headphones', name: 'Dictation' },
};

const LogItem: React.FC<{ entry: SessionEntry }> = ({ entry }) => {
    const { icon, name } = modeDisplayMap[entry.mode] || { icon: 'question-mark-circle', name: entry.mode };
    
    return (
        <div className="flex items-center gap-4 py-3">
            <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-full text-text-subtle">
                <Icon name={icon} className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text-main dark:text-secondary-100 truncate">{name}</p>
                <p className="text-xs text-text-subtle">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="text-right">
                <p className="font-mono text-sm text-text-main dark:text-secondary-200">{formatShortDuration(entry.duration)}</p>
                <p className="text-xs text-primary-500 font-medium">+{entry.droplets} drops</p>
            </div>
        </div>
    );
};

const HistoryTab: React.FC = () => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    
    const processedActivity = useMemo(() => {
        if (!stats.activity) return [];
        return Object.entries(stats.activity)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [stats.activity]);

    if (processedActivity.length === 0) {
        return (
             <div className="text-center py-16 text-text-subtle bg-surface dark:bg-secondary-800/50 rounded-xl border border-dashed border-secondary-200 dark:border-secondary-700">
                <Icon name="clock" className="w-12 h-12 mx-auto mb-2 text-secondary-300 dark:text-secondary-700" />
                <p>No study sessions recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fadeIn">
             {processedActivity.map(([dateString, data]) => {
                const date = new Date(dateString + 'T00:00:00Z');
                const totalDuration = typeof data === 'number' ? data : data.total;
                const entries = typeof data === 'object' && data.entries ? data.entries : null;

                return (
                    <div key={dateString} className="bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
                        <div className="flex justify-between items-center p-4 bg-secondary-50 dark:bg-secondary-800/80 border-b border-secondary-200 dark:border-secondary-700">
                            <h3 className="font-bold text-text-main dark:text-secondary-100">
                                {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            <span className="text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                                {formatShortDuration(totalDuration)}
                            </span>
                        </div>
                        <div className="p-4 pt-0 divide-y divide-secondary-100 dark:divide-secondary-700/50">
                            {entries ? (
                                entries.map((entry, i) => <LogItem key={i} entry={entry} />)
                            ) : (
                                <div className="flex items-center gap-4 py-3">
                                    <Icon name="clock" className="w-5 h-5 text-text-subtle" />
                                    <p className="font-semibold text-text-main dark:text-secondary-100">Total Study Time</p>
                                    <p className="ml-auto font-semibold text-text-main dark:text-secondary-200">{formatShortDuration(totalDuration)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const BadgesTab: React.FC = () => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));

    // Calculate which badges to show
    const visibleBadges = useMemo(() => {
        const sortedBadges = [...BADGES].sort((a, b) => a.value - b.value);
        const firstLockedIndex = sortedBadges.findIndex(b => !stats.unlockedBadges.includes(b.id));
        
        if (firstLockedIndex === -1) return sortedBadges; // All unlocked
        return sortedBadges.slice(0, firstLockedIndex + 1); // Show unlocked + next goal
    }, [stats.unlockedBadges]);

    const getProgress = (badge: Badge): { current: number, target: number, percentage: number } => {
        const target = badge.value;
        const current = stats.totalStudyTime;
        const percentage = Math.min((current / target) * 100, 100);
        return { current, target, percentage };
    }

    return (
        <div className="animate-fadeIn">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {visibleBadges.map(badge => {
                    const isUnlocked = stats.unlockedBadges.includes(badge.id);
                    const progress = getProgress(badge);
                    
                    return (
                        <div 
                            key={badge.id}
                            className={`rounded-xl p-4 flex flex-col items-center text-center transition-all duration-300 shadow-sm border relative ${
                                isUnlocked 
                                    ? 'bg-surface dark:bg-secondary-800 border-success-500/30 ring-1 ring-success-500/20' 
                                    : 'bg-secondary-50 dark:bg-secondary-800/50 border-primary-200 dark:border-primary-800/50 border-dashed'
                            }`}
                        >
                            {!isUnlocked && (
                                <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/40 px-2 py-0.5 rounded-full">
                                    Next Goal
                                </span>
                            )}

                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-300 p-2 ${isUnlocked ? 'bg-success-100 dark:bg-success-900/30' : 'bg-secondary-200 dark:bg-secondary-700 grayscale'}`}>
                                <BadgeIcon 
                                    iconName={badge.icon}
                                    className={`w-full h-full object-contain ${!isUnlocked ? 'opacity-50' : ''}`}
                                />
                            </div>
                            <h3 className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-text-main dark:text-white' : 'text-text-subtle'}`}>{badge.name}</h3>
                            <p className="text-[10px] text-text-subtle flex-grow mb-3 leading-tight">{badge.description}</p>
                            
                            {!isUnlocked ? (
                                <div className="w-full mt-auto">
                                    <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5 mb-1">
                                        <div 
                                            className="bg-primary-500 h-1.5 rounded-full transition-all duration-500" 
                                            style={{ width: `${progress.percentage}%` }}>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-text-subtle text-right">
                                        {Math.round(progress.percentage)}%
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-auto">
                                    <span className="text-[10px] font-bold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-full">Unlocked</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
            {visibleBadges.length < BADGES.length && (
                <div className="text-center mt-8 mb-4">
                    <p className="text-xs text-text-subtle italic flex items-center justify-center gap-2 opacity-70">
                        <Icon name="lock-closed" className="w-3 h-3" />
                        Keep learning to reveal more badges...
                    </p>
                </div>
            )}
        </div>
    );
};

const DetailsSection: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'badges' | 'history'>('badges');

    return (
        <div className="mt-8">
            <div className="flex justify-center mb-6">
                <div className="bg-secondary-100 dark:bg-secondary-800 p-1 rounded-xl inline-flex shadow-inner">
                    <button 
                        onClick={() => setActiveTab('badges')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                            activeTab === 'badges' 
                                ? 'bg-white dark:bg-secondary-600 text-primary-600 dark:text-white shadow-sm' 
                                : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                        }`}
                    >
                        Badges
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                            activeTab === 'history' 
                                ? 'bg-white dark:bg-secondary-600 text-primary-600 dark:text-white shadow-sm' 
                                : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                        }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {activeTab === 'badges' ? <BadgesTab /> : <HistoryTab />}
        </div>
    );
};

const StatsScreen: React.FC = () => {
  // KẾ HOẠCH FULL-WIDTH: ĐÃ HOÀN THÀNH
  // 1. Container: Đã đảm bảo container chính không có `max-w-5xl` và `mx-auto`, cho phép nội dung trải rộng.
  //    (Context: This fulfills step 2 of the full-width plan for the container.)
  // 2. Bố cục Huy hiệu (Badges): Lưới huy hiệu đã được cập nhật để responsive hơn trên màn hình lớn.
  //    Sử dụng `md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6` để các huy hiệu không bị kéo giãn.
  //    (Context: This fulfills the layout adjustment for step 2.)
  const { setCurrentScreen } = useUIStore();

  return (
    <div className="p-4 sm:p-6 animate-fadeIn min-h-screen h-full overflow-y-auto">
      <header className="flex items-center gap-3 mb-6">
         <button 
            onClick={() => setCurrentScreen(Screen.Home)} 
            className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle transition-colors"
         >
            <Icon name="arrowLeft" className="w-6 h-6" />
         </button>
         <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Profile & Stats</h1>
      </header>
      
      <div className="space-y-8">
        <HeaderSection />
        <MetricsSection />
        <DetailsSection />
      </div>
    </div>
  );
};

export default StatsScreen;
