
import * as React from 'react';

interface GardenMilestoneCardProps {
  title: string;
  threshold: number;
  currentDrops: number;
  icon: React.ReactNode;
  isReached: boolean;
}

const GardenMilestoneCard: React.FC<GardenMilestoneCardProps> = ({
  title,
  threshold,
  currentDrops,
  icon,
  isReached,
}) => {
  // Calculate percentage, capping at 100%
  const percentage = threshold === 0 ? 100 : Math.min((currentDrops / threshold) * 100, 100);
  const remaining = Math.max(0, threshold - currentDrops);

  return (
    <div
      className={`
        rounded-xl p-3 flex flex-col items-center text-center transition-all duration-300 border relative overflow-hidden group
        ${isReached 
            ? 'bg-surface dark:bg-secondary-800 border-success-500/30 ring-1 ring-success-500/20 shadow-md scale-100 opacity-100' 
            : 'bg-secondary-50 dark:bg-secondary-800/50 border-secondary-200 dark:border-secondary-700 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'
        }
      `}
    >
      {/* Icon Container - No generic background, let the asset shine */}
      <div className="w-16 h-16 flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      {/* Title */}
      <h3 className="font-bold text-xs mb-3 text-text-main dark:text-secondary-100 uppercase tracking-wide">{title}</h3>

      {/* Progress Section */}
      <div className="w-full mt-auto">
        <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5 mb-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isReached ? 'bg-success-500' : 'bg-secondary-400'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        <p className="text-[10px] font-medium text-text-subtle">
            {isReached 
                ? <span className="text-success-600 dark:text-success-400 font-bold">Unlocked</span> 
                : <span>{remaining.toLocaleString()} left</span>
            }
        </p>
      </div>
    </div>
  );
};

export default GardenMilestoneCard;
