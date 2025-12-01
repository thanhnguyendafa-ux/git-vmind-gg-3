
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import Icon from '../../components/ui/Icon';
import { useUserStore } from '../../stores/useUserStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import ActivityHeatmap from './components/ActivityHeatmap';
import TimeSpentBarChart from './components/TimeSpentBarChart';
import { formatShortDuration } from '../../utils/timeUtils';
import { Card, CardContent } from '../../components/ui/Card';
import TableIcon from '../../components/ui/TableIcon';
import { NotificationCard } from './components/NotificationCard';
import Modal from '../../components/ui/Modal';
import { NeedsAttentionList } from '../../components/ui/NeedsAttentionList';
import { useTableStats } from '../tables/hooks/useTableStats';
import { Button } from '../../components/ui/Button';
import { VmindSyncEngine } from '../../services/VmindSyncEngine';

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
            <Button variant="secondary" size="sm" onClick={handlePull} disabled={isPulling || isPushing || isPullDisabled}>
                {isPulling ? <Icon name="spinner" className="animate-spin w-4 h-4 mr-2" /> : <Icon name="arrow-down-tray" className="w-4 h-4 mr-2" />}
                Pull
            </Button>
            <div className="flex rounded-md shadow-sm">
                <Button variant="secondary" size="sm" onClick={handlePush} disabled={pendingCount === 0 || isPushing || isPulling} className="rounded-r-none">
                    {isPushing ? <Icon name="spinner" className="animate-spin w-4 h-4 mr-2" /> : <Icon name="arrow-up-tray" className="w-4 h-4 mr-2" />}
                    Push {pendingCount > 0 ? `(${pendingCount})` : ''}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setIsSyncModalOpen(true)} disabled={pendingCount === 0} className="rounded-l-none -ml-px px-2">
                    {hasFailedItems ? <Icon name="error-circle" className="w-4 h-4 text-error-500" /> : <Icon name="list-bullet" className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
};


const QuickStat: React.FC<{ icon: string; label: string; value: string | number; }> = ({ icon, label, value }) => (
    <div className="bg-white/50 dark:bg-secondary-700/30 p-3 rounded-lg flex items-center gap-3 transition-colors">
        <Icon name={icon} className="w-6 h-6 text-primary-500" />
        <div>
            <p className="text-xs text-text-subtle">{label}</p>
            <p className="text-lg font-bold text-text-main dark:text-secondary-100">{value}</p>
        </div>
    </div>
);


const HomeScreen: React.FC = () => {
  const { stats, isGuest, handleLogout } = useUserStore();
  // Optimization: Use the new memoized selector hook for derived stats.
  const { wordsMastered, totalWords } = useTableStats();

  const recentlyStudiedTables = useTableStore(useShallow(state =>
    state.tables
      .map(table => {
        const lastStudiedTimes = table.rows.map(w => w.stats.lastStudied).filter(Boolean) as number[];
        const mostRecent = Math.max(0, ...lastStudiedTimes);
        return { id: table.id, name: table.name, rowCount: table.rowCount ?? table.rows.length, mostRecent };
      })
      .filter(table => table.mostRecent > 0)
      .sort((a, b) => b.mostRecent - a.mostRecent)
      .slice(0, 4)
  ));

  const { theme, toggleTheme, isSyncModalOpen, setIsSyncModalOpen } = useUIStore();
  const { handleSelectTable } = useSessionStore();

  const DAILY_GOAL_SECONDS = 5 * 60; // 5 minutes

  const studyStreak = React.useMemo(() => {
        let streakCount = 0;
        const activity = stats.activity || {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let dayToCheck = new Date(today);

        const todayGoalMet = (activity[today.toISOString().split('T')[0]] || 0) >= DAILY_GOAL_SECONDS;

        if (!todayGoalMet) {
            dayToCheck.setDate(dayToCheck.getDate() - 1);
        }

        while (true) {
            const dateStr = dayToCheck.toISOString().split('T')[0];
            if ((activity[dateStr] || 0) >= DAILY_GOAL_SECONDS) {
                streakCount++;
                dayToCheck.setDate(dayToCheck.getDate() - 1);
            } else {
                break; // Streak broken
            }
        }
        return streakCount;
    }, [stats.activity]);
  
  const activityData = React.useMemo(() => {
    const activity = stats.activity || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    let thisWeek = 0;

    for (const dateStr in activity) {
        const date = new Date(dateStr + 'T00:00:00Z');
        if (date >= thisWeekStart) {
            thisWeek += activity[dateStr];
        }
    }
    
    return {
        today: activity[today.toISOString().split('T')[0]] || 0,
        thisWeek,
    };
  }, [stats.activity]);


  return (
    <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
      <header className="mb-6 flex justify-between items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-400">Vmind</h1>
          <p className="text-sm text-text-subtle">Your personal vocabulary space.</p>
        </div>
        <div className='flex items-center gap-2'>
            {!isGuest && <PushPullControls />}
            <button onClick={toggleTheme} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="w-6 h-6" />
            </button>
            {!isGuest && (
                 <button onClick={handleLogout} title="Logout" className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors">
                    <Icon name="logout" className="w-6 h-6" />
                </button>
            )}
        </div>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* --- Left Column --- */}
        <div className="lg:col-span-2 space-y-6">
            <NotificationCard />
            
            {/* --- New Bar Chart Component --- */}
            <TimeSpentBarChart />

            <Card className="border border-secondary-300 dark:bg-secondary-800 dark:border dark:border-secondary-700 transition-colors">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-6xl font-bold text-amber-600 dark:text-amber-400 font-nunitosans">{studyStreak}</p>
                        <p className="text-text-subtle font-semibold">Day Streak</p>
                    </div>
                    <Icon name="fire" variant={studyStreak > 0 ? 'filled' : 'outline'} className={`w-24 h-24 transition-colors ${studyStreak > 0 ? 'text-orange-400' : 'text-secondary-400 dark:text-secondary-600'}`} />
                </CardContent>
            </Card>

            <Card className="border border-secondary-300 dark:bg-secondary-800 dark:border dark:border-secondary-700 transition-colors">
                <CardContent className="p-4 grid grid-cols-2 gap-3">
                    <QuickStat icon="sun" label="Today's Study" value={formatShortDuration(activityData.today)} />
                    <QuickStat icon="calendar" label="This Week" value={formatShortDuration(activityData.thisWeek)} />
                    <QuickStat icon="star" label="Words Mastered" value={wordsMastered} />
                    <QuickStat icon="list-bullet" label="Total Words" value={totalWords.toLocaleString()} />
                </CardContent>
            </Card>
        </div>
        
        {/* --- Right Column --- */}
        <div className="lg:col-span-3 space-y-6">
            <ActivityHeatmap activity={stats.activity} />
            
            {recentlyStudiedTables.length > 0 && (
                <Card className="border border-secondary-300 dark:bg-secondary-800 dark:border dark:border-secondary-700 transition-colors">
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-text-main dark:text-secondary-100 mb-2">Recently Studied</h3>
                        <div className="space-y-2">
                            {recentlyStudiedTables.map(table => (
                                <button key={table.id} onClick={() => handleSelectTable(table.id)} className="w-full text-left p-3 flex items-center justify-between rounded-lg hover:bg-white/50 dark:hover:bg-secondary-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <TableIcon className="w-5 h-5 text-text-subtle" />
                                        <div>
                                            <p className="font-semibold text-sm text-text-main dark:text-secondary-200 truncate">{table.name}</p>
                                            <p className="text-xs text-text-subtle">{table.rowCount} words</p>
                                        </div>
                                    </div>
                                    <Icon name="arrowRight" className="w-5 h-5 text-secondary-400 dark:text-secondary-500" />
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
        
      </div>

      <Modal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} title="Sync Queue">
            <div className="p-6">
                <p className="text-sm text-text-subtle mb-4">Items in the queue are waiting to be synced to the cloud. If items fail, you can retry them here.</p>
                <NeedsAttentionList />
            </div>
      </Modal>

    </div>
  );
};

export default HomeScreen;
