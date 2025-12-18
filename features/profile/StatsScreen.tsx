
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
import AuroraBackground from '../../components/ui/AuroraBackground';

// --- Sub-Components (Memoized for Performance) ---

const ProfileHeader = React.memo(() => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    const isAwake = isGardenAwake(stats.lastSessionDate);

    return (
        <div className="relative group w-full">
            <div className="relative z-0 shadow-xl rounded-2xl overflow-hidden bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 transition-transform duration-500 hover:scale-[1.01]">
                 {/* Explicit Height Container to prevent Collapse (Risk #2) */}
                 <div className="h-72 sm:h-80 w-full relative">
                    <RestorationGarden className="w-full h-full" isAwake={isAwake} />
                 </div>
                 
                 {/* Stats Overlay - Glassmorphism */}
                 <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-20 pb-5 px-6 flex items-end justify-between pointer-events-none">
                    <div className="text-white">
                        <div className="flex items-center gap-3 mb-1">
                             <span className="text-5xl font-black tracking-tighter drop-shadow-lg text-white">{stats.level}</span>
                             <span className="text-[10px] font-bold uppercase tracking-widest opacity-90 bg-white/20 px-2 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-sm">Level</span>
                        </div>
                        <p className="text-xs text-white/80 font-mono pl-1 tracking-wide">{stats.xp.toLocaleString()} XP Total</p>
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
});

const QuickStatsGrid = React.memo(() => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    const { wordsMastered } = useTableStats();
    const totalDrops = useGardenStore(useShallow(state => state.totalDrops));

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard 
                icon="clock" 
                label="Total Time" 
                value={formatDuration(stats.totalStudyTime)} 
            />
            <StatCard 
                icon="star" 
                label="Mastered" 
                value={wordsMastered.toLocaleString()} 
            />
            <StatCard 
                icon="cloud-rain" 
                label="Droplets" 
                value={totalDrops.toLocaleString()} 
            />
        </div>
    );
});

// --- Tab Content Components ---

const OverviewTab: React.FC = () => (
    <div className="space-y-6 animate-fadeIn">
        <QuickStatsGrid />
        <div className="h-64 sm:h-72 w-full min-w-0"> {/* Min-w-0 prevents flex blowout (Risk #3) */}
            <TimeSpentBarChart />
        </div>
    </div>
);

const BadgesTab: React.FC = () => {
    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));

    // Calculate which badges to show
    const visibleBadges = useMemo(() => {
        const sortedBadges = [...BADGES].sort((a, b) => a.value - b.value);
        const firstLockedIndex = sortedBadges.findIndex(b => !stats.unlockedBadges.includes(b.id));
        
        if (firstLockedIndex === -1) return sortedBadges; // All unlocked
        return sortedBadges.slice(0, firstLockedIndex + 1); // Show unlocked + next goal
    }, [stats.unlockedBadges]);

    const getProgress = (badge: Badge) => {
        const target = badge.value;
        const current = stats.totalStudyTime;
        const percentage = Math.min((current / target) * 100, 100);
        return { percentage };
    }

    return (
        <div className="animate-fadeIn grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleBadges.map(badge => {
                const isUnlocked = stats.unlockedBadges.includes(badge.id);
                const progress = getProgress(badge);
                
                return (
                    <div 
                        key={badge.id}
                        className={`rounded-2xl p-4 flex flex-col items-center text-center transition-all duration-300 shadow-sm border relative ${
                            isUnlocked 
                                ? 'bg-surface dark:bg-secondary-800 border-success-500/30 ring-1 ring-success-500/20' 
                                : 'bg-secondary-50 dark:bg-secondary-800/50 border-secondary-200 dark:border-secondary-700 border-dashed opacity-80'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all duration-300 p-2 ${isUnlocked ? 'bg-success-100 dark:bg-success-900/30' : 'bg-secondary-200 dark:bg-secondary-700 grayscale'}`}>
                            <BadgeIcon 
                                iconName={badge.icon}
                                className={`w-full h-full object-contain ${!isUnlocked ? 'opacity-50' : ''}`}
                            />
                        </div>
                        <h3 className={`font-bold text-xs mb-1 ${isUnlocked ? 'text-text-main dark:text-white' : 'text-text-subtle'}`}>{badge.name}</h3>
                        
                        {!isUnlocked ? (
                            <div className="w-full mt-2">
                                <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1">
                                    <div 
                                        className="bg-primary-500 h-1 rounded-full transition-all duration-500" 
                                        style={{ width: `${progress.percentage}%` }}>
                                    </div>
                                </div>
                                <p className="text-[9px] text-text-subtle text-right mt-1 font-mono">
                                    {Math.round(progress.percentage)}%
                                </p>
                            </div>
                        ) : (
                             <span className="mt-auto text-[9px] font-bold text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 px-2 py-0.5 rounded-full">Unlocked</span>
                        )}
                    </div>
                )
            })}
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
             <div className="text-center py-12 text-text-subtle bg-surface/50 dark:bg-secondary-800/50 rounded-xl border border-dashed border-secondary-200 dark:border-secondary-700">
                <Icon name="clock" className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No study sessions recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fadeIn">
             {processedActivity.map(([dateString, data]) => {
                const date = new Date(dateString + 'T00:00:00Z');
                const totalDuration = typeof data === 'number' ? data : data.total;
                const entries = typeof data === 'object' && data.entries ? data.entries : null;

                return (
                    <div key={dateString} className="bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden shadow-sm">
                        <div className="flex justify-between items-center px-4 py-3 bg-secondary-50/80 dark:bg-secondary-700/30 border-b border-secondary-200 dark:border-secondary-700/50">
                            <h3 className="font-bold text-sm text-text-main dark:text-secondary-100">
                                {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </h3>
                            <span className="text-[10px] font-bold bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-600 text-text-subtle px-2 py-0.5 rounded-md">
                                {formatShortDuration(totalDuration)}
                            </span>
                        </div>
                        <div className="px-4 py-2 divide-y divide-secondary-100 dark:divide-secondary-700/50">
                            {entries ? (
                                entries.map((entry, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 text-sm">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-text-subtle opacity-70">
                                                 {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="font-medium text-text-main dark:text-secondary-200">{entry.mode}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-text-subtle text-xs">{formatShortDuration(entry.duration)}</span>
                                            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 px-1.5 py-0.5 rounded">+{entry.droplets}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-2 text-sm text-text-subtle italic">Aggregated History</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Screen ---

const StatsScreen: React.FC = () => {
  const { setCurrentScreen } = useUIStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'history'>('overview');

  return (
    <div className="relative h-full w-full overflow-hidden bg-background dark:bg-secondary-900">
        {/* 1. The Atmosphere */}
        <AuroraBackground />

        {/* 2. The Content Layer */}
        {/* Risk #4 Fix: Single scroll container for the whole screen */}
        <div className="relative z-10 h-full w-full overflow-y-auto p-4 sm:p-6 custom-scrollbar">
            
            {/* Nav Header */}
            <header className="flex items-center gap-3 mb-6">
                <button 
                    onClick={() => setCurrentScreen(Screen.Home)} 
                    className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-black/20 text-text-subtle transition-colors backdrop-blur-sm"
                >
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-serif font-bold text-text-main dark:text-secondary-100">Profile</h1>
            </header>
            
            {/* Dashboard Layout (Risk #6 Fix: Responsive Grid) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
                
                {/* Left Column: Identity (Fixed on Desktop if we wanted sticky, but scrolling is safer) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <ProfileHeader />
                    
                    {/* Desktop-only Tip/Quote could go here */}
                    <div className="hidden lg:block p-4 rounded-xl bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30">
                        <p className="text-xs text-primary-800 dark:text-primary-200 italic leading-relaxed">
                            "The roots of education are bitter, but the fruit is sweet."
                        </p>
                    </div>
                </div>

                {/* Right Column: Data & Tabs */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Tab Navigation (Sticky for long history lists) */}
                    <div className="sticky top-0 z-20 bg-background/80 dark:bg-secondary-900/80 backdrop-blur-md py-2 -my-2">
                        <div className="flex p-1 bg-secondary-100 dark:bg-secondary-800 rounded-xl w-full sm:w-auto self-start">
                            {(['overview', 'badges', 'history'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 capitalize ${
                                        activeTab === tab
                                            ? 'bg-white dark:bg-secondary-600 text-primary-600 dark:text-white shadow-sm'
                                            : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                                    }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[400px]">
                        {activeTab === 'overview' && <OverviewTab />}
                        {activeTab === 'badges' && <BadgesTab />}
                        {activeTab === 'history' && <HistoryTab />}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default StatsScreen;
