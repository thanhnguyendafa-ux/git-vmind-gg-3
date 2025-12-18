import * as React from 'react';
import { Screen, Table, VocabRow, Folder, Note, DictationNote } from '../../types';
import Icon from '../../components/ui/Icon';
import { useDebounce } from '../../hooks/useDebounce';
import { useUIStore } from '../../stores/useUIStore';
import { useTableStore } from '../../stores/useTableStore';
import { useNoteStore } from '../../stores/useNoteStore';
import { useDictationNoteStore } from '../../stores/useDictationNoteStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useUserStore } from '../../stores/useUserStore';

type SearchResult =
  | { type: 'feature'; name: string; screen: Screen; icon: string; subtitle: string; }
  | { type: 'action'; name: string; action: () => void; icon: string; subtitle: string; }
  | { type: 'table'; name: string; id: string; icon: string; subtitle: string; }
  | { type: 'folder'; name: string; id: string; icon: string; subtitle: string; }
  | { type: 'word'; text: string; context: string; row: VocabRow; table: Table; icon: string; }
  | { type: 'note'; title: string; note: Note; icon: string; subtitle: string; }
  | { type: 'dictation'; title: string; note: DictationNote; icon: string; subtitle: string; };

const navigableItemsToSearch: { name: string; screen: Screen; icon: string, subtitle: string }[] = [
    // Main Tabs
    { name: "Home", screen: Screen.Home, icon: "home", subtitle: "Go to Home screen" },
    { name: "Tables", screen: Screen.Tables, icon: "table-cells", subtitle: "View your vocabulary tables" },
    { name: "Vmind Learning Center", screen: Screen.Vmind, icon: "brain", subtitle: "Choose a study mode" },
    { name: "Rewards", screen: Screen.Rewards, icon: "trophy", subtitle: "View your progress and badges" },
    { name: "Settings", screen: Screen.Settings, icon: "cog", subtitle: "Configure app settings" },
    // Learning Modes (previously 'features')
    { name: "Confidence", screen: Screen.Confidence, icon: "stack-of-cards", subtitle: "Feature: Study with spaced repetition" },
    { name: "Journal", screen: Screen.Journal, icon: "pencil", subtitle: "Feature: Review your study journal" },
    { name: "Reading Space", screen: Screen.Reading, icon: "book", subtitle: "Feature: Read and extract vocabulary" },
    { name: "Dictation", screen: Screen.Dictation, icon: "headphones", subtitle: "Feature: Practice listening and typing" },
    { name: "Study Session", screen: Screen.StudySetup, icon: "brain", subtitle: "Feature: Start a custom quiz" },
    { name: "Theater Mode", screen: Screen.TheaterSetup, icon: "film", subtitle: "Feature: Passive vocabulary review" },
];

const ResultItem = React.forwardRef<HTMLButtonElement, { result: SearchResult; isActive: boolean; onClick: (result: SearchResult) => void }>(({ result, isActive, onClick }, ref) => {
    let title: string;
    let subtitle: string;

    switch (result.type) {
        case 'word':
            title = result.text;
            subtitle = result.context;
            break;
        case 'note':
        case 'dictation':
            title = result.title;
            subtitle = result.subtitle;
            break;
        case 'feature':
        case 'action':
        case 'table':
        case 'folder':
            title = result.name;
            subtitle = result.subtitle;
            break;
        default:
            title = 'Unknown';
            subtitle = 'Unknown type';
    }

    return (
        <button
            ref={ref}
            onClick={() => onClick(result)}
            className={`w-full text-left p-3 flex items-center gap-4 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700/50 transition-colors ${isActive ? 'bg-secondary-100 dark:bg-secondary-700/50' : ''}`}
        >
            <Icon name={result.icon} className="w-6 h-6 text-text-subtle flex-shrink-0"/>
            <div>
                <p className="font-semibold text-text-main dark:text-secondary-100">{title}</p>
                <p className="text-xs text-text-subtle">{subtitle}</p>
            </div>
        </button>
    );
});

const SearchScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [query, setQuery] = React.useState('');
    const debouncedQuery = useDebounce(query, 200);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
    const [activeIndex, setActiveIndex] = React.useState(0);

    // Get data from stores
    const { tables, folders } = useTableStore();
    const { notes } = useNoteStore();
    const { dictationNotes } = useDictationNoteStore();

    // Get actions & state from stores
    const { setCurrentScreen, setGalleryViewData, toggleTheme, theme } = useUIStore();
    const { handleLogout, isGuest } = useUserStore();
    const { handleSelectTable, setEditingDictationNote, setReadingScreenTarget } = useSessionStore();

    React.useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const actionsToSearch = React.useMemo(() => {
        const actions: { name: string; action: () => void; icon: string; subtitle: string; }[] = [
            { 
                name: "Toggle Theme", 
                action: toggleTheme, 
                icon: theme === 'dark' ? 'sun' : 'moon',
                subtitle: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`
            }
        ];
        if (!isGuest) {
            actions.push({
                name: "Logout",
                action: handleLogout,
                icon: 'logout',
                subtitle: "Sign out of your account"
            });
        }
        return actions;
    }, [theme, isGuest, toggleTheme, handleLogout]);

    const searchResults = React.useMemo(() => {
        if (debouncedQuery.length < 2) return null;
        const lowerQuery = debouncedQuery.toLowerCase();
        const MAX_RESULTS_PER_CATEGORY = 5;

        const results = {
            actions: actionsToSearch
                .filter(a => a.name.toLowerCase().includes(lowerQuery))
                .map(a => ({ ...a, type: 'action' as const }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),
            
            features: navigableItemsToSearch
                .filter(f => f.name.toLowerCase().includes(lowerQuery))
                .map(f => ({ ...f, type: 'feature' as const }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),
            
            words: [] as SearchResult[],

            tables: tables
                .filter(t => t.name.toLowerCase().includes(lowerQuery))
                .map(t => ({ type: 'table' as const, name: t.name, id: t.id, icon: 'table-cells', subtitle: `${t.rowCount ?? t.rows.length} words` }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),

            folders: folders
                .filter(f => f.name.toLowerCase().includes(lowerQuery))
                .map(f => ({ type: 'folder' as const, name: f.name, id: f.id, icon: 'folder', subtitle: `${f.tableIds.length} tables` }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),
            
            notes: notes
                .filter(n => n.title.toLowerCase().includes(lowerQuery))
                .map(n => ({ type: 'note' as const, title: n.title, note: n, icon: 'pencil', subtitle: 'Reading Note' }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),

            dictations: dictationNotes
                .filter(d => d.title.toLowerCase().includes(lowerQuery))
                .map(d => ({ type: 'dictation' as const, title: d.title, note: d, icon: 'headphones', subtitle: 'Dictation Exercise' }))
                .slice(0, MAX_RESULTS_PER_CATEGORY),
        };
        
        for (const table of tables) {
            if (results.words.length >= MAX_RESULTS_PER_CATEGORY) break;
            for (const row of table.rows) {
                 if (results.words.length >= MAX_RESULTS_PER_CATEGORY) break;
                for (const colId in row.cols) {
                    const colValue = row.cols[colId];
                    if (colValue.toLowerCase().includes(lowerQuery)) {
                        results.words.push({
                            type: 'word' as const,
                            text: colValue,
                            context: `In table "${table.name}"`,
                            row,
                            table,
                            icon: 'font',
                        });
                        if (results.words.length >= MAX_RESULTS_PER_CATEGORY) break;
                    }
                }
            }
        }

        return results;
    }, [debouncedQuery, tables, folders, notes, dictationNotes, actionsToSearch]);

    const flatResults = React.useMemo(() => {
        if (!searchResults) return [];
        return [
            ...searchResults.actions,
            ...searchResults.features,
            ...searchResults.words,
            ...searchResults.tables,
            ...searchResults.folders,
            ...searchResults.notes,
            ...searchResults.dictations,
        ];
    }, [searchResults]);
    
    React.useEffect(() => {
        setActiveIndex(0);
        itemRefs.current = [];
    }, [debouncedQuery]);

    const handleResultClick = (result: SearchResult) => {
        onClose();
        switch (result.type) {
            case 'feature': setCurrentScreen(result.screen); break;
            case 'action': result.action(); break;
            case 'table': handleSelectTable(result.id); break;
            case 'folder': setCurrentScreen(Screen.Tables); break;
            case 'word': setGalleryViewData({ table: result.table, initialRowId: result.row.id }); break;
            case 'note': setReadingScreenTarget({ noteId: result.note.id }); setCurrentScreen(Screen.Reading); break;
            case 'dictation': setEditingDictationNote(result.note); setCurrentScreen(Screen.DictationEditor); break;
        }
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!flatResults.length) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (activeIndex + 1) % flatResults.length;
                setActiveIndex(nextIndex);
                itemRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const nextIndex = (activeIndex - 1 + flatResults.length) % flatResults.length;
                setActiveIndex(nextIndex);
                itemRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (flatResults[activeIndex]) {
                    handleResultClick(flatResults[activeIndex]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [flatResults, activeIndex, handleResultClick]);

    const hasResults = flatResults.length > 0;
    let cumulativeIndex = -1;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fadeIn" onClick={onClose}>
            <div
                className="bg-surface dark:bg-secondary-800 w-full max-w-2xl mx-auto mt-[10vh] rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-slideInUp"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center gap-3">
                    <Icon name="search" className="w-6 h-6 text-text-subtle"/>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search features, tables, words..."
                        className="w-full bg-transparent text-lg focus:outline-none"
                    />
                    <button onClick={onClose} className="p-2 rounded-full text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700">
                        <Icon name="x" className="w-6 h-6"/>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    {debouncedQuery.length < 2 ? (
                         <div className="text-center p-8 text-text-subtle">
                            <p>Type at least 2 characters to search.</p>
                        </div>
                    ) : !hasResults ? (
                        <div className="text-center p-8 text-text-subtle">
                            <p>No results found for "{debouncedQuery}"</p>
                        </div>
                    ) : (
                        <div className="space-y-4 p-2">
                            {searchResults?.actions.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Actions</h3>{searchResults.actions.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`action-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.features.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Navigation</h3>{searchResults.features.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`feat-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.words.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Vocabulary</h3>{searchResults.words.map((r, idx) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`word-${idx}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.tables.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Tables</h3>{searchResults.tables.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`table-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.folders.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Folders</h3>{searchResults.folders.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`folder-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.notes.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Notes</h3>{searchResults.notes.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`note-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                            {searchResults?.dictations.length > 0 && <div><h3 className="px-3 text-xs font-bold uppercase text-text-subtle mb-1">Dictations</h3>{searchResults.dictations.map((r) => { cumulativeIndex++; const i = cumulativeIndex; return <ResultItem key={`dict-${i}`} ref={el => { itemRefs.current[i] = el; }} result={r} isActive={i === activeIndex} onClick={handleResultClick} />})}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SearchScreen;