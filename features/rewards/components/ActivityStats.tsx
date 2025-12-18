import * as React from 'react';
import { useUserStore } from '../../../stores/useUserStore';
import { UserStats } from '../../../types';
import { formatShortDuration, getLocalDateString } from '../../../utils/timeUtils';
import ActivityHeatmap from '../../home/components/ActivityHeatmap';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';

type Tab = 'today' | 'week' | 'month' | 'year';

const ActivityStats: React.FC = () => {
    const { stats } = useUserStore();
    const [activeTab, setActiveTab] = React.useState<Tab>('week');

    const todayString = getLocalDateString(new Date());
    const timeToday = stats.activity[todayString] || 0;

    const weekData = React.useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 for Sunday
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - dayOfWeek);
        
        const data = [];
        let totalSeconds = 0;
        for (let i = 0; i < 7; i++) {
            const day = new Date(startDate);
            day.setDate(startDate.getDate() + i);
            const dateString = getLocalDateString(day);
            const seconds = stats.activity[dateString] || 0;
            totalSeconds += seconds;
            data.push({
                label: day.toLocaleDateString('en-US', { weekday: 'short' }),
                seconds: seconds
            });
        }
        const maxSeconds = Math.max(...data.map(d => d.seconds));
        return { data, totalSeconds, maxSeconds: maxSeconds > 0 ? maxSeconds : 1 };
    }, [stats.activity]);

    const monthData = React.useMemo(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        let totalSeconds = 0;
        // Padding for the first day of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push({ key: `pad-${i}`, isPadding: true });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const day = new Date(year, month, i);
            const dateString = getLocalDateString(day);
            const seconds = stats.activity[dateString] || 0;
            totalSeconds += seconds;
            days.push({ key: dateString, date: i, seconds, isPadding: false, isToday: dateString === todayString });
        }
        return { days, totalSeconds };
    }, [stats.activity, todayString]);
    
    const getColor = (count: number | undefined) => {
        if (!count || count === 0) return 'bg-secondary-200 dark:bg-secondary-700/60';
        if (count < 300) return 'bg-primary-200 dark:bg-primary-900';
        if (count < 900) return 'bg-primary-300 dark:bg-primary-700';
        if (count < 1800) return 'bg-primary-400 dark:bg-primary-500';
        return 'bg-primary-500 dark:bg-primary-400';
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'today':
                return (
                    <div className="text-center p-8">
                        <p className="text-text-subtle mb-1">Total study time today</p>
                        <p className="text-5xl font-bold text-primary-600 dark:text-primary-400">{formatShortDuration(timeToday)}</p>
                    </div>
                );
            case 'week':
                return (
                    <div className="p-4">
                        <p className="text-center text-sm text-text-subtle mb-4">Total this week: <span className="font-bold text-text-main dark:text-secondary-100">{formatShortDuration(weekData.totalSeconds)}</span></p>
                        <div className="flex justify-between items-end gap-2 h-32">
                            {weekData.data.map((day, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full h-full flex items-end">
                                        <div className="w-full bg-primary-500 rounded-t-md hover:bg-primary-400 transition-colors" style={{ height: `${(day.seconds / weekData.maxSeconds) * 100}%` }} title={`${formatShortDuration(day.seconds)}`}></div>
                                    </div>
                                    <p className="text-xs text-text-subtle">{day.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'month':
                 return (
                    <div className="p-4">
                         <p className="text-center text-sm text-text-subtle mb-4">Total this month: <span className="font-bold text-text-main dark:text-secondary-100">{formatShortDuration(monthData.totalSeconds)}</span></p>
                        <div className="grid grid-cols-7 gap-1">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d} className="text-center text-xs font-bold text-text-subtle">{d}</div>)}
                            {monthData.days.map(day => day.isPadding ? <div key={day.key}></div> : (
                                <div key={day.key} className={`w-full aspect-square rounded-md flex items-center justify-center ${getColor(day.seconds)} ${day.isToday ? 'ring-2 ring-primary-500' : ''}`} title={`${day.key}: ${formatShortDuration(day.seconds)}`}>
                                    <span className="text-xs text-text-main dark:text-secondary-300 font-medium mix-blend-difference">{day.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'year':
                return <div className="p-2 sm:p-0"><ActivityHeatmap activity={stats.activity} title="Yearly Activity" /></div>;
        }
    };

    return (
        <Card className="mb-6">
            <CardHeader className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                <CardTitle className="text-base text-primary-600 dark:text-primary-400">Study Activity</CardTitle>
                <div className="flex rounded-full bg-secondary-200 dark:bg-secondary-700 p-1 text-sm font-semibold w-full sm:w-fit mt-2">
                    <button onClick={() => setActiveTab('today')} className={`px-3 py-1 rounded-full flex-1 ${activeTab === 'today' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Today</button>
                    <button onClick={() => setActiveTab('week')} className={`px-3 py-1 rounded-full flex-1 ${activeTab === 'week' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Week</button>
                    <button onClick={() => setActiveTab('month')} className={`px-3 py-1 rounded-full flex-1 ${activeTab === 'month' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Month</button>
                    <button onClick={() => setActiveTab('year')} className={`px-3 py-1 rounded-full flex-1 ${activeTab === 'year' ? 'bg-white dark:bg-secondary-600 shadow' : ''}`}>Year</button>
                </div>
            </CardHeader>
            <CardContent className="p-2">
                {renderContent()}
            </CardContent>
        </Card>
    );
};

export default ActivityStats;