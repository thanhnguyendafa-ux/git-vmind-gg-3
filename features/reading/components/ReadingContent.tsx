
import * as React from 'react';
import { Note, Table, VocabRow, FlashcardStatus } from '../../../types';
import Icon from '../../../components/ui/Icon';
import Modal from '../../../components/ui/Modal';
import Popover from '../../../components/ui/Popover';
import { Button } from '../../../components/ui/Button';
import { useNoteStore } from '../../../stores/useNoteStore';
import { useTableStore } from '../../../stores/useTableStore';
import { useUIStore } from '../../../stores/useUIStore';
import { useContextLinkStore } from '../../../stores/useContextLinkStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useMusicStore, Track } from '../../../stores/useMusicStore';
import { useCounterStore } from '../../../stores/useCounterStore';
import { useUserStore } from '../../../stores/useUserStore';
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useDebounce } from '../../../hooks/useDebounce';
import { explainText } from '../../../services/geminiService';
import { extractContextSnippet, CONTEXT_WORD_COUNT } from '../../../utils/textUtils';
import WordDetailModal from '../../tables/WordDetailModal';
import WordInfoModal from '../../tables/components/WordInfoModal';
import ClozeCreationModal from './ClozeCreationModal';
import LinkedVocabDashboard from './LinkedVocabDashboard';
import { chunkTextForVirtualization } from '../../../utils/textChunker';
import VirtualReadingContainer from './VirtualReadingContainer';
import { READING_THEMES, ReadingThemeMode } from '../readingConstants';
import { VmindSyncEngine } from '../../../services/VmindSyncEngine';
import { Input } from '../../../components/ui/Input';

// --- Sub-components for Reading Content ---

const ReadingFooter: React.FC<{ percent: number; pagesLeft: number; visible: boolean }> = ({ percent, pagesLeft, visible }) => (
    <div className={`absolute bottom-0 left-0 right-0 bg-background/90 dark:bg-secondary-900/90 backdrop-blur-md border-t border-secondary-200/50 dark:border-secondary-700/50 p-2 px-6 flex justify-between items-center text-xs font-mono text-text-subtle z-30 transition-all duration-500 ease-in-out ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
        <span className="font-semibold">{pagesLeft} {pagesLeft === 1 ? 'page' : 'pages'} left</span>
        <div className="flex items-center gap-3">
            <div className="w-24 h-1 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
            </div>
            <span className="min-w-[3ch] text-right">{percent}%</span>
        </div>
    </div>
);

const FloatingToolbar: React.FC<{
  position: { top: number; left: number };
  onAdd: () => void;
  onExplain: () => void;
  onJournal: () => void;
  onCloze: () => void;
  onBookmark: () => void;
  onSearchDict?: () => void;
  priority: 'explain' | 'add' | 'default';
}> = ({ position, onAdd, onExplain, onJournal, onCloze, onBookmark, onSearchDict, priority }) => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const explainVariant = priority === 'explain' ? 'primary' : 'ghost';
  const addVariant = priority === 'add' ? 'primary' : 'ghost';

  if (!isMobile) {
    return (
        <div
        className="fixed z-50 bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg flex items-center -translate-x-1/2 transition-opacity animate-fade-scale-in"
        style={{ top: position.top, left: position.left }}
        >
        <Button variant={explainVariant} size="sm" onClick={onExplain} className="rounded-r-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="sparkles" className="w-4 h-4 text-info-500" /> Explain</Button>
        <Button variant={addVariant} size="sm" onClick={onAdd} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="plus" className="w-4 h-4" /> Add</Button>
        {onSearchDict && (
            <Button variant="ghost" size="sm" onClick={onSearchDict} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="search" className="w-4 h-4 text-blue-500" /> Search Dict</Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCloze} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="puzzle-piece" className="w-4 h-4 text-purple-500" /> Cloze</Button>
        <Button variant="ghost" size="sm" onClick={onBookmark} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="bookmark" className="w-4 h-4 text-warning-500" /> Bookmark</Button>
        <Button variant="ghost" size="sm" onClick={onJournal} className="rounded-l-none gap-2"><Icon name="book" className="w-4 h-4 text-success-500" /> Journal</Button>
        </div>
    );
  }

  // Mobile Compact View
  const primaryAction = priority === 'add' 
    ? { label: 'Add', icon: 'plus', onClick: onAdd, variant: 'primary' as const } 
    : { label: 'Explain', icon: 'sparkles', onClick: onExplain, variant: 'secondary' as const }; // Default to Explain

  return (
    <div
        className="fixed z-50 -translate-x-1/2 transition-opacity animate-fade-scale-in"
        style={{ top: position.top, left: position.left }}
    >
        <div className="flex items-center bg-surface dark:bg-secondary-800 rounded-full shadow-2xl border border-secondary-200 dark:border-secondary-700 p-1 gap-1">
            <Button 
                variant={primaryAction.variant} 
                size="sm" 
                onClick={primaryAction.onClick} 
                className="rounded-full px-4 h-9 flex items-center gap-2"
            >
                <Icon name={primaryAction.icon} className="w-4 h-4" />
                <span>{primaryAction.label}</span>
            </Button>
            
            <div className="w-px h-5 bg-secondary-200 dark:bg-secondary-600 mx-0.5"></div>

            <Popover
                isOpen={isMenuOpen}
                setIsOpen={setIsMenuOpen}
                trigger={
                    <button 
                        className="p-2 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors text-text-subtle hover:text-text-main"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        <Icon name="dots-horizontal" className="w-5 h-5" />
                    </button>
                }
                contentClassName="w-48 bg-surface/95 dark:bg-secondary-800/95 backdrop-blur-xl border border-secondary-200 dark:border-secondary-700 shadow-2xl rounded-xl"
            >
                <div className="py-1 flex flex-col">
                    {/* Render all actions in the menu for completeness, or filter out primary. Filtering is cleaner. */}
                    {priority !== 'explain' && (
                         <button onClick={() => { onExplain(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                            <Icon name="sparkles" className="w-4 h-4 text-info-500" /> Explain
                        </button>
                    )}
                    {priority !== 'add' && (
                        <button onClick={() => { onAdd(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                            <Icon name="plus" className="w-4 h-4 text-primary-500" /> Add to Table
                        </button>
                    )}
                    
                    {onSearchDict && (
                        <button onClick={() => { onSearchDict(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                            <Icon name="search" className="w-4 h-4 text-blue-500" /> Search Dict
                        </button>
                    )}
                    
                    <button onClick={() => { onCloze(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                        <Icon name="puzzle-piece" className="w-4 h-4 text-purple-500" /> Create Cloze
                    </button>
                    
                    <button onClick={() => { onBookmark(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                        <Icon name="bookmark" className="w-4 h-4 text-warning-500" /> Bookmark
                    </button>
                    
                    <button onClick={() => { onJournal(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-text-main dark:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700/50 flex items-center gap-3">
                        <Icon name="book" className="w-4 h-4 text-success-500" /> Save to Journal
                    </button>
                </div>
            </Popover>
        </div>
    </div>
  );
};

const AMBIENT_TRACKS: Track[] = [
    { id: 'rain', name: 'Rain', icon: 'cloud-rain', url: '/audio/rain.mp3' },
    { id: 'library', name: 'Library', icon: 'book', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/library.mp3' },
    { id: 'wind', name: 'Wind', icon: 'wind', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/wind.mp3' },
];

const FONT_FACES = [
    { name: 'Lora', family: 'font-serif' },
    { name: 'Merriweather', family: 'font-merriweather' },
    { name: 'Literata', family: 'font-literata' },
    { name: 'Inter', family: 'font-sans' },
    { name: 'Nunito Sans', family: 'font-nunitosans' },
];

const FONT_SIZES = [0.875, 1, 1.125, 1.25, 1.5];

// Unified Reader Settings Menu (The "Aa" Menu)
const ReaderAppearanceMenu: React.FC<{
    theme: ReadingThemeMode;
    onThemeChange: (theme: ReadingThemeMode) => void;
    fontFamily: string;
    onFontFamilyChange: (family: string) => void;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
}> = ({ theme, onThemeChange, fontFamily, onFontFamilyChange, fontSize, onFontSizeChange }) => {
    const { setTrack, currentTrack, togglePlay, isPlaying } = useMusicStore();

    const handleAmbientSelect = (track: Track) => {
        if (currentTrack?.id === track.id && isPlaying) {
            togglePlay();
        } else {
            setTrack(track);
        }
    };
    
    const handleSizeChange = (increment: boolean) => {
        const currentIndex = FONT_SIZES.indexOf(fontSize);
        const newIndex = increment ? Math.min(currentIndex + 1, FONT_SIZES.length - 1) : Math.max(currentIndex - 1, 0);
        onFontSizeChange(FONT_SIZES[newIndex]);
    };

    return (
        <div className="flex flex-col gap-4 p-4 text-sm text-text-main dark:text-secondary-100 min-w-[280px]">
            {/* Section 1: Themes */}
            <div>
                <p className="text-xs font-bold text-text-subtle uppercase mb-2">Appearance</p>
                <div className="flex gap-2">
                    {(Object.keys(READING_THEMES) as ReadingThemeMode[]).map((mode) => {
                        const t = READING_THEMES[mode];
                        const isSelected = theme === mode;
                        return (
                            <button
                                key={mode}
                                onClick={() => onThemeChange(mode)}
                                className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center ${isSelected ? 'border-primary-500 scale-110 shadow-sm' : 'border-transparent opacity-80 hover:opacity-100'}`}
                                style={mode === 'default' ? { background: 'linear-gradient(135deg, #e5e7eb 50%, #334155 50%)' } : { backgroundColor: t.background, borderColor: isSelected ? undefined : t.uiBorder }}
                                title={t.name}
                            >
                                {isSelected && mode !== 'default' && <Icon name="check" className="w-4 h-4 text-primary-500" strokeWidth={3} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="h-px bg-secondary-200 dark:bg-secondary-700" />

            {/* Section 2: Typography */}
            <div>
                <p className="text-xs font-bold text-text-subtle uppercase mb-2">Typography</p>
                
                {/* Font Size */}
                <div className="flex items-center justify-between bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1 mb-3">
                    <button onClick={() => handleSizeChange(false)} disabled={fontSize === FONT_SIZES[0]} className="p-2 hover:text-primary-500 disabled:opacity-30"><Icon name="minus" className="w-4 h-4" /></button>
                    <span className="text-xs font-medium">{(fontSize * 16).toFixed(0)}px</span>
                    <button onClick={() => handleSizeChange(true)} disabled={fontSize === FONT_SIZES[FONT_SIZES.length-1]} className="p-2 hover:text-primary-500 disabled:opacity-30"><Icon name="plus" className="w-4 h-4" /></button>
                </div>

                {/* Font Family */}
                <div className="space-y-1">
                     {FONT_FACES.map(font => (
                        <button 
                            key={font.family} 
                            onClick={() => onFontFamilyChange(font.family)} 
                            className={`w-full text-left px-3 py-2 rounded-md transition-colors flex justify-between items-center ${fontFamily === font.family ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}
                        >
                            <span className="font-family">{font.name}</span>
                            {fontFamily === font.family && <Icon name="check" className="w-3.5 h-3.5" />}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-secondary-200 dark:bg-secondary-700" />

            {/* Section 3: Ambience */}
            <div>
                <p className="text-xs font-bold text-text-subtle uppercase mb-2">Ambience</p>
                <div className="space-y-1">
                    {AMBIENT_TRACKS.map(track => {
                        // eslint-disable-next-line react-hooks/rules-of-hooks
                        const { currentTrack, isPlaying } = useMusicStore();
                        const isActive = currentTrack?.id === track.id && isPlaying;
                        return (
                            <button key={track.id} onClick={() => handleAmbientSelect(track)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${isActive ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'hover:bg-secondary-100 dark:hover:bg-secondary-800'}`}>
                                <Icon name={track.icon} className="w-4 h-4"/>
                                <span>{track.name}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 bg-primary-500 rounded-full animate-pulse" />}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---

interface ReadingContentProps {
    noteId: string | null;
    viewMode: 'browser' | 'reading' | 'editing';
    onModeChange: () => void;
    onToggleSidebar: () => void;
    onBack: () => void;
}

const ReadingContent: React.FC<ReadingContentProps> = ({ noteId, viewMode, onModeChange, onToggleSidebar, onBack }) => {
    // Store Access
    const { updateNote, handleSaveToJournal, notes, addBookmark, updateNoteProgress, fetchNoteContent } = useNoteStore();
    const { tables, upsertRow } = useTableStore();
    const { setIsApiKeyModalOpen, showToast, setIsImmersive, isImmersive, toggleImmersiveMode } = useUIStore();
    const { addContextLink, contextLinks, fetchLinksForNote } = useContextLinkStore();
    const { readingScreenTarget, setReadingScreenTarget } = useSessionStore();
    const { addCounter, toggleTracking, counters } = useCounterStore();
    const { settings, setSettings } = useUserStore();

    // Local State
    const [activeNote, setActiveNote] = React.useState<Note | null>(null);
    const [localTitle, setLocalTitle] = React.useState('');
    const [isVocabPanelOpen, setIsVocabPanelOpen] = useLocalStorage('vmind-vocab-panel-visible', true);
    
    // Tools State
    const [selectedText, setSelectedText] = React.useState<string | null>(null);
    const [popupPosition, setPopupPosition] = React.useState<{ top: number; left: number } | null>(null);
    const [focusSelection, setFocusSelection] = React.useState<{ text: string; range: Range | null; startIndex?: number }>({ text: '', range: null });
    const [isPhraseMode, setIsPhraseMode] = React.useState(false);
    const [phraseSelection, setPhraseSelection] = React.useState<{ start: number | null, end: number | null }>({ start: null, end: null });
    const [toolbarPosition, setToolbarPosition] = React.useState<{ top: number; left: number } | null>(null);
    const [toolbarPriority, setToolbarPriority] = React.useState<'explain' | 'add' | 'default'>('default');

    // Zen Mode State
    const [isHeaderVisible, setIsHeaderVisible] = React.useState(true);
    const [readingProgress, setReadingProgress] = React.useState({ percent: 0, pagesLeft: 0 });
    const lastScrollY = React.useRef(0);
    const scrollTimeoutRef = React.useRef<number | null>(null);

    // Modals State
    const [isExplainModalOpen, setIsExplainModalOpen] = React.useState(false);
    const [explanation, setExplanation] = React.useState('');
    const [isExplainLoading, setIsExplainLoading] = React.useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isClozeModalOpen, setIsClozeModalOpen] = React.useState(false);
    
    // Appearance & Dictionary Menu State
    const [isAppearanceMenuOpen, setIsAppearanceMenuOpen] = React.useState(false);
    const [isDictSettingsOpen, setIsDictSettingsOpen] = React.useState(false);
    const readingConfig = settings.readingConfig || { fontFamily: 'font-serif', fontSize: 1.125, theme: 'default', dictionaryUrlTemplate: 'https://en.wiktionary.org/wiki/{WORD}' };
    const [localDictUrl, setLocalDictUrl] = React.useState(readingConfig.dictionaryUrlTemplate || '');
    const debouncedDictUrl = useDebounce(localDictUrl, 500);
    
    // Modal States for Viewing/Editing extracted words
    const [wordDetailModalRow, setWordDetailModalRow] = React.useState<VocabRow | null>(null);
    const [wordDetailModalTable, setWordDetailModalTable] = React.useState<Table | null>(null);
    const [wordInfoModalRow, setWordInfoModalRow] = React.useState<VocabRow | null>(null); // Read-only state
    const [wordInfoModalTable, setWordInfoModalTable] = React.useState<Table | null>(null); // Read-only state
    
    const [targetTableId, setTargetTableId] = React.useState('');
    const [targetColumnId, setTargetColumnId] = React.useState('');
    const [addStatus, setAddStatus] = React.useState<'idle' | 'adding' | 'added'>('idle');

    // Scroll handling for Virtualizer
    const scrollRef = React.useRef<HTMLDivElement>(null);
    
    const isReading = viewMode === 'reading';

    // --- Immersive Reading Logic ---
    React.useEffect(() => {
        if (viewMode === 'reading') {
            setIsImmersive(true);
        } else {
            setIsImmersive(false);
        }
        // Cleanup: Ensure NavBar is restored when leaving
        return () => setIsImmersive(false);
    }, [viewMode, setIsImmersive]);

    // --- Batch Mode Logic ---
    React.useEffect(() => {
        const engine = VmindSyncEngine.getInstance();
        engine.startBatchMode();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                engine.endBatchMode();
            } else {
                 engine.startBatchMode();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            engine.endBatchMode(); // Flush on unmount
        };
    }, []);
    
    // --- Data Fetching ---

    const noteFromStore = React.useMemo(() => notes.find(n => n.id === noteId), [notes, noteId]);

    React.useEffect(() => {
        if (noteId && noteFromStore) {
            setActiveNote(noteFromStore);
            setLocalTitle(noteFromStore.title);
            fetchLinksForNote(noteId);
            fetchNoteContent(noteId);
        } else {
            setActiveNote(null);
            setLocalTitle('');
        }
    }, [noteId, noteFromStore, fetchLinksForNote, fetchNoteContent]);

    // --- Virtualization Prep ---
    // Chunk the text only when content changes
    const { chunks, allTokens } = React.useMemo(() => {
        if (!activeNote?.content) return { chunks: [], allTokens: [] };
        return chunkTextForVirtualization(activeNote.content);
    }, [activeNote?.content]);

    // --- Linked Words Logic ---
    const linkedWordsForNote = React.useMemo(() => {
        if (!activeNote) return { rows: [], words: new Set<string>() };
        const linksForThisNote = contextLinks.filter(l => l.sourceType === 'reading' && l.sourceId === activeNote.id);
        const linkedRowIds = new Set(linksForThisNote.map(l => l.rowId));
        
        const rows: {row: VocabRow, table: Table}[] = [];
        const words = new Set<string>();

        for (const table of tables) {
            for (const row of table.rows) {
                if (linkedRowIds.has(row.id)) {
                    rows.push({row, table});
                    const link = linksForThisNote.find(l => l.rowId === row.id);
                    if (link?.metadata.selection) {
                        const normalized = link.metadata.selection.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
                        words.add(normalized);
                    }
                }
            }
        }
        return { rows, words };
    }, [contextLinks, activeNote, tables]);

    // --- Actions ---

    const updateReadingConfig = (config: Partial<typeof readingConfig>) => {
        setSettings({ ...settings, readingConfig: { ...readingConfig, ...config } });
    };
    
    React.useEffect(() => {
        setLocalDictUrl(readingConfig.dictionaryUrlTemplate || '');
    }, [readingConfig.dictionaryUrlTemplate]);
    
    React.useEffect(() => {
        if (debouncedDictUrl !== readingConfig.dictionaryUrlTemplate) {
            updateReadingConfig({ dictionaryUrlTemplate: debouncedDictUrl });
        }
    }, [debouncedDictUrl]);


    const handleTitleBlur = () => {
        if (!activeNote || localTitle === activeNote.title) return;
        updateNote({ ...activeNote, title: localTitle.trim() });
    };

    const handleUpdateContent = (newContent: string) => { 
        if (activeNote && newContent !== activeNote.content) { 
            updateNote({ ...activeNote, content: newContent }); 
        } 
    };

    const handleTrackingToggle = () => {
        if (!activeNote) return;
        const counter = counters.find(c => c.targetId === activeNote.id);
        if (!counter) {
            addCounter(activeNote.id, 'note', localTitle || 'Reading Note');
        } else {
            toggleTracking(activeNote.id);
        }
    };

    // Selection Handling for Edit Mode
    const handleEditModeSelection = () => {
        if (isReading) return;
        setTimeout(() => {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            if (selection && text && scrollRef.current) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                setFocusSelection({ text, range, startIndex: 0 }); // Start index not strictly needed for basic edit-add
                setSelectedText(text);
                setToolbarPriority(text.includes(' ') ? 'add' : 'explain');
                setPopupPosition({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
            } else {
                setPopupPosition(null);
                setSelectedText(null);
                setFocusSelection({ text: '', range: null });
            }
        }, 10);
    };

    // --- Interaction Logic (Virtual Compatible) ---
    
    // Zen Mode Scroll Handler
    const handleReadingScroll = (scrollTop: number) => {
        if (!activeNote) return;
        
        // Close toolbar on scroll
        setToolbarPosition(null);

        // 2. Logic for Zen Mode
        if (!scrollRef.current || !isReading) return;
        
        const { clientHeight, scrollHeight } = scrollRef.current;
        const maxScroll = scrollHeight - clientHeight;
        
        // Progress Calculation
        const percent = maxScroll > 0 ? Math.round((scrollTop / maxScroll) * 100) : 0;
        // Use a rough estimate of 800px per "page" on a mobile/tablet screen
        const pageHeight = 800;
        const pagesLeft = Math.ceil((maxScroll - scrollTop) / pageHeight);

        setReadingProgress({ percent, pagesLeft: Math.max(0, pagesLeft) });

        // Header Visibility Calculation
        const currentY = scrollTop;
        const delta = currentY - lastScrollY.current;
        const threshold = 10;

        // Always show near top to avoid getting stuck
        if (currentY <= 50) {
             setIsHeaderVisible(true);
        } 
        // Hide when scrolling down significantly
        else if (delta > threshold) {
             setIsHeaderVisible(false);
        } 
        // Show when scrolling up significantly
        else if (delta < -threshold) {
             setIsHeaderVisible(true);
        }

        lastScrollY.current = currentY;

        // Debounced Save Progress
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => {
            if (activeNote) {
                updateNoteProgress(activeNote.id, {
                    scrollTop,
                    percent, // calculated above
                    lastReadAt: Date.now()
                });
            }
        }, 1000);
    };
    
    const handleVirtualWordClick = (globalIndex: number, e: React.MouseEvent<HTMLSpanElement>, word: string) => {
        e.stopPropagation();
        
        // --- Phrase Mode 2.0 Logic: Fluid Cycle ---
        let newStart = phraseSelection.start;
        let newEnd = phraseSelection.end;

        if (isPhraseMode) {
            if (newStart === null || newEnd !== null) {
                // Start fresh cycle
                newStart = globalIndex;
                newEnd = null; 
                setToolbarPosition(null);
            } else {
                // Finalize Range
                if (globalIndex < newStart) {
                    newEnd = newStart;
                    newStart = globalIndex;
                } else {
                    newEnd = globalIndex;
                }
            }
        } else {
            // Single Word Selection
            newStart = globalIndex;
            newEnd = globalIndex;
        }

        setPhraseSelection({ start: newStart, end: newEnd });

        // Calculate Selection Toolbar
        if (newStart !== null && newEnd !== null) {
            // Reconstruct text from global tokens array
            const selectedTokens = allTokens.slice(newStart, newEnd + 1);
            const selectedText = selectedTokens.join('').trim();
            
            if (selectedText) {
                const rect = e.currentTarget.getBoundingClientRect();
                // Positioning relative to viewport (Fixed)
                const top = rect.top - 50; 
                const left = rect.left + rect.width / 2;
                
                // Calculate absolute character start index
                // Find chunk containing this token to optimize calculation
                const chunk = chunks.find(c => 
                    newStart! >= c.globalWordIndex && 
                    newStart! < (c.globalWordIndex + c.tokens.length)
                );
                
                let startIndex = 0;
                if (chunk) {
                    let charOffset = 0;
                    for (let i = chunk.globalWordIndex; i < newStart!; i++) {
                        charOffset += allTokens[i].length;
                    }
                    startIndex = chunk.globalStartIndex + charOffset;
                } else {
                    // Fallback (slow but safe)
                    for (let i = 0; i < newStart!; i++) {
                        startIndex += allTokens[i].length;
                    }
                }

                setFocusSelection({ text: selectedText, range: null, startIndex });
                setToolbarPriority(selectedText.includes(' ') ? 'add' : 'explain');
                setToolbarPosition({ top, left });
            } else {
                 setToolbarPosition(null);
                 setPhraseSelection({ start: null, end: null });
            }
        } else {
             setToolbarPosition(null);
        }
    };

    // Toolbar Actions
    const handleExplain = async () => {
        const textToExplain = focusSelection.text || selectedText;
        if (!textToExplain) return;
        setIsExplainLoading(true);
        setIsExplainModalOpen(true);
        try {
            const result = await explainText(textToExplain);
            setExplanation(result);
        } catch (error: any) {
            if (error.message === "API_KEY_MISSING") { setIsApiKeyModalOpen(true); setIsExplainModalOpen(false); }
            else { showToast("An unexpected AI error occurred.", "error"); setExplanation("Could not get explanation."); }
        } finally { setIsExplainLoading(false); }
    };
    
    const handleSaveJournalClick = () => { 
        const textToJournal = focusSelection.text || selectedText;
        if (!textToJournal || !activeNote) return; 
        handleSaveToJournal(`From Reading: "${activeNote.title}"`, `> ${textToJournal}`); 
        setPopupPosition(null); setSelectedText(null); setToolbarPosition(null); setPhraseSelection({ start: null, end: null });
    };

    const handleSearchDict = () => {
        const textToSearch = focusSelection.text || selectedText;
        if (!textToSearch || !readingConfig.dictionaryUrlTemplate) return;
        
        const url = readingConfig.dictionaryUrlTemplate.replace('{WORD}', encodeURIComponent(textToSearch));
        window.open(url, '_blank', 'noopener,noreferrer');

        setPopupPosition(null);
        setSelectedText(null);
        setToolbarPosition(null);
        setPhraseSelection({ start: null, end: null });
    };

    const handleConfirmAdd = async () => {
        const textToAdd = focusSelection.text || selectedText;
        if (!textToAdd || !targetTableId || !targetColumnId || !activeNote) return;
    
        setAddStatus('adding');
    
        const tableToUpdate = tables.find(t => t.id === targetTableId);
        if (!tableToUpdate) { setAddStatus('idle'); return; }
    
        let snippet = textToAdd;
        
        // Use full text context for snippets
        const fullText = activeNote.content || '';
        const selectionStartIndex = focusSelection.startIndex || 0;
        
        snippet = extractContextSnippet(
            fullText,
            textToAdd,
            selectionStartIndex,
            CONTEXT_WORD_COUNT
        );
    
        const newRowId = crypto.randomUUID();
        const newRow: VocabRow = { id: newRowId, cols: { [targetColumnId]: textToAdd }, stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: FlashcardStatus.New, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null } };
        
        const success = await upsertRow(tableToUpdate.id, newRow);
        
        if (success) {
          await addContextLink({ 
              rowId: newRowId, 
              sourceType: 'reading', 
              sourceId: activeNote.id, 
              metadata: { 
                  snippet: snippet,
                  selection: textToAdd,
                  selectionStartIndex: selectionStartIndex,
              } 
          });
          setAddStatus('added');
          setTimeout(() => {
            setAddStatus('idle');
            setIsAddModalOpen(false);
            setFocusSelection({text: '', range: null});
            setSelectedText(null);
            setToolbarPosition(null);
            setPhraseSelection({ start: null, end: null });
          }, 1500);
        } else {
          setAddStatus('idle');
        }
    };
    
    const handleBookmark = async () => {
        const text = focusSelection.text || selectedText || '';
        const startIndex = focusSelection.startIndex || 0;
        if (!activeNote) return;
        
        await addBookmark(activeNote.id, {
            startIndex,
            textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        });
        
        showToast("Bookmark added.", "success");
        setToolbarPosition(null);
        setPhraseSelection({ start: null, end: null });
    };

    const handleUpdateRowInModal = async (updatedRow: VocabRow): Promise<boolean> => {
        if (!wordDetailModalTable) return false;
        const success = await upsertRow(wordDetailModalTable.id, updatedRow);
        if (success) {
            setWordDetailModalRow(null);
        }
        return success;
    };
    
    // UI Render
    
    if (!noteId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-secondary-50 dark:bg-secondary-900/50">
                <div className="bg-white dark:bg-secondary-800 p-6 rounded-full shadow-sm mb-4">
                    <Icon name="reading-person" className="w-12 h-12 text-secondary-300 dark:text-secondary-600" variant="filled" />
                </div>
                <h2 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-2">Select a Note</h2>
                <p className="text-text-subtle max-w-sm">
                    Choose a note from the sidebar to start reading, or create a new one to capture your thoughts.
                </p>
            </div>
        );
    }
    
    if (!activeNote) return null;

    const counter = counters.find(c => c.targetId === activeNote.id);
    const isTracking = counter?.isActive ?? false;
    const readingFontClass = FONT_FACES.find(f => f.family === readingConfig.fontFamily)?.family || 'font-serif';
    const selectedTableForAdd = tables.find(t => t.id === targetTableId);

    // --- Dynamic Theme Logic ---
    const activeTheme = READING_THEMES[readingConfig.theme];
    const isPaperTheme = readingConfig.theme === 'paper';
    
    const containerStyle: React.CSSProperties = {};
    if (readingConfig.theme !== 'default') {
        containerStyle.backgroundColor = activeTheme.background;
        containerStyle.color = activeTheme.text;
    }
    const scrollContainerClasses = [
        'flex-1 overflow-y-auto relative flex flex-col min-w-0',
        readingFontClass,
        readingConfig.theme === 'default' ? 'bg-white dark:bg-secondary-800' : '',
        isPaperTheme ? 'focus-paper-bg theme-paper-grain' : ''
    ].filter(Boolean).join(' ');

    return (
        <div className={`flex flex-col h-full relative`}>
             <header 
                className={`
                    ${isReading ? 'absolute top-0 left-0 right-0' : 'relative'}
                    z-30 transition-transform duration-300 ease-in-out
                    px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center 
                    bg-background/95 dark:bg-secondary-900/95 backdrop-blur-md
                    ${isReading && !isHeaderVisible ? '-translate-y-full shadow-none border-transparent' : 'translate-y-0'}
                `}
            >
                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-2 text-lg font-medium overflow-hidden">
                    <button onClick={onToggleSidebar} className="p-2 rounded-full transition-colors text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700 md:hidden" title="Toggle Sidebar">
                        <Icon name="sidebar" className="w-5 h-5"/>
                    </button>
                    
                    <button onClick={onBack} className="flex items-center gap-1 text-text-subtle hover:text-text-main transition-colors flex-shrink-0">
                        <Icon name="arrowLeft" className="w-5 h-5"/>
                        <span className="hidden sm:inline">Back</span>
                    </button>

                    <div className="h-5 w-px bg-secondary-300 dark:bg-secondary-600 mx-1"></div>

                    {isReading ? (
                         <div className="font-bold text-text-main dark:text-secondary-100 truncate min-w-0">
                             {localTitle}
                         </div>
                    ) : (
                         <div className="flex items-center gap-2 text-text-main dark:text-secondary-100 font-bold truncate min-w-0 w-full">
                            <input
                                type="text"
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                className="bg-transparent focus:outline-none focus:bg-secondary-100 dark:focus:bg-secondary-700 rounded px-1 -ml-1 w-full truncate"
                            />
                            <Icon name="pencil" className="w-4 h-4 text-text-subtle flex-shrink-0" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                     {isReading && (
                        <>
                             {/* Dictionary Settings */}
                            <Popover
                                isOpen={isDictSettingsOpen}
                                setIsOpen={setIsDictSettingsOpen}
                                trigger={
                                    <button
                                        className="p-2 rounded-full transition-colors text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700"
                                        title="Dictionary Settings"
                                    >
                                        <Icon name="cog" className="w-5 h-5" />
                                    </button>
                                }
                                contentClassName="bg-background/95 dark:bg-secondary-900/95 backdrop-blur-md shadow-2xl border border-secondary-200 dark:border-secondary-700"
                            >
                                <div className="p-4 space-y-4 min-w-[280px]">
                                    <h4 className="text-sm font-bold text-text-subtle uppercase">Dictionary Settings</h4>
                                    <div>
                                        <label className="block text-xs font-medium text-text-main dark:text-secondary-200 mb-1">URL Template</label>
                                        <Input
                                            value={localDictUrl}
                                            onChange={(e) => setLocalDictUrl(e.target.value)}
                                            placeholder="e.g., https://dictionary.com/browse/{WORD}"
                                            className="text-sm"
                                        />
                                        <p className="text-xs text-text-subtle mt-1">Use <code>{`{WORD}`}</code> as a placeholder.</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-text-subtle mb-2">Presets</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button size="sm" variant="secondary" onClick={() => setLocalDictUrl('https://en.wiktionary.org/wiki/{WORD}')}>Wiktionary</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setLocalDictUrl('https://glosbe.com/en/vi/{WORD}')}>Glosbe (EN-VI)</Button>
                                            <Button size="sm" variant="secondary" onClick={() => setLocalDictUrl('https://translate.google.com/?sl=auto&tl=en&text={WORD}&op=translate')}>Google Translate</Button>
                                        </div>
                                    </div>
                                </div>
                            </Popover>

                             {/* Unified Appearance Menu */}
                             <Popover
                                isOpen={isAppearanceMenuOpen}
                                setIsOpen={setIsAppearanceMenuOpen}
                                trigger={
                                    <button 
                                        className="p-2 rounded-full transition-colors text-text-subtle hover:bg-secondary-200 dark:hover:bg-secondary-700" 
                                        title="Reader Appearance"
                                    >
                                        <Icon name="font" className="w-5 h-5" />
                                    </button>
                                }
                                contentClassName="bg-background/95 dark:bg-secondary-900/95 backdrop-blur-md shadow-2xl border border-secondary-200 dark:border-secondary-700"
                             >
                                <ReaderAppearanceMenu
                                    theme={readingConfig.theme}
                                    onThemeChange={(t) => updateReadingConfig({ theme: t })}
                                    fontFamily={readingConfig.fontFamily}
                                    onFontFamilyChange={(f) => updateReadingConfig({ fontFamily: f })}
                                    fontSize={readingConfig.fontSize}
                                    onFontSizeChange={(s) => updateReadingConfig({ fontSize: s })}
                                />
                             </Popover>

                             <button
                                onClick={() => setIsVocabPanelOpen(!isVocabPanelOpen)}
                                className={`p-2 rounded-full transition-colors hidden md:block ${isVocabPanelOpen ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                                title="Toggle Vocabulary Pane"
                            >
                                <Icon name="list-bullet" className="w-5 h-5" />
                            </button>
                        </>
                     )}
                    
                    <button
                        onClick={handleTrackingToggle}
                        className={`p-2 rounded-full transition-colors ${isTracking ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                        title={isTracking ? "Tracking Active" : "Track Activity"}
                    >
                        <Icon name="chart-bar" variant={isTracking ? 'filled' : 'outline'} className="w-5 h-5" />
                    </button>
                    
                    {/* Immersive Mode Toggle */}
                    {isReading && (
                        <button 
                            onClick={toggleImmersiveMode} 
                            className={`p-2 rounded-full transition-colors ${isImmersive ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-secondary-500 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`} 
                            title={isImmersive ? "Exit Fullscreen" : "Enter Fullscreen"}
                        >
                            <Icon name={isImmersive ? 'arrows-pointing-in' : 'arrows-pointing-out'} className="w-5 h-5"/>
                        </button>
                    )}
                    
                    {/* Only show Desktop Sidebar toggle here. Mobile toggle is in Breadcrumbs */}
                    <button onClick={onToggleSidebar} className="p-2 rounded-full transition-colors text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700 hidden md:block" title="Toggle Sidebar">
                        <Icon name="sidebar" className="w-5 h-5"/>
                    </button>

                    <Button 
                        onClick={onModeChange} 
                        variant={isReading ? "secondary" : "primary"}
                        className="ml-2 gap-2"
                        size="sm"
                    >
                        <Icon name={isReading ? "pencil" : "book"} className="w-4 h-4" />
                        <span>{isReading ? "Edit Note" : "Read"}</span>
                    </Button>
                </div>
            </header>

            {isReading && activeNote && (
                <div className="md:hidden pt-16">
                    <LinkedVocabDashboard 
                        noteId={activeNote.id} 
                        onViewRow={(row, table) => {
                            setWordInfoModalRow(row);
                            setWordInfoModalTable(table);
                        }}
                    />
                </div>
            )}

            <div className="flex-1 flex overflow-hidden">
                <div className={scrollContainerClasses} ref={scrollRef} style={containerStyle}>
                    {/* Floating Toolbars */}
                    {isReading && toolbarPosition && focusSelection.text && (
                        <FloatingToolbar
                            position={toolbarPosition}
                            onAdd={() => setIsAddModalOpen(true)}
                            onExplain={handleExplain}
                            onJournal={handleSaveJournalClick}
                            onCloze={() => { setIsClozeModalOpen(true); setToolbarPosition(null); }}
                            onBookmark={handleBookmark}
                            onSearchDict={readingConfig.dictionaryUrlTemplate ? handleSearchDict : undefined}
                            priority={toolbarPriority}
                        />
                    )}
                    {popupPosition && selectedText && !isReading && (
                        <FloatingToolbar
                            position={popupPosition}
                            onAdd={() => setIsAddModalOpen(true)}
                            onExplain={handleExplain}
                            onJournal={handleSaveJournalClick}
                            onCloze={() => { setIsClozeModalOpen(true); setPopupPosition(null); }}
                            onBookmark={handleBookmark}
                            priority={toolbarPriority}
                        />
                    )}
                    
                    {/* Reading Mode Controls (Phrase Selection) */}
                    {isReading && (
                        <div className={`absolute top-4 right-4 z-40 flex gap-2 transition-transform duration-300 ${!isHeaderVisible ? '-translate-y-16' : 'translate-y-16 md:translate-y-16'}`}>
                             <button
                                onClick={() => { setIsPhraseMode(!isPhraseMode); setPhraseSelection({ start: null, end: null }); setToolbarPosition(null); }}
                                title={isPhraseMode ? "Disable Phrase Mode" : "Enable Phrase Mode (Select multiple words)"}
                                className={`p-2 rounded-full transition-colors backdrop-blur-md shadow-sm border border-secondary-200 dark:border-secondary-700 ${isPhraseMode ? 'bg-primary-100 text-primary-600 ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-black' : 'bg-white/80 dark:bg-black/40 text-secondary-600 dark:text-secondary-300'}`}
                            >
                                <Icon name="text-wrap" className="w-5 h-5"/>
                            </button>
                        </div>
                    )}

                    {isReading ? (
                        <div 
                            className="w-full flex-1 flex flex-col items-center"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setPhraseSelection({ start: null, end: null });
                                    setToolbarPosition(null);
                                }
                            }}
                        >
                            {/* Layout Constraint Wrapper */}
                            <div className={`max-w-3xl mx-auto w-full px-4 md:px-8 py-8 pt-24 ${isImmersive ? 'pb-8 pb-[env(safe-area-inset-bottom)]' : 'pb-24'}`}>
                                <VirtualReadingContainer 
                                    key={activeNote.id} // Force remount on note switch
                                    chunks={chunks}
                                    wordsToHighlight={linkedWordsForNote.words}
                                    onWordClick={handleVirtualWordClick}
                                    phraseSelection={phraseSelection}
                                    isPhraseMode={isPhraseMode}
                                    initialScrollOffset={activeNote.progress?.scrollTop || 0}
                                    onScroll={handleReadingScroll}
                                    targetCharIndex={readingScreenTarget?.selectionStartIndex}
                                    scrollRef={scrollRef}
                                    fontClass={readingFontClass}
                                    fontSize={readingConfig.fontSize}
                                    themeMode={readingConfig.theme} // Pass theme for prose override
                                    bookmarks={activeNote.bookmarks || []}
                                />
                            </div>
                        </div>
                    ) : (
                         <div
                            contentEditable
                            suppressContentEditableWarning
                            onMouseUp={handleEditModeSelection}
                            onBlur={(e) => handleUpdateContent(e.currentTarget.innerText)}
                            className="flex-1 w-full p-4 md:p-8 pt-4 pb-24 prose dark:prose-invert max-w-none bg-white dark:bg-secondary-800 focus:outline-none"
                         >
                            {activeNote.content}
                         </div>
                    )}

                    {/* Linked Words Footer (Standard Mode) */}
                    {!isReading && linkedWordsForNote.rows.length > 0 && (
                        <div className="p-3 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900/50 flex-shrink-0">
                            <p className="text-xs font-bold text-text-subtle uppercase mb-2">Linked Vocabulary</p>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                 {linkedWordsForNote.rows.map(({row, table}) => {
                                    const wordText = row.cols[table.columns[0]?.id] || '...';
                                    return (
                                        <button key={row.id} onClick={() => { setWordDetailModalRow(row); setWordDetailModalTable(table); }} className="px-3 py-1 rounded-full text-xs font-semibold bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 text-secondary-600 dark:text-secondary-300 hover:border-primary-500 transition-colors">
                                            {wordText}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Reading Progress Footer (Zen Mode) */}
                {isReading && (
                    <ReadingFooter percent={readingProgress.percent} pagesLeft={readingProgress.pagesLeft} visible={!isHeaderVisible} />
                )}

                {/* Desktop Right Sidebar: Vocabulary Pane */}
                {isReading && isVocabPanelOpen && activeNote && (
                    <aside className="hidden md:flex w-72 flex-shrink-0 border-l border-secondary-200 dark:border-secondary-700 bg-surface dark:bg-secondary-800 flex-col transition-all z-10 pt-16">
                        <LinkedVocabDashboard 
                            noteId={activeNote.id} 
                            onViewRow={(row, table) => {
                                setWordInfoModalRow(row);
                                setWordInfoModalTable(table);
                            }}
                            variant="sidebar"
                        />
                    </aside>
                )}
            </div>
            
            {/* Modals */}
            <Modal isOpen={isExplainModalOpen} onClose={() => setIsExplainModalOpen(false)} title={`Explanation for "${focusSelection.text || selectedText}"`}>
                <div className="p-6"> {isExplainLoading ? ( <div className="flex items-center justify-center h-24"><Icon name="spinner" className="w-8 h-8 text-primary-500 animate-spin"/></div> ) : ( <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{explanation}</div> )} </div>
            </Modal>

            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Add "${focusSelection.text || selectedText}"`} containerClassName="max-w-md w-full m-0 sm:m-4 fixed bottom-0 sm:bottom-auto sm:relative rounded-b-none sm:rounded-lg animate-slideInUp sm:animate-fade-scale-in">
                <div className="p-6">
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-text-subtle">Select destination:</p>
                        <div className="flex flex-col gap-2">
                            <select value={targetTableId} onChange={e => setTargetTableId(e.target.value)} className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-2 text-sm"><option value="">Select Table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                            <select value={targetColumnId} onChange={e => setTargetColumnId(e.target.value)} disabled={!selectedTableForAdd} className="w-full bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-2 text-sm"><option value="">Select Column</option>{selectedTableForAdd?.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleConfirmAdd} disabled={!targetTableId || !targetColumnId || addStatus !== 'idle'} className="w-full justify-center">
                            {addStatus === 'idle' && 'Confirm Add'}
                            {addStatus === 'adding' && <Icon name="spinner" className="w-5 h-5 animate-spin" />}
                            {addStatus === 'added' && <><Icon name="check" className="w-5 h-5"/> Added!</>}
                        </Button>
                    </div>
                </div>
            </Modal>

            {activeNote && isClozeModalOpen && (
                <ClozeCreationModal
                    isOpen={isClozeModalOpen}
                    onClose={() => setIsClozeModalOpen(false)}
                    selectionText={focusSelection.text}
                    selectionStartIndex={focusSelection.startIndex || 0}
                    activeNote={activeNote}
                />
            )}

            {wordDetailModalTable && (
                <WordDetailModal
                    isOpen={!!wordDetailModalRow}
                    row={wordDetailModalRow}
                    table={wordDetailModalTable}
                    columns={wordDetailModalTable.columns}
                    onClose={() => setWordDetailModalRow(null)}
                    onSave={handleUpdateRowInModal}
                    onDelete={() => {}}
                    onConfigureAI={() => {}}
                />
            )}
            
            {/* Read-Only Word Info Modal */}
            {wordInfoModalTable && (
                <WordInfoModal
                    isOpen={!!wordInfoModalRow}
                    row={wordInfoModalRow}
                    table={wordInfoModalTable}
                    onClose={() => setWordInfoModalRow(null)}
                    onEdit={() => {
                         // Switch to edit mode if requested
                         setWordDetailModalRow(wordInfoModalRow);
                         setWordDetailModalTable(wordInfoModalTable);
                         setWordInfoModalRow(null);
                    }}
                />
            )}
        </div>
    );
};

export default ReadingContent;
