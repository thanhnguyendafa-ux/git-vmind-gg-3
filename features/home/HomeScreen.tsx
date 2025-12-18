import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import ActivityHeatmap from './components/ActivityHeatmap';
import TimeSpentBarChart from './components/TimeSpentBarChart';
import { formatShortDuration, formatDuration, getLocalDateString } from '../../utils/timeUtils';
import { Card, CardContent } from '../../components/ui/Card';
import { NotificationCard } from './components/NotificationCard';
import Modal from '../../components/ui/Modal';
import { NeedsAttentionList } from '../../components/ui/NeedsAttentionList';
import { Button } from '../../components/ui/Button';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';
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
            <Button variant="secondary" size="sm" onClick={handlePull} disabled={isPulling || isPushing || isPullDisabled} className="px-2 sm:px-3">
                {isPulling ? <Icon name="spinner" className="animate-spin w-4 h-4 sm:mr-2" /> : <Icon name="arrow-down-tray" className="w-4 h-4 sm:mr-2" />}
                <span className="hidden sm:inline">Pull</span>
            </Button>
            <div className="flex rounded-md shadow-sm">
                <Button variant="secondary" size="sm" onClick={handlePush} disabled={pendingCount === 0 || isPushing || isPulling} className="rounded-r-none px-2 sm:px-3">
                    {isPushing ? <Icon name="spinner" className="animate-spin w-4 h-4 sm:mr-2" /> : <Icon name="arrow-up-tray" className="w-4 h-4 sm:mr-2" />}
                    <span className="hidden sm:inline">Push {pendingCount > 0 ? `(${pendingCount})` : ''}</span>
                    <span className="inline sm:hidden">{pendingCount > 0 ? `(${pendingCount})` : ''}</span>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsSyncModalOpen(true)} disabled={pendingCount === 0} className="rounded-l-none -ml-px px-2">
                    {hasFailedItems ? <Icon name="error-circle" className="w-4 h-4 text-error-500" /> : <Icon name="list-bullet" className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
};

const QuickStatPill: React.FC<{ icon: string; label: string; value: string | number; onClick?: () => void }> = ({ icon, label, value, onClick }) => (
    <div 
        onClick={onClick}
        className={`
            flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 rounded-xl 
            bg-surface/80 dark:bg-secondary-800/80 backdrop-blur-md
            border border-secondary-200 dark:border-secondary-700 
            w-full shadow-sm transition-all
            ${onClick ? 'cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700 hover:border-primary-200 dark:hover:border-primary-800 hover:-translate-y-0.5' : ''}
        `}
    >
        <div className="p-1.5 sm:p-2 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-500 flex-shrink-0">
            <Icon name={icon} className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-subtle truncate">{label}</p>
            <p className="text-base sm:text-lg font-bold text-text-main dark:text-secondary-100 leading-none mt-0.5 truncate">{value}</p>
        </div>
    </div>
);

// Wrapper for ActivityHeatmap to be a first-class Dashboard Widget
// Updated to support Glassmorphism
const HeatmapCard: React.FC<{ activity: any }> = ({ activity }) => {
    return (
        <Card className="flex flex-col bg-surface/80 dark:bg-secondary-800/80 backdrop-blur-md border border-secondary-200/50 dark:border-secondary-700/50">
            <CardContent className="p-4 flex-1 flex flex-col justify-center">
                <ActivityHeatmap activity={activity} />
            </CardContent>
        </Card>
    );
};

const HomeScreen: React.FC = () => {
  const { stats, isGuest, handleLogout, session } = useUserStore();
  const { wordsMastered, totalWords } = useTableStats();
  const { theme, toggleTheme, isSyncModalOpen, setIsSyncModalOpen, setCurrentScreen, triggerGlobalAction } = useUIStore();
  
  const greeting = React.useMemo(() => {
      const hour = new Date().getHours();
      let timeGreeting = "Good Evening";
      if (hour < 5) timeGreeting = "Burning the Midnight Oil?";
      else if (hour < 12) timeGreeting = "Good Morning";
      else if (hour < 18) timeGreeting = "Good Afternoon";
      
      const userName = !isGuest && session?.user?.email ? session.user.email.split('@')[0] : 'Scholar';
      const formattedName = userName.charAt(0).toUpperCase() + userName.slice(1);
      
      return `${timeGreeting}, ${formattedName}!`;
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
    <div className="relative h-full w-full overflow-hidden">
      {/* 1. The Atmosphere */}
      <AuroraBackground />

      {/* 2. The Content Layer */}
      <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden p-4 sm:p-6 animate-fadeIn pb-32">
        <header className="mb-6 flex flex-wrap justify-between items-center gap-4">
            <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-400 truncate">{greeting}</h1>
            <p className="text-sm text-text-subtle">Your personal vocabulary space.</p>
            </div>
            <div className='flex items-center gap-2'>
                {!isGuest && <PushPullControls />}
                <button onClick={toggleTheme} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200/50 dark:hover:bg-secondary-700/50 transition-colors backdrop-blur-sm">
                <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-6 h-6" />
                </button>
                {!isGuest && (
                    <button onClick={handleGuardedLogout} title="Logout" className="p-2 rounded-full text-text-subtle hover:bg-secondary-200/50 dark:hover:bg-secondary-700/50 transition-colors backdrop-blur-sm">
                        <Icon name="logout" className="w-6 h-6" />
                    </button>
                )}
            </div>
        </header>

        {/* --- DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 sm:mb-8">
            
            {/* ROW 1: Hero Section */}
            {/* Garden: Centerpiece */}
            <div className="md:col-span-2 lg:col-span-3 h-64 sm:h-80 lg:h-auto min-h-[300px] transition-transform hover:scale-[1.005] duration-500 ease-out">
                <RestorationGarden isAwake={isAwake} className="h-full w-full shadow-xl bg-surface/40 backdrop-blur-sm" />
            </div>
            
            {/* Side Stack: Streak & Notifications */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col gap-6 h-full justify-between">
                <div className="flex-1 transition-transform hover:-translate-y-1 duration-300 min-h-[100px]">
                    <StreakCard />
                </div>
                <div className="flex-1 transition-transform hover:-translate-y-1 duration-300">
                    <NotificationCard />
                </div>
            </div>

            {/* ROW 2: Quick Stats */}
            {/* Spans full width, uses its own internal grid */}
            <div className="col-span-1 md:col-span-2 lg:col-span-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <QuickStatPill icon="sun" label="Today" value={formatShortDuration(activityData.today)} />
                    <QuickStatPill icon="calendar" label="Week" value={formatShortDuration(activityData.thisWeek)} />
                    <QuickStatPill icon="star" label="Mastered" value={wordsMastered} />
                    <QuickStatPill icon="list-bullet" label="Total Words" value={totalWords.toLocaleString()} />
                    <div className="col-span-2 md:col-span-1 lg:col-span-1">
                        <QuickStatPill icon="clock" label="Total Focus" value={formatDuration(stats.totalStudyTime)} onClick={() => setCurrentScreen(Screen.Stats)} />
                    </div>
                </div>
            </div>

            {/* ROW 3: Data Visualization */}
            
            {/* Heatmap Widget - Fits Content height-wise, full width */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 h-auto self-start">
                <HeatmapCard activity={stats.activity} />
            </div>

            {/* Focus Time Widget */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[250px]">
                <TimeSpentBarChart />
            </div>

            {/* ROW 4: Actionable Widgets (Split 2-2) */}
            <div className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[250px]">
                <RecentStudiesCard />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-2 min-h-[250px]">
                <ActivityPulseWidget />
            </div>

        </div>

        <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sync Queue">
                <div className="p-6">
                    <p className="text-sm text-text-subtle mb-4">Items in the queue are waiting to be synced to the cloud. If items fail, you can retry them here.</p>
                    <NeedsAttentionList />
                </div>
        </Modal>

      </div>
    </div>
  );
};

export default HomeScreen;