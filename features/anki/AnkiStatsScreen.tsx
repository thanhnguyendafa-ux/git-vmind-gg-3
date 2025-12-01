import * as React from 'react';
import { Screen, AnkiProgress, VocabRow } from '../../types';
import Icon from '../../components/ui/Icon';
import Popover from '../../components/ui/Popover';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSessionDataStore } from '../../stores/useSessionDataStore';
import { useTableStore } from '../../stores/useTableStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import BarChart from './components/BarChart';
import PieChart from '../../components/ui/PieChart';

const maturityConfig = {
    new: { label: 'New', hex: '#94a3b8' }, // stone-400
    learning: { label: 'Learning', hex: '#f59e0b' }, // amber-500
    young: { label: 'Young', hex: '#3b82f6' }, // blue-500
    mature: { label: 'Mature', hex: '#14b8a6' }, // success-500 (jade)
};

const StatCard: React.FC<{
    icon: string;
    label: string;
    value: string | number;
    tooltip: string;
}> = ({ icon, label, value, tooltip }) => {
    const [isTooltipOpen, setIsTooltipOpen] = React.useState(false);
    return (
        <div className="bg-secondary-100/50 dark:bg-secondary-900/50 p-3 rounded-lg flex items-start gap-3">
            <div className="flex-shrink-0">
                <Popover
                    isOpen={isTooltipOpen}
                    setIsOpen={setIsTooltipOpen}
                    contentClassName="max-w-xs"
                    trigger={
                        <Icon name={icon} className="w-6 h-6 text-text-subtle" />
                    }
                >
                    <p className="text-sm">{tooltip}</p>
                </Popover>
            </div>
            <div>
                <p className="text-sm font-semibold text-text-main dark:text-secondary-100">{label}</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{value}</p>
            </div>
        </div>
    );
};


const AnkiStatsScreen: React.FC = () => {
    const { setCurrentScreen } = useUIStore();
    const { ankiStatsProgressId } = useSessionStore();
    const { ankiProgresses } = useSessionDataStore();
    const { tables } = useTableStore();

    const progress = React.useMemo(() => {
        return ankiProgresses.find(p => p.id === ankiStatsProgressId);
    }, [ankiProgresses, ankiStatsProgressId]);

    const rows = React.useMemo(() => {
        if (!progress) return [];
        return tables
            .filter(t => progress.tableIds.includes(t.id))
            .flatMap(t => t.rows);
    }, [tables, progress]);
    
    // -- Data Calculation --
    const forecastData = React.useMemo(() => {
        const data = Array.from({ length: 30 }, (_, i) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + i);
            return {
                label: i === 0 ? 'Today' : (i === 1 ? 'Tmw' : `${i}d`),
                value: 0,
                timestamp: date.getTime(),
            };
        });

        rows.forEach(row => {
            const dueDate = row.stats.ankiDueDate;
            if (dueDate) {
                const dayIndex = data.findIndex(d => d.timestamp === dueDate);
                if (dayIndex !== -1) {
                    data[dayIndex].value++;
                }
            }
        });

        return data;
    }, [rows]);

    const maturityData = React.useMemo(() => {
        const counts = { new: 0, learning: 0, young: 0, mature: 0 };
        rows.forEach(row => {
            const { ankiInterval, ankiDueDate } = row.stats;
            if (ankiInterval === undefined || ankiDueDate === undefined || ankiDueDate === null) {
                counts.new++;
            } else if (ankiInterval < 1) {
                counts.learning++;
            } else if (ankiInterval < 21) {
                counts.young++;
            } else {
                counts.mature++;
            }
        });
        return counts;
    }, [rows]);
    
    const { todaySummary, deckOverview } = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();
        
        let dueToday = 0;
        let learnedCardsCount = 0;
        let totalEase = 0;

        rows.forEach(row => {
            if (row.stats.ankiDueDate === todayTimestamp) {
                dueToday++;
            }
            if (row.stats.ankiEaseFactor) {
                learnedCardsCount++;
                totalEase += row.stats.ankiEaseFactor;
            }
        });
        
        const newToday = Math.min(maturityData.new, progress?.ankiConfig.newCardsPerDay || 20);
        const avgEase = learnedCardsCount > 0 ? ((totalEase / learnedCardsCount) * 100).toFixed(0) + '%' : 'N/A';
        const maturityRate = rows.length > 0 ? (((maturityData.young + maturityData.mature) / rows.length) * 100).toFixed(0) + '%' : '0%';

        return {
            todaySummary: { dueToday, newToday },
            deckOverview: { avgEase, maturityRate }
        };
    }, [rows, progress, maturityData]);


    if (!progress) {
        return (
            <div className="p-6 text-center">
                <p>Could not find Anki progress data. Please go back.</p>
                <button onClick={() => setCurrentScreen(Screen.AnkiSetup)} className="text-primary-500 underline">Back</button>
            </div>
        );
    }
    
    const pieChartData = [
        { label: maturityConfig.new.label, value: maturityData.new, color: maturityConfig.new.hex },
        { label: maturityConfig.learning.label, value: maturityData.learning, color: maturityConfig.learning.hex },
        { label: maturityConfig.young.label, value: maturityData.young, color: maturityConfig.young.hex },
        { label: maturityConfig.mature.label, value: maturityData.mature, color: maturityConfig.mature.hex },
    ];

    return (
        <div className="p-4 sm:p-6 mx-auto animate-fadeIn">
            <header className="flex items-center gap-3 mb-6">
                <button onClick={() => setCurrentScreen(Screen.AnkiSetup)} className="p-2 rounded-full hover:bg-secondary-200 dark:hover:bg-secondary-700 text-text-subtle">
                    <Icon name="arrowLeft" className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main dark:text-secondary-100">Deck Statistics</h1>
                    <p className="text-sm text-text-subtle">{progress.name}</p>
                </div>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <CardHeader>
                        <CardTitle>Future Due Forecast</CardTitle>
                        <CardDescription>Number of reviews due in the next 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <BarChart data={forecastData} />
                    </CardContent>
                </Card>

                <Card className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <CardHeader>
                        <CardTitle>Today's Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard icon="clock" label="Due Today" value={todaySummary.dueToday} tooltip="The number of 'learning' and 'review' cards scheduled for today." />
                        <StatCard icon="plus" label="New Today" value={todaySummary.newToday} tooltip={`The number of new cards that will be introduced today, limited by your deck settings (currently ${progress.ankiConfig.newCardsPerDay}/day).`} />
                    </CardContent>
                </Card>
                
                <Card className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                    <CardHeader>
                        <CardTitle>Deck Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard icon="brain" label="Average Ease" value={deckOverview.avgEase} tooltip="The average 'ease factor' for all learned cards in this deck. A higher percentage means you find the cards easier on average." />
                        <StatCard icon="trophy" label="Maturity Rate" value={deckOverview.maturityRate} tooltip="The percentage of cards that are 'Young' or 'Mature' (i.e., not new or in the initial learning phase)." />
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <CardHeader>
                        <CardTitle>Card Maturity Breakdown</CardTitle>
                        <CardDescription>Distribution of cards by their learning stage.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-6">
                        <PieChart data={pieChartData} total={rows.length} centerValue={rows.length.toString()} centerLabel="Total Cards" isDonut />
                        <div className="w-full space-y-2">
                            {pieChartData.map(item => {
                                if (item.value === 0) return null;
                                const percentage = rows.length > 0 ? (item.value / rows.length * 100).toFixed(0) : 0;
                                return (
                                    <div key={item.label} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                            <span className="font-semibold text-text-subtle">{item.label}</span>
                                        </div>
                                        <div className="font-mono text-text-main dark:text-secondary-200">
                                            <span className="font-semibold w-8 inline-block text-right">{item.value}</span>
                                            <span className="text-text-subtle ml-2 w-10 inline-block text-right">({percentage}%)</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AnkiStatsScreen;
