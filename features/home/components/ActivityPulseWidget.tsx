
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCounterStore } from '../../../stores/useCounterStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';
import { Counter } from '../../../types';

const timeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const PulseItem: React.FC<{ counter: Counter }> = ({ counter }) => {
    const hoursSince = (Date.now() - counter.lastInteraction) / (1000 * 60 * 60);
    const daysSince = hoursSince / 24;
    const threshold = counter.thresholdDays || 3;

    let statusClasses = '';
    let iconName = 'chart-bar';
    let iconContainerClass = '';

    if (hoursSince < 24) {
        statusClasses = 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800/50';
        iconName = 'fire';
        iconContainerClass = 'text-orange-500 bg-orange-100 dark:bg-orange-900/30';
    } else if (daysSince > threshold) {
        statusClasses = 'bg-secondary-50 dark:bg-secondary-800/30 border-secondary-200 dark:border-secondary-700 opacity-70';
        iconName = 'moon'; // Dormant
        iconContainerClass = 'text-secondary-400 bg-secondary-200 dark:bg-secondary-700';
    } else {
        // Stable/Warm
        statusClasses = 'bg-surface dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700';
        iconName = 'chart-bar';
        iconContainerClass = 'text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30';
    }

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${statusClasses}`}>
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-full flex-shrink-0 ${iconContainerClass}`}>
                    <Icon name={iconName} className="w-4 h-4" variant="filled" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-sm text-text-main dark:text-secondary-100 truncate pr-2">{counter.name}</h4>
                    <p className="text-xs text-text-subtle flex items-center gap-1">
                        {timeAgo(counter.lastInteraction)}
                    </p>
                </div>
            </div>
            <div className="text-right pl-2 shrink-0">
                <span className="text-lg font-bold text-text-main dark:text-secondary-100 font-mono">{counter.count}</span>
                <p className="text-[10px] text-text-subtle uppercase tracking-wide font-medium">Reps</p>
            </div>
        </div>
    );
};

export const ActivityPulseWidget: React.FC = () => {
    const counters = useCounterStore(useShallow(state => 
        state.counters
            .filter(c => c.isActive)
            .sort((a, b) => b.lastInteraction - a.lastInteraction)
    ));

    if (counters.length === 0) return null;

    return (
        <Card className="h-full flex flex-col animate-fadeIn">
            <CardHeader className="p-4 pb-2 border-b border-secondary-100 dark:border-secondary-700/50">
                <CardTitle className="text-base flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Icon name="chart-bar" className="w-5 h-5" />
                    Activity Pulse
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1">
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {counters.map(counter => (
                        <PulseItem key={counter.id} counter={counter} />
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default ActivityPulseWidget;
