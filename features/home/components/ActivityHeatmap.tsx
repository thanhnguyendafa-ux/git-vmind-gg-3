import * as React from 'react';
import { UserStats } from '../../../types';

export const ActivityHeatmap: React.FC<{ activity: UserStats['activity']; title?: string }> = ({ activity, title = "Activity Heatmap" }) => {
  const days = React.useMemo(() => {
    const today = new Date();
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);
    
    const dayArray = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dayArray.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return dayArray;
  }, []);
  
  const firstDayOfWeek = days[0]?.getDay() || 0;
  
  const getColor = (count: number | undefined) => {
    if (!count || count === 0) return 'bg-secondary-200 dark:bg-secondary-700/50';
    if (count < 300) return 'bg-primary-100 dark:bg-primary-900/40';
    if (count < 900) return 'bg-primary-300 dark:bg-primary-900/70';
    if (count < 1800) return 'bg-primary-500 dark:bg-primary-800';
    return 'bg-primary-700 dark:bg-primary-700';
  };

  return (
    <div className="bg-secondary-100 dark:bg-secondary-800 rounded-xl p-4 sm:p-5 shadow-lg">
      <h2 className="text-base font-semibold text-slate-600 dark:text-slate-300 mb-3">{title}</h2>
      <div className="flex justify-end text-xs text-text-subtle gap-1 mb-2 items-center">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded bg-secondary-200 dark:bg-secondary-700/50"></div>
        <div className="w-2.5 h-2.5 rounded bg-primary-100 dark:bg-primary-900/40"></div>
        <div className="w-2.5 h-2.5 rounded bg-primary-300 dark:bg-primary-900/70"></div>
        <div className="w-2.5 h-2.5 rounded bg-primary-500 dark:bg-primary-800"></div>
        <div className="w-2.5 h-2.5 rounded bg-primary-700 dark:bg-primary-700"></div>
        <span>More</span>
      </div>
      <div className="grid grid-rows-7 grid-flow-col auto-cols-fr gap-px">
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(day => {
              const dateString = day.toISOString().split('T')[0];
              const count = activity[dateString] || 0;
              return (
                  <div
                      key={dateString}
                      className={`aspect-square rounded transition-transform hover:scale-125 ${getColor(count)}`}
                      title={`${dateString}: ${Math.round(count / 60)} minutes`}
                  />
              );
          })}
      </div>
    </div>
  );
};

export default ActivityHeatmap;
