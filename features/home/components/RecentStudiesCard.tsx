
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTableStore } from '../../../stores/useTableStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import Icon from '../../../components/ui/Icon';
import TableIcon from '../../../components/ui/TableIcon';

const RecentStudiesCard: React.FC = () => {
    const handleSelectTable = useSessionStore(state => state.handleSelectTable);
    
    const recentlyStudiedTables = useTableStore(useShallow(state =>
        state.tables
            .map(table => {
                const lastStudiedTimes = table.rows.map(w => w.stats.lastStudied).filter(Boolean) as number[];
                const mostRecent = Math.max(0, ...lastStudiedTimes);
                return { id: table.id, name: table.name, rowCount: table.rowCount ?? table.rows.length, mostRecent };
            })
            .filter(table => table.mostRecent > 0)
            .sort((a, b) => b.mostRecent - a.mostRecent)
            .slice(0, 4)
    ));

    // Show empty state if no recent studies
    const content = recentlyStudiedTables.length > 0 ? (
        <div className="space-y-2">
            {recentlyStudiedTables.map(table => (
                <button 
                    key={table.id} 
                    onClick={() => handleSelectTable(table.id!)} 
                    className="w-full text-left p-3 flex items-center justify-between rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors group border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-secondary-100 dark:bg-secondary-700 rounded-md group-hover:bg-white dark:group-hover:bg-secondary-600 transition-colors">
                            <TableIcon className="w-5 h-5 text-primary-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-text-main dark:text-secondary-200 truncate">{table.name}</p>
                            <p className="text-xs text-text-subtle">{table.rowCount} words</p>
                        </div>
                    </div>
                    <Icon name="arrowRight" className="w-4 h-4 text-secondary-400 dark:text-secondary-500 group-hover:translate-x-1 transition-transform flex-shrink-0 ml-2" />
                </button>
            ))}
        </div>
    ) : (
        <div className="flex flex-col items-center justify-center h-full text-text-subtle py-8">
             <Icon name="clock" className="w-10 h-10 mb-2 opacity-50" />
             <p className="text-sm">No recent study history.</p>
        </div>
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2 border-b border-secondary-100 dark:border-secondary-700/50">
                <CardTitle className="text-base flex items-center gap-2 text-primary-600 dark:text-primary-400">
                    <Icon name="clock" className="w-5 h-5" />
                    Jump Back In
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1 overflow-y-auto custom-scrollbar">
                {content}
            </CardContent>
        </Card>
    );
};

export default RecentStudiesCard;
