import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import ActivityHeatmap from './components/ActivityHeatmap';
import TimeSpentBarChart from './components/TimeSpentBarChart';
import { formatShortDuration, formatDuration, getLocalDateString } from '../../utils/timeUtils';
import { NotificationCard } from './components/NotificationCard';
import Modal from '../../components/ui/Modal';
import { NeedsAttentionList } from '../../components/ui/NeedsAttentionList';
import { Button } from '../../components/ui/Button';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
import { Card } from '../../components/ui/Card';
import RestorationGarden from '../garden/components/RestorationGarden';
import { isGardenAwake } from '../../stores/useGardenStore';
import StreakCard from './components/StreakCard';
import RecentStudiesCard from './components/RecentStudiesCard';
import ActivityPulseWidget from './components/ActivityPulseWidget';
import { Screen } from '../../types';
import { useTableStats } from '../tables/hooks/useTableStats';
import AuroraBackground from '../../components/ui/AuroraBackground';

const PushPullControls: React.FC = () => {
    const { syncQueue, syncStatus, pullData, isPulling, setIsPulling, setIsSyncModalOpen, showToast, isPullDisabled, setIsPullDisabled } = useUIStore(useShallow(state => ({
        syncQueue: state.syncQueue,
        syncStatus: state.syncStatus,
        pullData: state.pullData,
        isPulling: state.isPulling,
        setIsPulling: state.setIsPulling,
        setIsSyncModalOpen: state.setIsSyncModalOpen,
        showToast: state.showToast,
        isPullDisabled: state.isPullDisabled,
        setIsPullDisabled: state.setIsPullDisabled
    })));

    const isPushing = syncStatus === 'saving';
    const pendingCount = syncQueue.length;
    const hasFailedItems = syncQueue.some(item => item.status === 'failed');

    React.useEffect(() => {
        const hasInitialPulled = localStorage.getItem('vmind_has_initial_pull');

        const performInitialPull = async () => {
            if (pullData) {
                setIsPulling(true);
                try {
                    await pullData();
                    showToast("Data pulled from server.", "success");
                    localStorage.setItem('vmind_has_initial_pull', 'true');
                } catch (e) {
                    showToast("Failed to pull initial data.", "error");
                    console.error("Initial pull failed:", e);
                } finally {
                    setIsPulling(false);
                    setIsPullDisabled(true);
                }
            }
        };

        if (!hasInitialPulled) {
            performInitialPull();
        } else {
            setIsPullDisabled(true);
        }
    }, [pullData, setIsPulling, showToast, setIsPullDisabled]);

    const handlePull = async () => {
        if (!pullData) {
            showToast("Pull function not ready.", "error");
            return;
        }
        setIsPulling(true);
        try {
            await pullData();
            showToast("Data pulled from server.", "success");
        } catch (e) {
            showToast("Failed to pull data.", "error");
            console.error("Pull failed:", e);
        } finally {
            setIsPulling(false);
        }
    };

    const handlePush = () => {
        VmindSyncEngine.getInstance().triggerSync();
    };

    return (
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePull} disabled={isPulling || isPushing || isPullDisabled} className="px-2 backdrop-blur-md bg-white/5 border border-white/10 hover:bg-white/10">
                {isPulling ? <Icon name="spinner" className="animate-spin w-4 h-4" /> : <Icon name="arrow-down-tray" className="w-4 h-4" />}
                <span className="hidden sm:inline ml-2">Pull</span>
            </Button>
            <div className="flex rounded-full overflow-hidden shadow-sm backdrop-blur-md bg-white/5 border border-white/10">
                <Button variant="ghost" size="sm" onClick={handlePush} disabled={pendingCount === 0 || isPushing || isPulling} className="rounded-none px-3 hover:bg-white/10 border-r border-white/10">
                    {isPushing ? <Icon name="spinner" className="animate-spin w-4 h-4" /> : <Icon name="arrow-up-tray" className="w-4 h-4" />}
                    <span className="ml-2 font-bold">{pendingCount > 0 ? pendingCount : ''}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsSyncModalOpen(true)} disabled={pendingCount === 0} className="rounded-none px-2 hover:bg-white/10">
                    {hasFailedItems ? <Icon name="error-circle" className="w-4 h-4 text-error-500" /> : <Icon name="list-bullet" className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
};

const GardenerStatPill: React.FC<{ icon: string; label: string; value: string | number; delay?: number; onClick?: () => void }> = ({ icon, label, value, delay = 0, onClick }) => (
    <div
        onClick={onClick}
        style={{ animation: 'fadeIn 0.8s ease-out backwards', animationDelay: `${delay}ms` }}
        className={`
            flex items-center gap-3 px-5 py-4 rounded-[2rem]
            bg-white/40 dark:bg-black/20 backdrop-blur-xl
            border border-white/60 dark:border-white/5
            w-full transition-all group active:scale-95
            ${onClick ? 'cursor-pointer hover:bg-white/60 dark:hover:bg-black/30' : ''}
        `}
    >
        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <Icon name={icon} className="w-5 h-5" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-800/50 dark:text-emerald-400/50">{label}</p>
            <p className="text-xl font-serif font-bold text-slate-800 dark:text-emerald-50 leading-none mt-1 truncate">{value}</p>
        </div>
    </div>
);

const HomeScreen: React.FC = () => {
    const { stats, isGuest, handleLogout, session } = useUserStore();
    const { wordsMastered, totalWords } = useTableStats();
    const { theme, toggleTheme, isSyncModalOpen, setIsSyncModalOpen, setCurrentScreen, triggerGlobalAction, timeOfDay, updateTimeOfDay } = useUIStore();

    React.useEffect(() => {
        updateTimeOfDay();
        const interval = setInterval(updateTimeOfDay, 60000 * 30); // Check every 30 mins
        return () => clearInterval(interval);
    }, [updateTimeOfDay]);

    const greeting = React.useMemo(() => {
        const hour = new Date().getHours();
        let intro = "Good Evening";
        if (hour < 5) intro = "Still awake,";
        else if (hour < 12) intro = "Rise and shine,";
        else if (hour < 18) intro = "The light is perfect,";

        const userName = !isGuest && session?.user?.email ? session.user.email.split('@')[0] : 'Scholar';
        const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);

        return { intro, name: formattedName };
    }, [isGuest, session]);

    const activityData = React.useMemo(() => {
        const activity = stats.activity || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thisWeekStart = new Date(today);
        thisWeekStart.setDate(today.getDate() - today.getDay());

        let thisWeek = 0;

        for (const dateStr in activity) {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(Number(year), Number(month) - 1, Number(day));

            if (date >= thisWeekStart) {
                const activityValue = activity[dateStr];
                thisWeek += typeof activityValue === 'number' ? activityValue : activityValue.total;
            }
        }

        const todayActivityValue = activity[getLocalDateString(today)];

        return {
            today: typeof todayActivityValue === 'number' ? todayActivityValue : todayActivityValue?.total || 0,
            thisWeek,
        };
    }, [stats.activity]);

    const isAwake = isGardenAwake(stats.lastSessionDate);

    // Guarded Logout
    const handleGuardedLogout = () => {
        triggerGlobalAction(() => handleLogout());
    };

    return (
        <div className={`relative h-[100dvh] w-full overflow-hidden transition-colors duration-1000 ${timeOfDay === 'night' ? 'bg-[#051A14]' :
            timeOfDay === 'dawn' ? 'bg-[#0F2A24]' :
                timeOfDay === 'twilight' ? 'bg-[#1A1005]' : 'bg-[#F8FAF9]'
            }`}>
            {/* 1. The Atmosphere */}
            <AuroraBackground />

            {/* Organic Noise Texture Overlay */}
            <div className="absolute inset-0 z-0 opacity-[0.04] pointer-events-none bg-noise mix-blend-overlay"></div>

            {/* 2. The Content Layer */}
            <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden p-6 sm:p-10 pb-32">

                {/* Header: Poetic & Tactical */}
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fadeIn">
                    <div>
                        <div className="flex items-center gap-2 mb-2 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] dark:text-emerald-300">Sanctuary v3.0</span>
                        </div>
                        <h1 className="text-4xl sm:text-5xl font-serif font-medium tracking-tight text-slate-900 dark:text-white">
                            <span className="opacity-50">{greeting.intro}</span> <br className="sm:hidden" />
                            <span className="italic">{greeting.name}.</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isGuest && <PushPullControls />}
                        <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-2" />
                        <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-white/10 transition-colors backdrop-blur-md bg-white/5 border border-white/10">
                            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-6 h-6 dark:text-emerald-300" />
                        </button>
                        {!isGuest && (
                            <button onClick={handleGuardedLogout} className="p-3 rounded-full hover:bg-red-500/10 transition-colors backdrop-blur-md bg-white/5 border border-white/10 group">
                                <Icon name="logout" className="w-6 h-6 text-slate-400 group-hover:text-red-400" />
                            </button>
                        )}
                    </div>
                </header>

                {/* --- THE SANCTUARY GRID --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* LEFT COLUMN: The Focus (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* THE GARDEN: Absolute Hero */}
                        <div className="relative group">
                            <div className="absolute -inset-4 bg-emerald-500/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                            <div className="h-[400px] sm:h-[500px] overflow-visible">
                                <RestorationGarden isAwake={isAwake} className="h-full w-full" />
                            </div>
                        </div>

                        {/* GARDENER'S LEDGER (Grid inside Column) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <GardenerStatPill icon="droplets" label="Rainwater (Today)" value={formatShortDuration(activityData.today)} delay={100} />
                            <GardenerStatPill icon="sun" label="Sunlight (Week)" value={formatShortDuration(activityData.thisWeek)} delay={200} />
                            <GardenerStatPill icon="sparkles" label="Fully Bloomed" value={wordsMastered} delay={300} />
                            <GardenerStatPill icon="tree" label="Total Seeds" value={totalWords.toLocaleString()} delay={400} />
                        </div>

                        {/* ACTIONABLE WIDGETS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="animate-fadeIn" style={{ animationDelay: '500ms' }}>
                                <RecentStudiesCard />
                            </div>
                            <div className="animate-fadeIn" style={{ animationDelay: '600ms' }}>
                                <ActivityPulseWidget />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: The Pulse (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">

                        <div className="animate-fadeIn" style={{ animationDelay: '200ms' }}>
                            <StreakCard />
                        </div>

                        <div className="animate-fadeIn" style={{ animationDelay: '300ms' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800/50 dark:text-emerald-400/50 mb-4 px-2 flex items-center gap-2">
                                <Icon name="chart-bar" className="w-4 h-4" />
                                Growth Pattern
                            </h3>
                            <TimeSpentBarChart />
                        </div>

                        <div className="animate-fadeIn" style={{ animationDelay: '400ms' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800/50 dark:text-emerald-400/50 mb-4 px-2 flex items-center gap-2">
                                <Icon name="bell" className="w-4 h-4" />
                                Notifications
                            </h3>
                            <NotificationCard />
                        </div>
                    </div>

                </div>

                {/* --- FULL WIDTH SECTION: THE SEASON MAP --- */}
                <div className="mt-6 animate-fadeIn" style={{ animationDelay: '500ms' }}>
                    <Card className="p-8 md:p-10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-800/50 dark:text-emerald-400/50 mb-8 flex items-center gap-2 px-2">
                            <Icon name="calendar" className="w-4 h-4" />
                            Season Map
                        </h3>
                        <div className="px-2">
                            <ActivityHeatmap activity={stats.activity} />
                        </div>
                    </Card>
                </div>

                {/* Footer Quote */}
                <footer className="mt-20 py-10 text-center opacity-30 select-none pointer-events-none">
                    <p className="font-serif italic text-lg dark:text-emerald-100">"Patience is the gardener's greatest tool."</p>
                </footer>

                <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Seed Storage Sync">
                    <div className="p-8 dark:bg-emerald-950/20 backdrop-blur-2xl">
                        <p className="text-sm dark:text-emerald-100/60 mb-6 leading-relaxed">Your latest growth data is being carefully gathered. If a seed fails to plant, you can retry here.</p>
                        <NeedsAttentionList />
                    </div>
                </Modal>

            </div>
        </div>
    );
};

export default HomeScreen;