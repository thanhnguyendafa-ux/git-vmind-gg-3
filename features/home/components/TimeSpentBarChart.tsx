
import React, { useMemo, useState, useEffect } from 'react';
import { useUserStore } from '../../../stores/useUserStore';
import { formatDuration, formatShortDuration } from '../../../utils/timeUtils';
import Icon from '../../../components/ui/Icon';

interface ChartData {
  label: string;
  value: number; // in seconds
  isHighlight?: boolean;
  fullDate?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

const TimeSpentBarChart: React.FC = () => {
  const activity = useUserStore(state => state.stats.activity);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialRender(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data, maxValue, totalTime, maxIndex } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let chartData: ChartData[] = [];

    if (viewMode === 'day') {
        chartData = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            const dateString = date.toISOString().split('T')[0];
            return {
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: activity[dateString] || 0,
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
                const dateString = date.toISOString().split('T')[0];
                weekTotal += activity[dateString] || 0;
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
                    monthTotal += activity[dateString];
                }
            }
            return {
                label: date.toLocaleDateString('en-US', { month: 'short' }),
                value: monthTotal,
                isHighlight: month === today.getMonth() && year === today.getFullYear(),
                fullDate: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            };
        });
    } else { // year
        const currentYear = today.getFullYear();
        chartData = Array.from({ length: 3 }).map((_, i) => {
            const year = currentYear - (2 - i);
            let yearTotal = 0;
            for (const dateString in activity) {
                if (new Date(dateString).getFullYear() === year) {
                    yearTotal += activity[dateString];
                }
            }
            return { label: year.toString(), value: yearTotal, isHighlight: year === currentYear, fullDate: `Year ${year}` };
        });
    }

    const maxVal = Math.max(...chartData.map(d => d.value), 1);
    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
    const maxIdx = chartData.length > 0 ? chartData.reduce((maxIndex, item, index, arr) => item.value > arr[maxIndex].value ? index : maxIndex, 0) : -1;

    return { data: chartData, maxValue: maxVal, totalTime: total, maxIndex: maxIdx };
  }, [viewMode, activity]);
  
  const yAxisTicks = useMemo(() => {
    if (maxValue <= 1) return [{ value: 0, label: '0m' }];
    const ticks = [];
    const tickCount = 4;
    const niceMaxValue = Math.ceil(maxValue / (60 * 15)) * (60 * 15); // Round up to nearest 15 mins
    const interval = Math.max(niceMaxValue / (tickCount - 1), 60);

    for (let i = 0; i < tickCount; i++) {
        const value = i * interval;
        ticks.push({ value: value > maxValue * 1.1 ? maxValue : value, label: formatShortDuration(value) });
    }
    return ticks;
  }, [maxValue]);


  return (
    <div className="w-full bg-surface dark:bg-secondary-800 rounded-2xl p-6 shadow-sm border border-secondary-200 dark:border-secondary-700 transition-all">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="font-bold text-text-main dark:text-secondary-100 text-lg">Focus Time</h3>
          <p className="text-sm text-text-subtle mt-1">
            Total: <span className="font-semibold text-primary-600 dark:text-primary-400">{formatDuration(totalTime)}</span>
          </p>
        </div>
        <div className="flex bg-secondary-100 dark:bg-secondary-700/50 rounded-full p-1 gap-1 self-end sm:self-auto">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                <button 
                    key={mode}
                    onClick={() => setViewMode(mode)} 
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 capitalize ${
                        viewMode === mode
                            ? 'bg-white dark:bg-secondary-600 shadow-sm text-primary-600 dark:text-primary-400 scale-105' 
                            : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                    }`}
                >
                    {mode}
                </button>
            ))}
        </div>
      </div>

      <div className="flex gap-4 h-48">
          <div className="flex flex-col justify-between text-right text-[10px] text-text-subtle font-medium">
              {yAxisTicks.slice().reverse().map(tick => <span key={tick.value}>{tick.label}</span>)}
          </div>
          <div className="flex-1 relative">
              {yAxisTicks.map((tick, index) => index > 0 && (
                  <div key={tick.value} className="absolute w-full border-t border-dashed border-secondary-200 dark:border-secondary-700/50"
                       style={{ bottom: `calc(${(tick.value / yAxisTicks[yAxisTicks.length - 1].value) * 100}% - 1px)` }}>
                  </div>
              ))}
              <div className="absolute inset-0 flex items-end justify-between gap-2 sm:gap-3">
                  {data.map((item, index) => {
                      const heightPercent = Math.max((item.value / maxValue) * 100, 2);
                      const isHovered = hoveredIndex === index;
                      const isMax = index === maxIndex && item.value > 0;

                      return (
                          <div key={`${viewMode}-${index}`} className="flex-1 flex flex-col items-center group relative h-full justify-end"
                               onMouseEnter={() => setHoveredIndex(index)}
                               onMouseLeave={() => setHoveredIndex(null)}
                               aria-label={`${item.label}: ${formatDuration(item.value)}`}
                               role="graphics-symbol"
                          >
                              <div className={`absolute -top-12 left-1/2 -translate-x-1/2 bg-secondary-800 text-white text-xs rounded-lg py-1.5 px-3 whitespace-nowrap transition-all duration-200 z-20 pointer-events-none shadow-xl ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
                                  <div className="font-bold text-center">{formatShortDuration(item.value)}</div>
                                  {item.fullDate && <div className="text-[10px] opacity-75 text-center font-normal">{item.fullDate}</div>}
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary-800 rotate-45"></div>
                              </div>
                              
                              <div className="w-full max-w-[2.5rem] relative flex items-end h-full rounded-t-lg">
                                 {isMax && (
                                     <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-amber-400 z-10 transition-transform duration-300 group-hover:scale-125">
                                         <Icon name="star" variant="filled" className="w-4 h-4" />
                                     </div>
                                 )}
                                 <div className={`w-full rounded-t-lg transition-all duration-500 ease-out relative ${item.isHighlight ? 'bg-primary-500' : 'bg-secondary-300 dark:bg-secondary-600'} ${isHovered ? 'opacity-90' : 'opacity-100'}`}
                                      style={{ height: isInitialRender ? '2%' : `${heightPercent}%`, transitionDelay: `${index * 30}ms` }}
                                 >
                                    {item.isHighlight && <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-lg"></div>}
                                 </div>
                              </div>
                              <span className={`text-[10px] sm:text-xs mt-2 font-bold w-full text-center transition-colors ${item.isHighlight ? 'text-primary-600 dark:text-primary-400' : 'text-text-subtle group-hover:text-text-main'}`}>
                                  {item.label}
                              </span>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>
    </div>
  );
};

export default TimeSpentBarChart;
