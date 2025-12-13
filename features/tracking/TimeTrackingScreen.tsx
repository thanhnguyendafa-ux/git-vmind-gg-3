import * as React from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { useUIStore } from '../../stores/useUIStore';
import { Screen, SessionEntry } from '../../types';
import Icon from '../../components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import RestorationGarden from '../garden/components/RestorationGarden';
import { isGardenAwake } from '../../stores/useGardenStore';
import { formatShortDuration } from '../../utils/timeUtils';
import { studyModeIcons } from '../study/components/studyModeIcons';

const modeDisplayMap: { [key: string]: { icon: string; name: string } } = {
    'Queue': { icon: 'progress-arrows', name: 'Queue' },
    'Confidence': { icon: 'stack-of-cards', name: 'Confidence' },
    'Anki': { icon: 'brain', name: 'Anki' },
    'Theater': { icon: 'film', name: 'Theater' },
    'Dictation': { icon: 'headphones', name: 'Dictation' },
};

const LogItem: React.FC<{ entry: SessionEntry }> = ({ entry }) => {
    const { icon, name } = modeDisplayMap[entry.mode] || { icon: 'question-mark-circle', name: entry.mode };
    
    return (
        <div className="flex items-center gap-4 py-3">
            <Icon name={icon} className="w-5 h-5 text-text-subtle flex-shrink-0" />
            <div className="flex-1">
                <p className="font-semibold text-text-main dark:text-secondary-100">{name}</p>
                <p className="text-xs text-text-subtle">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div className="text-right">
                <p className="font-semibold text-text-main dark:text-secondary-200">{formatShortDuration(entry.duration)}</p>
                <p className="text-xs text-primary-500 font-medium">+{entry.droplets} drops</p>
            </div>
        </div>
    );
};

const TimeTrackingScreen: React.FC = () => {
    const { stats } = useUserStore();
    const { setCurrentScreen } = useUIStore();

    const isAwake = isGardenAwake(stats.lastSessionDate);

    const processedActivity = React.useMemo(() => {
        if (!stats.activity) return [];
        return Object.entries(stats.activity)
            .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
    }, [stats.activity]);

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="p-2" onClick={() => setCurrentScreen(Screen.Home)}>
                        <Icon name="arrowLeft" className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Activity Log</h1>
                    </div>
                </div>
                <Button variant="secondary" onClick={() => setCurrentScreen(Screen.Rewards)}>
                    <Icon name="trophy" className="w-4 h-4 mr-2" />
                    Rewards
                </Button>
            </header>

            <div className="mb-6">
                <RestorationGarden isAwake={isAwake} />
            </div>

            <Card>
                <CardContent className="p-4">
                    {processedActivity.length === 0 ? (
                        <div className="text-center py-16 text-text-subtle">
                            <p>No study sessions recorded yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {processedActivity.map(([dateString, data]) => {
                                const date = new Date(dateString + 'T00:00:00Z');
                                const totalDuration = typeof data === 'number' ? data : data.total;
                                const entries = typeof data === 'object' && data.entries ? data.entries : null;

                                return (
                                    <div key={dateString}>
                                        <div className="flex justify-between items-baseline pb-2 border-b border-secondary-200 dark:border-secondary-700">
                                            <h3 className="font-bold text-lg text-text-main dark:text-secondary-100">
                                                {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </h3>
                                            <p className="text-sm font-semibold text-text-subtle">
                                                Total: {formatShortDuration(totalDuration)}
                                            </p>
                                        </div>
                                        <div className="divide-y divide-secondary-100 dark:divide-secondary-800/50">
                                            {entries ? (
                                                entries.map((entry, i) => <LogItem key={i} entry={entry} />)
                                            ) : (
                                                <div className="flex items-center gap-4 py-3">
                                                    <Icon name="clock" className="w-5 h-5 text-text-subtle" />
                                                    <p className="font-semibold text-text-main dark:text-secondary-100">Total Study Time</p>
                                                    <p className="ml-auto font-semibold text-text-main dark:text-secondary-200">{formatShortDuration(totalDuration)}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TimeTrackingScreen;