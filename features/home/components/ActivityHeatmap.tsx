
import * as React from 'react';
import { UserStats } from '../../../types';
import { useUIStore } from '../../../stores/useUIStore';

// Configuration for the SVG Grid (Coordinate System)
// These now represent units in the viewBox, not literal screen pixels.
const CELL_SIZE = 10;
const CELL_GAP = 2;
const WEEK_WIDTH = CELL_SIZE + CELL_GAP;
const DAY_HEIGHT = CELL_SIZE + CELL_GAP;
const TOTAL_WEEKS = 53; 
const LABEL_HEIGHT = 15; // Vertical space reserved for month labels
// FIX: Add Right Padding to prevent clipping of the last week or hover effects
const RIGHT_PADDING = 15; 
const CHART_HEIGHT = (7 * DAY_HEIGHT) + LABEL_HEIGHT;
const CHART_WIDTH = (TOTAL_WEEKS * WEEK_WIDTH) + RIGHT_PADDING;

interface DayData {
    date: Date;
    count: number; // in seconds
    intensity: number; // 0-3
}

interface MonthLabel {
    text: string;
    x: number;
}

export const ActivityHeatmap: React.FC<{ activity: UserStats['activity']; title?: string }> = ({ activity, title = "Yearly Focus" }) => {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  // --- Data Processing ---
  const { weeks, monthLabels } = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate start date: 52 weeks ago, aligned to the start of the week (Sunday)
    // We want 53 weeks total to ensure we cover the full previous year + current overlap
    const endDate = today;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (52 * 7));
    const dayOfWeek = startDate.getDay(); // 0 is Sunday
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const weekData: DayData[][] = [];
    const labels: MonthLabel[] = [];
    
    let currentDate = new Date(startDate);
    let lastMonth = -1;

    for (let w = 0; w < TOTAL_WEEKS; w++) {
      const week: DayData[] = [];
      
      // Check for month change to add label
      // We look at the date of the first day of the week to decide label placement
      const currentMonth = currentDate.getMonth();
      if (currentMonth !== lastMonth) {
          // Add label if it's not the very first week (unless it's Jan 1st, but usually we skip edge to avoid clipping)
          // FIX: Also check against TOTAL_WEEKS - 2 to prevent label clipping on the far right
          if (w > 0 && w < (TOTAL_WEEKS - 2)) { 
              labels.push({
                  text: currentDate.toLocaleDateString('en-US', { month: 'short' }),
                  x: w * WEEK_WIDTH
              });
          }
          lastMonth = currentMonth;
      }

      for (let d = 0; d < 7; d++) {
        const entryDate = new Date(currentDate);
        const dateString = entryDate.toISOString().split('T')[0];
        
        // Data Access Adapter
        const rawVal = activity[dateString];
        let seconds = 0;
        if (typeof rawVal === 'number') seconds = rawVal;
        else if (rawVal && typeof rawVal === 'object') seconds = rawVal.total || 0;
        
        // Intensity Calculation (Minutes) - Updated v2.7 Logic
        // Level 0: 0 mins
        // Level 1: 1 - 14 mins
        // Level 2: 15 - 29 mins
        // Level 3: 30+ mins
        const minutes = Math.floor(seconds / 60);
        let intensity = 0;
        if (minutes >= 30) intensity = 3;
        else if (minutes >= 15) intensity = 2;
        else if (minutes >= 1) intensity = 1;

        week.push({ date: entryDate, count: seconds, intensity });
        
        // Advance day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weekData.push(week);
    }

    return { weeks: weekData, monthLabels: labels };
  }, [activity]);

  // --- Theme Colors (Updated v2.7) ---
  const getFillColor = (intensity: number) => {
    if (intensity === 0) return isDark ? '#1e293b' : '#e2e8f0'; // Slate-800 / Slate-200
    
    if (isDark) {
        // Dark Mode (Deep Forest: Emeralds)
        switch(intensity) {
            case 1: return '#064e3b'; // Emerald-900 (Deep Moss)
            case 2: return '#10b981'; // Emerald-500 (Bright Green)
            case 3: return '#34d399'; // Emerald-400 (Neon Glow)
            default: return '#1e293b';
        }
    } else {
        // Light Mode (Morning Mist: Pastel Greens)
        switch(intensity) {
            case 1: return '#86efac'; // Emerald-300 (Soft Green)
            case 2: return '#22c55e'; // Emerald-500 (Standard Green)
            case 3: return '#15803d'; // Emerald-700 (Deep Green)
            default: return '#e2e8f0';
        }
    }
  };

  const textColor = isDark ? '#94a3b8' : '#64748b'; // Slate-400 / Slate-500

  return (
    <div className="w-full flex flex-col gap-2 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-end px-1 mb-1">
          {title && <h2 className="text-sm font-bold text-text-main dark:text-secondary-100 uppercase tracking-wide">{title}</h2>}
          
          {/* Legend */}
          <div className="flex items-center gap-1.5 text-[10px] text-text-subtle">
            <span>Less</span>
            <svg width={50} height={10} className="overflow-visible">
                <g>
                    {[0, 1, 2, 3].map((level, i) => (
                         <rect 
                            key={level} 
                            x={i * 12} 
                            width={10} 
                            height={10} 
                            rx={2} 
                            fill={getFillColor(level)} 
                        />
                    ))}
                </g>
            </svg>
            <span>More</span>
          </div>
      </div>

      {/* 
          SVG Container - Fully Responsive
          The viewBox allows the SVG to scale up or down based on the parent width.
      */}
      <div className="w-full relative">
        <svg 
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} 
            className="w-full h-auto block"
            preserveAspectRatio="xMinYMin meet"
        >
            {/* Month Labels */}
            <g transform={`translate(0, 10)`}>
                {monthLabels.map((label, i) => (
                    <text 
                        key={i} 
                        x={label.x} 
                        y={0} 
                        className="text-[9px] font-bold" 
                        fill={textColor}
                        style={{ fontSize: '9px', fontFamily: 'var(--font-sans)' }}
                    >
                        {label.text}
                    </text>
                ))}
            </g>

            {/* Heatmap Grid */}
            <g transform={`translate(0, ${LABEL_HEIGHT})`}>
                {weeks.map((week, wIndex) => (
                    <g key={wIndex} transform={`translate(${wIndex * WEEK_WIDTH}, 0)`}>
                        {week.map((day, dIndex) => {
                            const isFuture = day.date > new Date();
                            const opacity = isFuture ? 0.3 : 1; // Slight fade for future days

                            return (
                                <rect
                                    key={dIndex}
                                    x={0}
                                    y={dIndex * DAY_HEIGHT}
                                    width={CELL_SIZE}
                                    height={CELL_SIZE}
                                    rx={2}
                                    ry={2}
                                    fill={getFillColor(day.intensity)}
                                    opacity={opacity}
                                    className="transition-colors duration-200 hover:stroke-2 hover:stroke-black/20 dark:hover:stroke-white/20"
                                >
                                    <title>{`${day.date.toDateString()}: ${Math.round(day.count / 60)} mins`}</title>
                                </rect>
                            );
                        })}
                    </g>
                ))}
            </g>
        </svg>
      </div>
    </div>
  );
};

export default ActivityHeatmap;
