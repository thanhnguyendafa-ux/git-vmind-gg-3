
import * as React from 'react';
import Icon from '../../../components/ui/Icon';
import { useUserStore } from '../../../stores/useUserStore';
import { Card, CardContent } from '../../../components/ui/Card';

const DAILY_GOAL_SECONDS = 5 * 60; // 5 minutes

const StreakCard: React.FC = () => {
    const stats = useUserStore(state => state.stats);

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

    return (
        <Card className="relative overflow-hidden bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800/50">
             <CardContent className="p-4 relative z-10 flex items-center justify-between h-full">
                 <div>
                    <p className="text-[10px] font-bold text-warning-600 dark:text-warning-400/80 uppercase tracking-wider mb-0.5">Current Streak</p>
                    <div className="flex items-baseline gap-1">
                         <span className="text-3xl font-black text-warning-600 dark:text-warning-400 font-nunitosans leading-none tracking-tighter drop-shadow-sm">
                             {studyStreak}
                         </span>
                         <span className="text-xs font-bold text-warning-600 dark:text-warning-400">days</span>
                    </div>
                 </div>
                 <div className="p-2 bg-warning-200/50 dark:bg-warning-500/20 rounded-full">
                    <Icon name="fire" variant="filled" className="w-6 h-6 text-warning-500 animate-pulse" />
                 </div>
             </CardContent>
             {/* Decorative background glow */}
             <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-warning-400/20 blur-3xl rounded-full pointer-events-none" />
        </Card>
    );
};

export default StreakCard;
