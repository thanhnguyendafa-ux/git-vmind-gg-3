
import React, { useState } from 'react';
import { SessionWordResult, SessionItemState } from '../../../types';
import Icon from '../../../components/ui/Icon';

interface SessionDashboardProps {
    startTime: number;
    results: SessionWordResult[];
    itemStates: Record<string, SessionItemState>;
    totalItems: number;
}

const SessionDashboard: React.FC<SessionDashboardProps> = ({ startTime, results, itemStates, totalItems }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate derived metrics
    // Relies on parent re-renders (driven by timer) to update 'now'
    const now = Date.now();
    const elapsedMinutes = Math.max((now - startTime) / 60000, 0.01); 
    const cpm = Math.round(results.length / elapsedMinutes);

    const masteredCount = Object.values(itemStates).filter(s => s === SessionItemState.Pass2).length;
    const needsReviewCount = Object.values(itemStates).filter(s => s === SessionItemState.Fail).length;

    if (!isExpanded) {
        return (
             <div className="w-full max-w-4xl lg:max-w-7xl mx-auto px-4 mb-2 flex justify-center animate-fadeIn">
                <button 
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-2 text-xs font-bold text-text-subtle hover:text-primary-500 transition-colors bg-secondary-100 dark:bg-secondary-800/50 px-3 py-1.5 rounded-full shadow-sm border border-secondary-200 dark:border-secondary-700"
                >
                    <Icon name="chart-bar" className="w-3.5 h-3.5" />
                    <span>Show Stats</span>
                </button>
             </div>
        );
    }

    return (
        <div className="w-full max-w-4xl lg:max-w-7xl mx-auto px-4 mb-4 animate-fade-in-up">
            <div className="relative bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl p-3 shadow-sm">
                 <button 
                    onClick={() => setIsExpanded(false)}
                    className="absolute -top-2 -right-2 p-1 bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-text-subtle hover:text-secondary-400 rounded-full shadow-sm"
                    title="Hide Stats"
                >
                    <Icon name="x" className="w-3 h-3" />
                </button>
                
                <div className="grid grid-cols-3 gap-2">
                    {/* Velocity */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/30">
                        <div className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 mb-1">
                            <Icon name="fast-forward" className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Velocity</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-text-main dark:text-secondary-100 tabular-nums">{cpm}</span>
                            <span className="text-[10px] text-text-subtle font-medium">cpm</span>
                        </div>
                    </div>

                    {/* Mastery */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/30">
                        <div className="flex items-center gap-1.5 text-success-600 dark:text-success-400 mb-1">
                            <Icon name="check-circle" className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Mastery</span>
                        </div>
                         <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-text-main dark:text-secondary-100 tabular-nums">{masteredCount}</span>
                            <span className="text-[10px] text-text-subtle font-medium">/ {totalItems}</span>
                        </div>
                    </div>

                    {/* Needs Review */}
                    <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-secondary-50 dark:bg-secondary-900/30">
                        <div className="flex items-center gap-1.5 text-error-500 dark:text-error-400 mb-1">
                            <Icon name="repeat" className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold uppercase tracking-wider">Retry</span>
                        </div>
                         <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-text-main dark:text-secondary-100 tabular-nums">{needsReviewCount}</span>
                            <span className="text-[10px] text-text-subtle font-medium">cards</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionDashboard;
