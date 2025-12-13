

import React, { useMemo, useState, useEffect } from 'react';
import { useUserStore } from '../../../stores/useUserStore';
import { getLocalDateString } from '../../../utils/timeUtils';
import Icon from '../../../components/ui/Icon';

interface ChartData {
  label: string;
  value: number; // number of reviews
  isHighlight?: boolean;
  fullDate?: string;
}

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface ConfidenceActivityChartProps {
    isEmbedded?: boolean;
}

const ConfidenceActivityChart: React.FC<ConfidenceActivityChartProps> = ({ isEmbedded = false }) => {
  const activity = useUserStore(state => state.stats.activity);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isInitialRender, setIsInitialRender] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialRender(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const { data, maxValue, totalReviews, maxIndex, yAxisTicks, domainMax } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let chartData: ChartData[] = [];

    // Helper to safely extract review count from polymorphic activity data
    const getReviewCount = (dateStr: string): number => {
        const val = activity[dateStr];
        if (typeof val === 'number') return 0; // Legacy number format only tracks duration
        if (val && typeof val === 'object' && val.entries) {
            return val.entries
                .filter(e => e.mode === 'Confidence')
                .reduce((sum, e) => sum + (e.count || 0), 0);
        }
        return 0;
    };

    if (viewMode === 'day') {
        chartData = Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - i));
            const dateString = getLocalDateString(date);
            return {
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: getReviewCount(dateString),
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
                weekTotal += getReviewCount(dateString);
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
                    monthTotal += getReviewCount(dateString);
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
                    yearTotal += getReviewCount(dateString);
                }
            }
            return { label: year.toString(), value: yearTotal, isHighlight: year === currentYear, fullDate: `Year ${year}` };
        });
    }

    const maxVal = Math.max(...chartData.map(d => d.value), 0);
    const total = chartData.reduce((acc, curr) => acc + curr.value, 0);
    const maxIdx = chartData.length > 0 ? chartData.reduce((maxIndex, item, index, arr) => item.value > arr[maxIndex].value ? index : maxIndex, 0) : -1;

    // --- Y-AXIS AND DOMAIN Logic for Counts ---
    const getDomainMax = (max: number): number => {
        if (max <= 10) return 10;
        return Math.ceil(max / 10) * 10; // Round up to nearest 10
    };
    
    const domainMax = getDomainMax(maxVal);
    const tickCount = 3; // Simpler ticks for mobile-first: 0, 50%, 100%
    const ticks = [];
    
    ticks.push({ value: 0, label: '0' });
    if (domainMax > 0) {
        const mid = Math.round(domainMax / 2);
        ticks.push({ value: mid, label: mid.toString() });
        ticks.push({ value: domainMax, label: domainMax.toString() });
    } else {
        ticks.push({ value: 5, label: '5' });
        ticks.push({ value: 10, label: '10' });
    }

    return { data: chartData, maxValue: maxVal, totalReviews: total, maxIndex: maxIdx, yAxisTicks: ticks, domainMax };
  }, [viewMode, activity]);

  const containerClasses = isEmbedded 
    ? "w-full animate-fadeIn" 
    : "w-full bg-surface dark:bg-secondary-800 rounded-2xl p-6 shadow-sm border border-secondary-200 dark:border-secondary-700 transition-all animate-fadeIn";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="font-bold text-text-main dark:text-secondary-100 text-lg flex items-center gap-2">
            <Icon name="stack-of-cards" className="w-5 h-5 text-warning-500" />
            Reviews
          </h3>
          <p className="text-sm text-text-subtle mt-1">
            Total: <span className="font-semibold text-warning-600 dark:text-warning-400">{totalReviews} cards</span>
          </p>
        </div>
        <div className="flex bg-secondary-100 dark:bg-secondary-700/50 rounded-full p-1 gap-1 self-end sm:self-auto overflow-x-auto max-w-full">
            {(['day', 'week', 'month', 'year'] as ViewMode[]).map((mode) => (
                <button 
                    key={mode}
                    onClick={() => setViewMode(mode)} 
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300 capitalize whitespace-nowrap ${
                        viewMode === mode
                            ? 'bg-white dark:bg-secondary-600 shadow-sm text-warning-600 dark:text-warning-400 scale-105' 
                            : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
                    }`}
                >
                    {mode}
                </button>
            ))}
        </div>
      </div>

      <div className="flex gap-4 h-40">
          {/* Y AXIS LABELS */}
          <div className="relative flex-shrink-0 w-8 text-right text-[10px] text-text-subtle font-medium">
              {yAxisTicks.map(tick => (
                  <span 
                    key={`label-${tick.value}`} 
                    className="absolute right-0 transform translate-y-1/2"
                    style={{ bottom: `${(tick.value / domainMax) * 100}%` }}
                  >
                      {tick.label}
                  </span>
              ))}
          </div>
          
          {/* CHART AREA */}
          <div className="flex-1 relative">
              {/* GRID LINES */}
              {yAxisTicks.map((tick, index) => index > 0 && (
                  <div 
                       key={`grid-${tick.value}`} 
                       className="absolute w-full border-t border-dashed border-secondary-200 dark:border-secondary-700/50"
                       style={{ bottom: `${(tick.value / domainMax) * 100}%` }}>
                  </div>
              ))}
              
              {/* BARS */}
              <div className="absolute inset-0 flex items-end justify-between gap-2 sm:gap-3 pb-1">
                  {data.map((item, index) => {
                      const heightPercent = domainMax > 0 ? (item.value / domainMax) * 100 : 0;
                      const isHovered = hoveredIndex === index;

                      return (
                          <div key={`${viewMode}-${index}`} className="flex-1 flex flex-col items-center group relative h-full justify-end"
                               onMouseEnter={() => setHoveredIndex(index)}
                               onMouseLeave={() => setHoveredIndex(null)}
                               // On mobile, tap to show tooltip behavior is naturally supported by focus/hover states often, 
                               // but explicit tap handling could be added if needed. Hover usually works fine for pure display.
                          >
                              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary-800 text-white text-xs rounded-lg py-1 px-2 whitespace-nowrap transition-all duration-200 z-20 pointer-events-none shadow-xl ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}`}>
                                  <div className="font-bold text-center">{item.value}</div>
                                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-secondary-800 rotate-45"></div>
                              </div>
                              
                              <div className="w-full max-w-[2rem] relative flex items-end h-full rounded-t-sm">
                                 <div className={`w-full rounded-t-sm transition-all duration-500 ease-out relative ${item.isHighlight ? 'bg-warning-500' : 'bg-warning-200 dark:bg-warning-800'} ${isHovered ? 'opacity-90 scale-x-110' : 'opacity-100'}`}
                                      style={{ height: isInitialRender ? '0%' : `${heightPercent}%`, transitionDelay: `${index * 30}ms` }}
                                 >
                                 </div>
                              </div>
                              <span className={`text-[9px] sm:text-[10px] mt-1 font-bold w-full text-center transition-colors truncate ${item.isHighlight ? 'text-warning-600 dark:text-warning-400' : 'text-text-subtle'}`}>
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

export default ConfidenceActivityChart;
