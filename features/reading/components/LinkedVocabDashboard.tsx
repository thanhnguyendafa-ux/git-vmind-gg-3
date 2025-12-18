
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import { useTableStore } from '../../../stores/useTableStore';
import { VocabRow, Table, FlashcardStatus } from '../../../types';
import Icon from '../../../components/ui/Icon';
import { useLocalStorage } from '../../../hooks/useLocalStorage';

interface LinkedVocabDashboardProps {
    noteId: string;
    onViewRow: (row: VocabRow, table: Table) => void;
    variant?: 'horizontal' | 'sidebar';
}

const statusColors: Record<string, string> = {
    [FlashcardStatus.New]: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    [FlashcardStatus.Again]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    [FlashcardStatus.Hard]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    [FlashcardStatus.Good]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    [FlashcardStatus.Easy]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    [FlashcardStatus.Perfect]: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    [FlashcardStatus.Superb]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Loading': 'bg-secondary-200 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400 animate-pulse'
};

const LinkedVocabDashboard: React.FC<LinkedVocabDashboardProps> = ({ noteId, onViewRow, variant = 'horizontal' }) => {
    const contextLinks = useContextLinkStore(useShallow(state => state.contextLinks));
    const tables = useTableStore(useShallow(state => state.tables));
    const [isExpanded, setIsExpanded] = useLocalStorage('vmind-vocab-dashboard-expanded', true);

    const linkedData = React.useMemo(() => {
        // 1. Get links originating from this note
        const links = contextLinks.filter(l => l.sourceType === 'reading' && l.sourceId === noteId);
        
        const validData: { 
            id: string; // rowId
            linkId: string;
            term: string; 
            status: string;
            tableName?: string;
            row?: VocabRow; 
            table?: Table; 
        }[] = [];

        // 2. Resolve rows and tables
        for (const link of links) {
            // Default Metadata (Always available)
            let term = link.metadata.selection || 'Unknown';
            let status = 'Loading';
            let tableName = '...';
            let row: VocabRow | undefined;
            let table: Table | undefined;

            // Try to find actual data
            table = tables.find(t => t.rows.some(r => r.id === link.rowId));
            if (table) {
                tableName = table.name;
                row = table.rows.find(r => r.id === link.rowId);
                if (row) {
                    term = link.metadata.selection || row.cols[table.columns[0]?.id] || 'Unknown';
                    status = row.stats.flashcardStatus || FlashcardStatus.New;
                }
            }
            
            validData.push({
                id: link.rowId,
                linkId: link.id,
                term,
                status,
                tableName,
                row,
                table
            });
        }
        
        // Sort by newest link first
        return validData.reverse();
    }, [contextLinks, tables, noteId]);

    const isSidebar = variant === 'sidebar';

    if (linkedData.length === 0) {
        if (isSidebar) {
             return (
                 <div className="flex flex-col items-center justify-center h-full text-center p-6 text-text-subtle opacity-50">
                     <Icon name="book" className="w-12 h-12 mb-2" />
                     <p className="text-xs">Select text and click "Add" to extract vocabulary.</p>
                 </div>
             )
        }
        return null;
    }

    // --- Sidebar Layout (Vertical, Full Height) ---
    if (isSidebar) {
        return (
            <div className="h-full flex flex-col bg-surface dark:bg-secondary-800 w-full">
                {/* Fixed Header */}
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Icon name="book" className="w-4 h-4 text-info-500" variant="filled" />
                        <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">Vocabulary</span>
                    </div>
                    <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {linkedData.length}
                    </span>
                </div>
                
                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {linkedData.map(({ row, table, term, linkId, status, tableName }) => {
                        const statusClass = statusColors[status] || statusColors[FlashcardStatus.New];
                        const isLoaded = !!row && !!table;
                        
                        return (
                            <button
                                key={linkId}
                                onClick={() => isLoaded && onViewRow(row!, table!)}
                                disabled={!isLoaded}
                                className={`w-full flex flex-col items-start p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-secondary-50 dark:hover:bg-secondary-700/30 transition-all shadow-sm group text-left ${!isLoaded ? 'cursor-wait opacity-80' : ''}`}
                            >
                                <div className="w-full flex justify-between items-start mb-1.5">
                                    <p className="font-bold text-sm text-text-main dark:text-secondary-100 truncate pr-2">{term}</p>
                                    <div className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${statusClass}`}>
                                        {status}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-text-subtle">
                                    <Icon name="table-cells" className="w-3 h-3" />
                                    <span className="truncate max-w-[150px]">{tableName}</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // --- Horizontal Layout (Accordion) ---
    return (
        <div className="w-full bg-secondary-50 dark:bg-secondary-800/50 border-b border-secondary-200 dark:border-secondary-700 transition-all duration-300">
            {/* Header */}
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon name="book" className="w-4 h-4 text-info-500" variant="filled" />
                    <span className="text-sm font-bold text-text-main dark:text-secondary-100 uppercase tracking-wide">Extracted Vocabulary</span>
                    <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                        {linkedData.length}
                    </span>
                </div>
                <Icon name="chevron-down" className={`w-4 h-4 text-text-subtle transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* List Content */}
            <div className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${isExpanded ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-4 pb-4 grid gap-2 overflow-y-auto max-h-60 custom-scrollbar">
                    {linkedData.map(({ row, table, term, linkId, status, tableName }) => {
                        const statusClass = statusColors[status] || statusColors[FlashcardStatus.New];
                        const isLoaded = !!row && !!table;
                        
                        return (
                            <button
                                key={linkId}
                                onClick={() => isLoaded && onViewRow(row!, table!)}
                                disabled={!isLoaded}
                                className={`flex items-center justify-between p-2 rounded-lg bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-700 transition-all shadow-sm group text-left ${!isLoaded ? 'cursor-wait opacity-80' : ''}`}
                            >
                                <div className="flex-1 min-w-0 pr-3">
                                    <p className="font-semibold text-sm text-text-main dark:text-secondary-100 truncate">{term}</p>
                                    <div className="flex items-center gap-1 text-xs text-text-subtle mt-0.5">
                                        <Icon name="table-cells" className="w-3 h-3" />
                                        <span className="truncate">{tableName}</span>
                                    </div>
                                </div>
                                <div className={`flex-shrink-0 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${statusClass} transition-colors duration-500`}>
                                    {status}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default LinkedVocabDashboard;
