
import React, { useMemo, useState, useEffect } from 'react';
import { useUserStore } from '../../../stores/useUserStore';
import { formatDuration, formatShortDuration, getLocalDateString } from '../../../utils/timeUtils';
import Icon from '../../../components/ui/Icon';
import { Card, CardHeader, CardContent, CardTitle } from '../../../components/ui/Card';

interface ChartData {
    label: string;
    value: number; // in seconds
    isHighlight?: boolean;
    fullDate?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface TimeSpentBarChartProps {
    isEmbedded?: boolean;
}

const TimeSpentBarChart: React.FC<TimeSpentBarChartProps> = ({ isEmbedded = false }) => {
    const activity = useUserStore(state => state.stats.activity);
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [isInitialRender, setIsInitialRender] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsInitialRender(false), 100);
        return () => clearTimeout(timer);
    }, []);

    const { data, maxValue, totalTime, maxIndex, yAxisTicks, domainMax } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let chartData: ChartData[] = [];

        const getDuration = (dateStr: string): number => {
            const val = activity[dateStr];
            if (typeof val === 'number') return val;
            if (val && typeof val === 'object') return val.total || 0;
            return 0;
        };

        if (viewMode === 'day') {
            chartData = Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(today);
                date.setDate(today.getDate() - (6 - i));
                const dateString = getLocalDateString(date);
                return {
                    label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                    value: getDuration(dateString),
                    isHighlight: i === 6,
                    fullDate: date.toLocaleDateString(undefined, { weekday: 'long' })
                };
            });
        } else if (viewMode === 'week') {
            chartData = Array.from({ length: 4 }).map((_, i) => {
                const weekNum = 3 - i;
                const endDate = new Date(today);
                endDate.setDate(today.getDate() - (weekNum * 7));
                const dayOfWeek = endDate.getDay();
                const weekStart = new Date(endDate);
                weekStart.setDate(endDate.getDate() - dayOfWeek);

                let weekTotal = 0;
                for (let j = 0; j < 7; j++) {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + j);
                    if (date > today) continue;
                    const dateString = getLocalDateString(date);
                    weekTotal += getDuration(dateString);
                }
                return {
                    label: weekNum === 0 ? 'This Wk' : weekNum === 1 ? 'Last Wk' : `W-${weekNum}`,
                    value: weekTotal,
                    isHighlight: weekNum === 0,
                    fullDate: `Week of ${weekStart.toLocaleDateString()}`
                };
            });
        } else if (viewMode === 'month') {
            chartData = Array.from({ length: 12 }).map((_, i) => {
                const date = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
                const year = date.getFullYear();
                const month = date.getMonth();
                let monthTotal = 0;
                for (const dateString in activity) {
                    const activityDate = new Date(dateString);
                    if (activityDate.getFullYear() === year && activityDate.getMonth() === month) {
                        monthTotal += getDuration(dateString);
                    }
                }
                return {
                    // Use narrow for mobile, short for desktop with truncation safety
                    label: date.toLocaleDateString('en-US', { month: 'narrow' }),
                    value: monthTotal,
                    isHighlight: month === today.getMonth() && year === today.getFullYear(),
                    fullDate: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                };
            });
        } else { // year (12-month view of current year)
            const currentYear = today.getFullYear();
            chartData = Array.from({ length: 12 }).map((_, i) => {
                const date = new Date(currentYear, i, 1);
                const month = i;
                let monthTotal = 0;

                for (const dateString in activity) {
                    const activityDate = new Date(dateString);
                    if (activityDate.getFullYear() === currentYear && activityDate.getMonth() === month) {
                        monthTotal += getDuration(dateString);
                    }
                }
                return {
                    label: date.toLocaleDateString('en-US', { month: 'narrow' }), // J, F, M...
                    value: monthTotal,
                    isHighlight: i === today.getMonth(),
                    fullDate: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
                };
            });
        }

        const maxVal = Math.max(...chartData.map(d => d.value), 0);
        const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
        const maxIdx = chartData.length > 0 ? chartData.reduce((maxIndex, item, index, arr) => item.value > arr[maxIndex].value ? index : maxIndex, 0) : -1;

        const getDomainMax = (max: number): number => {
            if (max <= 0) return 60 * 15; // Min 15 mins
            const minutes = max / 60;
            if (minutes <= 15) return 60 * 15;
            if (minutes <= 30) return 60 * 30;
            if (minutes <= 45) return 60 * 45;
            if (minutes <= 60) return 60 * 60;
            const hours = Math.ceil(minutes / 60);
            return hours * 60 * 60;
        };

        const domainMax = getDomainMax(maxVal);
        const tickCount = 5;
        const ticks = [];
        const interval = domainMax / (tickCount - 1);

        for (let i = 0; i < tickCount; i++) {
            const value = Math.round(i * interval);
            ticks.push({ value, label: formatShortDuration(value) });
        }

        ticks[ticks.length - 1] = { value: domainMax, label: formatShortDuration(domainMax) };

        return { data: chartData, maxValue: maxVal, totalTime: total, maxIndex: maxIdx, yAxisTicks: ticks, domainMax };
    }, [viewMode, activity]);

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="p-3 sm:p-4 pb-2 border-b border-secondary-100 dark:border-secondary-700/50 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Icon name="chart-bar" className="w-4 h-4 sm:w-5 sm:h-5" />
                    Focus Trends
                </CardTitle>

                <div className="flex bg-secondary-100 dark:bg-secondary-700/50 rounded-lg p-0.5 sm:p-1 gap-0.5 sm:gap-1 overflow-x-auto max-w-[60%] sm:max-w-none no-scrollbar">
                    {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-2 sm:px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider whitespace-nowrap ${viewMode === mode
                                ? 'bg-white dark:bg-secondary-600 shadow-sm text-primary-600 dark:text-primary-400'
                                : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                                }`}
                        >
                            {mode}
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-end">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <p className="text-[10px] sm:text-xs text-text-subtle font-medium uppercase tracking-wide">Total Time</p>
                        <p className="text-xl sm:text-2xl font-bold text-text-main dark:text-secondary-100">{formatDuration(totalTime)}</p>
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4 h-32 sm:h-40 relative">
                    {/* Y AXIS LABELS */}
                    <div className="relative flex-shrink-0 w-8 sm:w-10 text-right text-[9px] sm:text-[10px] text-text-subtle font-medium">
                        {yAxisTicks.map(tick => (
                            <span
                                key={`label-${tick.value}`}
                                className="absolute right-0 transform -translate-y-1/2"
                                style={{ bottom: `${(tick.value / domainMax) * 100}%` }}
                            >
                                {tick.label}
                            </span>
                        ))}
                    </div>

                    {/* CHART AREA */}
                    <div className="flex-1 relative overflow-hidden min-w-0">
                        {/* GRID LINES */}
                        {yAxisTicks.map((tick, index) => index > 0 && (
                            <div
                                key={`grid-${tick.value}`}
                                className="absolute w-full border-t border-dashed border-secondary-200 dark:border-secondary-700/50"
                                style={{ bottom: `${(tick.value / domainMax) * 100}%` }}>
                            </div>
                        ))}

                        {/* BARS - Using dynamic gap and flex-1 1 0% for perfect distribution */}
                        <div className={`absolute inset-0 flex items-end justify-between ${data.length > 7 ? 'gap-0.5 sm:gap-1' : 'gap-1 sm:gap-3'}`}>
                            {data.map((item, index) => {
                                const heightPercent = domainMax > 0 ? (item.value / domainMax) * 100 : 0;
                                const isHovered = hoveredIndex === index;
                                const isMax = index === maxIndex && item.value > 0;

                                return (
                                    <div key={`${viewMode}-${index}`} className="flex-[1_1_0%] min-w-0 flex flex-col items-center group relative h-full justify-end"
                                        onMouseEnter={() => setHoveredIndex(index)}
                                        onMouseLeave={() => setHoveredIndex(null)}
                                        aria-label={`${item.label}: ${formatDuration(item.value)}`}
                                    >
                                        {/* Tooltip */}
                                        <div className={`absolute -bottom-10 sm:-top-12 left-1/2 -translate-x-1/2 bg-secondary-800 text-white text-[10px] sm:text-xs rounded-lg py-1 px-2 sm:px-3 whitespace-nowrap transition-all duration-200 z-20 pointer-events-none shadow-xl ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
                                            <div className="font-bold text-center">{formatShortDuration(item.value)}</div>
                                            {item.fullDate && <div className="text-[9px] opacity-75 text-center font-normal">{item.fullDate}</div>}
                                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary-800 rotate-45"></div>
                                        </div>

                                        <div className="w-full max-w-[2rem] relative flex items-end h-full rounded-t-sm sm:rounded-t-lg">
                                            {isMax && (
                                                <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 text-amber-400 z-10 transition-transform duration-300 group-hover:scale-125">
                                                    <Icon name="star" variant="filled" className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                </div>
                                            )}
                                            <div className={`w-full rounded-t-sm sm:rounded-t-lg transition-all duration-500 ease-out relative ${item.isHighlight ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'} ${isHovered ? 'opacity-90' : 'opacity-100'}`}
                                                style={{ height: isInitialRender ? '0%' : `${heightPercent}%`, transitionDelay: `${index * 30}ms` }}
                                            >
                                                {item.isHighlight && <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-sm sm:rounded-t-lg"></div>}
                                            </div>
                                        </div>
                                        <span className={`text-[9px] sm:text-[10px] mt-1 sm:mt-2 font-bold w-full text-center transition-colors truncate ${item.isHighlight ? 'text-primary-600 dark:text-primary-400' : 'text-text-subtle group-hover:text-text-main'}`}>
                                            {item.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default TimeSpentBarChart;
