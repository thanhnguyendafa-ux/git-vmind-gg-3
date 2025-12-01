import * as React from 'react';
import { Note, Table, VocabRow, FlashcardStatus, Screen } from '../../types';
import Icon from '../../components/ui/Icon';
import Modal from '../../components/ui/Modal';
import Popover from '../../components/ui/Popover';
import { explainText } from '../../services/geminiService';
import { useNoteStore } from '../../stores/useNoteStore';
import { useTableStore } from '../../stores/useTableStore';
import { useUIStore } from '../../stores/useUIStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../services/supabaseClient';
import { useContextLinkStore } from '../../stores/useContextLinkStore';
import WordDetailModal from '../tables/WordDetailModal';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Button } from '../../components/ui/Button';
import { extractContextSnippet, CONTEXT_WORD_COUNT } from '../../utils/textUtils';
import { useMusicStore, Track } from '../../stores/useMusicStore';
import { useDebounce } from '../../hooks/useDebounce';
import ClozeCreationModal from './components/ClozeCreationModal';

const FloatingToolbar: React.FC<{
  position: { top: number; left: number };
  onAdd: () => void;
  onExplain: () => void;
  onJournal: () => void;
  onCloze: () => void;
  priority: 'explain' | 'add' | 'default';
}> = ({ position, onAdd, onExplain, onJournal, onCloze, priority }) => {
  const explainVariant = priority === 'explain' ? 'primary' : 'ghost';
  const addVariant = priority === 'add' ? 'primary' : 'ghost';

  return (
    <div
      className="absolute z-10 bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg flex items-center -translate-x-1/2 transition-opacity animate-fade-scale-in"
      style={{ top: position.top, left: position.left }}
    >
      <Button variant={explainVariant} size="sm" onClick={onExplain} className="rounded-r-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="sparkles" className="w-4 h-4 text-info-500" /> Explain</Button>
      <Button variant={addVariant} size="sm" onClick={onAdd} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="plus" className="w-4 h-4" /> Add</Button>
      <Button variant="ghost" size="sm" onClick={onCloze} className="rounded-none border-r border-secondary-200 dark:border-secondary-700 gap-2"><Icon name="puzzle-piece" className="w-4 h-4 text-purple-500" /> Cloze</Button>
      <Button variant="ghost" size="sm" onClick={onJournal} className="rounded-l-none gap-2"><Icon name="book" className="w-4 h-4 text-success-500" /> Journal</Button>
    </div>
  );
};


const HighlightedContent: React.FC<{ content: string, wordsToHighlight: Set<string> }> = React.memo(({ content, wordsToHighlight }) => {
    if (!wordsToHighlight.size || !content) {
        return <>{content}</>;
    }
    const safeWords = Array.from(wordsToHighlight).map((word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${safeWords.join('|')})\\b`, 'gi');
    const parts = content.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                wordsToHighlight.has(part.toLowerCase()) ? (
                    <span key={i} className="border-b-2 border-dotted border-primary-400/70">
                        {part}
                    </span>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                )
            )}
        </>
    );
});


const FocusModeContent: React.FC<{
    content: string;
    wordsToHighlight: Set<string>;
    onWordClick: (index: number, e: React.MouseEvent<HTMLSpanElement>, word: string) => void;
    phraseSelection: { start: number | null, end: number | null };
}> = React.memo(({ content, wordsToHighlight, onWordClick, phraseSelection }) => {
    const wordsAndSpaces = React.useMemo(() => content.split(/(\s+)/), [content]);

    return (
        <div className="flex flex-wrap items-baseline leading-relaxed">
            {wordsAndSpaces.map((word, index) => {
                if (/^\s+$/.test(word)) {
                    return <span key={index}>{word}</span>;
                }
                
                const isSelected = phraseSelection.start !== null && phraseSelection.end !== null && index >= phraseSelection.start && index <= phraseSelection.end;
                const normalizedWord = word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
                const shouldHighlightLinked = wordsToHighlight.has(normalizedWord);
                
                return (
                    <span
                        key={index}
                        onClick={(e) => onWordClick(index, e, word)}
                        className={`
                            px-1 rounded-md cursor-pointer transition-all duration-200 ease-out
                            ${isSelected 
                                ? 'bg-primary-300/90 dark:bg-primary-700/90 shadow-lg scale-105 z-10' 
                                : 'hover:bg-secondary-200/60 dark:hover:bg-secondary-700/60'
                            }
                        `}
                    >
                        {shouldHighlightLinked && !isSelected 
                            ? <span className="border-b-2 border-dotted border-primary-400/80">{word}</span>
                            : word
                        }
                    </span>
                );
            })}
        </div>
    );
});

const AMBIENT_TRACKS: Track[] = [
    { id: 'rain', name: 'Rain', icon: 'cloud-rain', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/rain.mp3' },
    { id: 'library', name: 'Library', icon: 'book', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/library.mp3' },
    { id: 'wind', name: 'Wind', icon: 'wind', url: 'https://storage.googleapis.com/aai-web-samples/vmind/audio/wind.mp3' },
];

const AmbientSoundsControl: React.FC = () => {
    const { setTrack, currentTrack, togglePlay, isPlaying } = useMusicStore();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSelect = (track: Track) => {
        if (currentTrack?.id === track.id && isPlaying) {
            togglePlay();
        } else {
            setTrack(track);
        }
    };
    
    const isAmbientPlaying = isPlaying && AMBIENT_TRACKS.some(t => t.id === currentTrack?.id);

    return (
        <Popover
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            trigger={
                <button className={`p-2 rounded-full transition-all text-text-subtle hover:bg-black/10 dark:hover:bg-white/10 ${isAmbientPlaying ? 'text-primary-500' : ''}`} title="Ambient Sounds">
                    <Icon name="music-note" className="w-5 h-5"/>
                </button>
            }
            contentClassName="w-48 bg-background/80 dark:bg-secondary-900/80 backdrop-blur-md"
        >
            <div className="space-y-1">
                {AMBIENT_TRACKS.map(track => {
                    const isActive = currentTrack?.id === track.id && isPlaying;
                    return (
                        <button key={track.id} onClick={() => handleSelect(track)} className={`w-full flex items-center gap-2 p-2 rounded-md text-sm font-semibold transition-colors ${isActive ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700/50'}`}>
                            <Icon name={track.icon} className="w-4 h-4"/>
                            {track.name}
                        </button>
                    );
                })}
            </div>
        </Popover>
    );
}

const FONT_FACES = [
    { name: 'Lora', family: 'font-serif', isSerif: true },
    { name: 'Merriweather', family: 'font-merriweather', isSerif: true },
    { name: 'Literata', family: 'font-literata', isSerif: true },
    { name: 'Inter', family: 'font-sans', isSerif: false },
    { name: 'Nunito Sans', family: 'font-nunitosans', isSerif: false },
];
const FONT_SIZES = [14, 16, 18, 20, 24];

const FontSettingsControl: React.FC<{
    fontFamily: string;
    onFontFamilyChange: (family: string) => void;
    fontSize: number;
    onFontSizeChange: (size: number) => void;
}> = ({ fontFamily, onFontFamilyChange, fontSize, onFontSizeChange }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleSizeChange = (increment: boolean) => {
        const currentIndex = FONT_SIZES.indexOf(fontSize);
        const newIndex = increment ? Math.min(currentIndex + 1, FONT_SIZES.length - 1) : Math.max(currentIndex - 1, 0);
        onFontSizeChange(FONT_SIZES[newIndex]);
    };

    return (
        <Popover
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            trigger={
                <button className="p-2 rounded-full transition-all text-text-subtle hover:bg-black/10 dark:hover:bg-white/10" title="Font Settings">
                    <Icon name="font" className="w-5 h-5"/>
                </button>
            }
            contentClassName="w-64 bg-background/80 dark:bg-secondary-900/80 backdrop-blur-md"
        >
            <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-2">
                    <span className="text-sm font-semibold">Font Size</span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSizeChange(false)} disabled={fontSize === FONT_SIZES[0]}>-</Button>
                        <span className="w-8 text-center text-xs">{fontSize}px</span>
                        <Button variant="ghost" size="sm" onClick={() => handleSizeChange(true)} disabled={fontSize === FONT_SIZES[FONT_SIZES.length-1]}>+</Button>
                    </div>
                </div>
                 {FONT_FACES.map(font => (
                    <button key={font.family} onClick={() => onFontFamilyChange(font.family)} className={`w-full text-left p-2 rounded-md transition-colors ${fontFamily === font.family ? 'bg-primary-100 dark:bg-primary-900/50' : 'hover:bg-secondary-100 dark:hover:bg-secondary-700/50'}`}>
                        <span className={font.family}>{font.name}</span>
                    </button>
                ))}
            </div>
        </Popover>
    );
};


const ReadingScreen: React.FC = () => {
  const { notes, createNote, updateNote, deleteNote, handleSaveToJournal } = useNoteStore();
  const { tables, upsertRow } = useTableStore();
  const { setCurrentScreen, showToast, setIsApiKeyModalOpen } = useUIStore();
  const { readingScreenTarget, setReadingScreenTarget } = useSessionStore();
  const { addContextLink, contextLinks } = useContextLinkStore();
  const [activeNoteId, setActiveNoteId] = React.useState<string | null>(null);
  const [localTitle, setLocalTitle] = React.useState('');
  const [selectedText, setSelectedText] = React.useState<string | null>(null);
  const [popupPosition, setPopupPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = React.useState(false);
  const [explanation, setExplanation] = React.useState('');
  const [isExplainLoading, setIsExplainLoading] = React.useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isClozeModalOpen, setIsClozeModalOpen] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [wordDetailModalRow, setWordDetailModalRow] = React.useState<VocabRow | null>(null);
  const [wordDetailModalTable, setWordDetailModalTable] = React.useState<Table | null>(null);
  
  const [isFocusMode, setIsFocusMode] = React.useState(false);
  const [focusModeState, setFocusModeState] = React.useState<'off' | 'entering' | 'on' | 'leaving'>('off');
  const [toolbarPriority, setToolbarPriority] = React.useState<'explain' | 'add' | 'default'>('default');

  const [isPhraseMode, setIsPhraseMode] = React.useState(false);
  const [phraseSelection, setPhraseSelection] = React.useState<{ start: number | null, end: number | null }>({ start: null, end: null });
  const [focusSelection, setFocusSelection] = React.useState<{ text: string; range: Range | null; startIndex?: number }>({ text: '', range: null });
  const [toolbarPosition, setToolbarPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [addStatus, setAddStatus] = React.useState<'idle' | 'adding' | 'added'>('idle');
  const [lastUsedTableId, setLastUsedTableId] = useLocalStorage<string>('readingFocusTargetTable', '');
  const [lastUsedColumnId, setLastUsedColumnId] = useLocalStorage<string>('readingFocusTargetColumn', '');
  const [targetTableId, setTargetTableId] = React.useState(lastUsedTableId);
  const [targetColumnId, setTargetColumnId] = React.useState(lastUsedColumnId);
  const contentEditableRef = React.useRef<HTMLDivElement>(null);
  const positionerRef = React.useRef<HTMLDivElement>(null);
  
  // New state for Reader's Sanctuary
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('vmind-reading-sidebar-collapsed', false);
  const [readingFont, setReadingFont] = useLocalStorage('vmind-reading-font', 'font-serif');
  const [readingFontSize, setReadingFontSize] = useLocalStorage('vmind-reading-font-size', 18);
  const [scrollPositions, setScrollPositions] = useLocalStorage<Record<string, number>>('vmind-reading-progress', {});
  const [rawScrollTop, setRawScrollTop] = React.useState(0);
  const debouncedScrollTop = useDebounce(rawScrollTop, 500);

  const readingNotes = React.useMemo(() => {
    return notes
      .filter(n => !/\[\d{2}-\d{2}-\d{2} Journal\]/.test(n.title))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notes]);
  
  // --- Scroll Position Saving ---
  React.useEffect(() => {
    if (activeNoteId) {
      setScrollPositions(prev => ({ ...prev, [activeNoteId]: debouncedScrollTop }));
    }
  }, [debouncedScrollTop, activeNoteId, setScrollPositions]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
        if (activeNoteId && contentEditableRef.current && contentEditableRef.current.scrollTop > 0) {
            // Use direct localStorage write for synchronous operation on unload
            const currentPositions = JSON.parse(localStorage.getItem('vmind-reading-progress') || '{}');
            currentPositions[activeNoteId] = contentEditableRef.current.scrollTop;
            localStorage.setItem('vmind-reading-progress', JSON.stringify(currentPositions));
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeNoteId]);


  const toggleFocusMode = () => {
    if (focusModeState === 'off') {
        setIsFocusMode(true);
        setFocusModeState('entering');
    } else if (focusModeState === 'on') {
        setFocusModeState('leaving');
    }
  };
  
  const handleAnimationEnd = () => {
    if (focusModeState === 'entering') {
        setFocusModeState('on');
    } else if (focusModeState === 'leaving') {
        setFocusModeState('off');
        setIsFocusMode(false);
        setToolbarPosition(null);
        setPhraseSelection({ start: null, end: null });
    }
  };


  React.useEffect(() => {
    if (readingScreenTarget) {
        setActiveNoteId(readingScreenTarget.noteId);
    }
  }, [readingScreenTarget]);


  const activeNoteFromStore = readingNotes.find(n => n.id === activeNoteId);
  const wordsAndSpaces = React.useMemo(() => activeNoteFromStore?.content?.split(/(\s+)/) || [], [activeNoteFromStore?.content]);

  const fetchNoteContent = async () => {
    if (!activeNoteId) return null;
    const { data, error } = await supabase.from('notes').select('content').eq('id', activeNoteId).single();
    if (error) throw new Error(error.message);
    return data.content;
  };

  const { data: noteContent, isLoading: isNoteContentLoading } = useQuery({
      queryKey: ['noteContent', activeNoteId],
      queryFn: fetchNoteContent,
      enabled: !!activeNoteId && !!activeNoteFromStore && activeNoteFromStore.content === undefined,
  });
  
  // --- Scroll Position Restoration ---
  React.useEffect(() => {
      if (activeNoteId && contentEditableRef.current && !isNoteContentLoading) {
        const savedPosition = scrollPositions[activeNoteId];
        if (typeof savedPosition === 'number') {
            contentEditableRef.current.scrollTo({ top: savedPosition, behavior: 'auto' });
        } else {
            contentEditableRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
      }
  }, [activeNoteId, isNoteContentLoading]); // scrollPositions is omitted to prevent re-scrolling on save

  React.useEffect(() => {
      if (noteContent !== undefined && activeNoteFromStore && activeNoteFromStore.content === undefined) {
          updateNote({ ...activeNoteFromStore, content: noteContent });
      }
  }, [noteContent, activeNoteFromStore, updateNote]);

  const activeNote = readingNotes.find(n => n.id === activeNoteId);

  React.useEffect(() => {
    if (activeNote) {
        setLocalTitle(activeNote.title);
    }
  }, [activeNote]);
  
  React.useEffect(() => {
    if (
        readingScreenTarget &&
        typeof readingScreenTarget.selectionStartIndex === 'number' &&
        readingScreenTarget.selectionText &&
        contentEditableRef.current &&
        !isNoteContentLoading &&
        activeNote?.content
    ) {
        const container = contentEditableRef.current;
        const index = readingScreenTarget.selectionStartIndex;
        const textLength = readingScreenTarget.selectionText.length;

        const findNodeAndOffset = (containerNode: Node, charIndex: number): { node: Node; offset: number } | null => {
            const walker = document.createTreeWalker(containerNode, NodeFilter.SHOW_TEXT);
            let currentNode = walker.nextNode();
            let accumulatedLength = 0;
            while (currentNode) {
                const nodeLength = currentNode.textContent?.length || 0;
                if (accumulatedLength + nodeLength >= charIndex) {
                    return { node: currentNode, offset: charIndex - accumulatedLength };
                }
                accumulatedLength += nodeLength;
                currentNode = walker.nextNode();
            }
            return null;
        };
        
        const startPos = findNodeAndOffset(container, index);
        
        if (startPos) {
            try {
                const range = document.createRange();
                range.setStart(startPos.node, startPos.offset);
                const endOffset = startPos.offset + textLength;
                if (endOffset <= (startPos.node.textContent?.length || 0)) {
                    range.setEnd(startPos.node, endOffset);
                } else {
                    range.setEnd(startPos.node, startPos.node.textContent?.length || startPos.offset);
                }
                
                const selection = window.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
                
                const span = document.createElement('span');
                span.className = 'animate-pulse-bg rounded transition-all duration-300';
                
                range.surroundContents(span);
                span.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                setTimeout(() => {
                    if (span.parentNode) {
                        const parent = span.parentNode;
                        while (span.firstChild) {
                            parent.insertBefore(span.firstChild, span);
                        }
                        parent.removeChild(span);
                        parent.normalize();
                    }
                }, 2500);

            } catch (e) {
                console.error("Error highlighting selection:", e);
                container.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        setReadingScreenTarget(null);
    } else if (readingScreenTarget) {
        setReadingScreenTarget(null);
    }
  }, [readingScreenTarget, setReadingScreenTarget, isNoteContentLoading, activeNote]);


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

  React.useEffect(() => {
    if (!activeNoteId && readingNotes.length > 0) { setActiveNoteId(readingNotes[0].id); }
    if (readingNotes.length > 0 && !readingNotes.some(n => n.id === activeNoteId)) { setActiveNoteId(readingNotes[0]?.id || null); }
  }, [readingNotes, activeNoteId]);
  
  React.useEffect(() => {
    setTargetTableId(lastUsedTableId);
    setTargetColumnId(lastUsedColumnId);
  }, [lastUsedTableId, lastUsedColumnId]);

  
  const handleTitleBlur = () => {
    if (!activeNote || localTitle === activeNote.title) return;

    if (/\[\d{2}-\d{2}-\d{2} Journal\]/.test(localTitle)) {
        showToast("Title format is reserved for Journal entries.", "error");
        setLocalTitle(activeNote.title); // Revert
    } else {
        updateNote({ ...activeNote, title: localTitle.trim() });
    }
  };

  const handleUpdateContent = (newContent: string) => { if (activeNote && newContent !== activeNote.content) { updateNote({ ...activeNote, content: newContent }); } };
  
  const handleNormalModeSelection = () => {
    if (isFocusMode) return;
    setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (selection && text && contentEditableRef.current) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          
          const preSelectionRange = document.createRange();
          preSelectionRange.selectNodeContents(contentEditableRef.current);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          const startIndex = preSelectionRange.toString().length;

          setFocusSelection({ text, range, startIndex });
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
  
  const handleWordClick = (index: number, e: React.MouseEvent<HTMLSpanElement>, word: string) => {
    e.stopPropagation();

    let newStart = phraseSelection.start;
    let newEnd = phraseSelection.end;

    if (isPhraseMode) {
        if (newStart === null || newEnd === null) {
            newStart = index;
            newEnd = index;
        } else {
            if (index < newStart) newStart = index;
            else if (index > newEnd) newEnd = index;
            else { 
                newStart = index;
                newEnd = index;
            }
        }
    } else {
        newStart = index;
        newEnd = index;
    }

    setPhraseSelection({ start: newStart, end: newEnd });

    const selectedText = wordsAndSpaces.slice(newStart, newEnd + 1).join('').trim();
    
    if (selectedText) {
        const rect = e.currentTarget.getBoundingClientRect();
        
        if (!positionerRef.current) return;
        const positionerRect = positionerRef.current.getBoundingClientRect();

        const top = rect.top - positionerRect.top - 45; // 45px for toolbar height + offset
        const left = rect.left - positionerRect.left + rect.width / 2;
        
        let startIndex = 0;
        for (let i = 0; i < newStart; i++) {
            startIndex += wordsAndSpaces[i].length;
        }

        setFocusSelection({ text: selectedText, range: null, startIndex });
        setToolbarPriority(selectedText.includes(' ') ? 'add' : 'explain');
        setToolbarPosition({ top, left });
    } else {
        setToolbarPosition(null);
        setPhraseSelection({ start: null, end: null });
    }
  };

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
        else { showToast("An unexpected AI error occurred.", "error"); console.error("Error explaining text:", error); setExplanation("Could not get explanation due to an error."); }
    } finally { setIsExplainLoading(false); }
  };
  
  const handleSaveJournalClick = () => { 
    const textToJournal = focusSelection.text || selectedText;
    if (!textToJournal || !activeNote) return; 
    handleSaveToJournal(`From Reading: "${activeNote.title}"`, `> ${textToJournal}`); 
    setPopupPosition(null); 
    setSelectedText(null); 
    setToolbarPosition(null);
    setPhraseSelection({ start: null, end: null });
  };

  const handleConfirmAdd = async () => {
    const textToAdd = focusSelection.text || selectedText;
    if (!textToAdd || !targetTableId || !targetColumnId || !activeNote || !contentEditableRef.current) return;

    setAddStatus('adding');

    const tableToUpdate = tables.find(t => t.id === targetTableId);
    if (!tableToUpdate) { setAddStatus('idle'); return; }

    let snippet = textToAdd;
    let selectionStartIndex;

    if (isFocusMode && focusSelection.startIndex !== undefined) {
        const fullText = contentEditableRef.current.innerText;
        selectionStartIndex = focusSelection.startIndex;

        snippet = extractContextSnippet(
            fullText,
            textToAdd,
            selectionStartIndex,
            CONTEXT_WORD_COUNT
        );
    }

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
  
  const handleToolbarAdd = () => { setIsAddModalOpen(true); };
  const handleToolbarExplain = () => { setTimeout(() => handleExplain(), 0); };
  const handleToolbarJournal = () => { setTimeout(() => handleSaveJournalClick(), 0); };
  const handleToolbarCloze = () => {
    if (focusSelection.text) {
      setIsClozeModalOpen(true);
      setPopupPosition(null);
      setToolbarPosition(null);
    } else {
      showToast("Please select text to create a cloze card.", "info");
    }
  };

  const handleNoteSelection = (noteId: string) => { setActiveNoteId(noteId); setIsSidebarOpen(false); };

  const SidebarContent = (
    <>
        <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-lg font-bold text-secondary-800 dark:text-white">My Notes</h2>
            <div className="flex items-center gap-1">
              <button onClick={() => createNote()} className="text-secondary-500 dark:text-secondary-400 hover:text-primary-500 transition-colors p-1"><Icon name="plus" className="w-6 h-6"/></button>
              <button onClick={() => setIsSidebarCollapsed(true)} className="text-secondary-500 dark:text-secondary-400 hover:text-primary-500 transition-colors p-1 hidden md:block" title="Collapse sidebar">
                <Icon name="chevron-left" className="w-6 h-6"/>
              </button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {readingNotes.length === 0 && ( <div className="p-4 text-center text-secondary-500 dark:text-secondary-400 text-sm">Create a note to get started.</div> )}
          {readingNotes.map(note => ( <div key={note.id} onClick={() => handleNoteSelection(note.id)} className={`p-4 cursor-pointer border-l-4 ${activeNoteId === note.id ? 'border-primary-500 bg-secondary-100 dark:bg-secondary-900/50' : 'border-transparent hover:bg-secondary-50 dark:hover:bg-secondary-800'}`}> <h3 className="font-semibold text-secondary-800 dark:text-secondary-200 truncate">{note.title}</h3> <p className="text-sm text-secondary-500 dark:text-secondary-400 truncate-2-lines">{note.content || '...'}</p> </div> ))}
        </div>
    </>
  );

  const selectedTableForAdd = tables.find(t => t.id === targetTableId);
  const readingFontClass = FONT_FACES.find(f => f.family === readingFont)?.family || 'font-serif';

  return (
    <div className="h-screen flex flex-col bg-secondary-100 dark:bg-secondary-900 animate-fadeIn">
       <header className={`p-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center flex-shrink-0 bg-white dark:bg-secondary-800/50 transition-opacity duration-300 ${focusModeState === 'entering' || focusModeState === 'leaving' ? 'opacity-0' : 'opacity-100'}`}>
            <div className="flex items-center gap-3">
                <button onClick={() => setCurrentScreen(Screen.Vmind)} className="text-secondary-500 dark:text-secondary-400 hover:text-secondary-800 dark:hover:text-white transition-colors p-1 rounded-full"><Icon name="arrowLeft" className="w-5 h-5" /></button>
                <h1 className="text-xl font-bold text-secondary-800 dark:text-white">Reading Space</h1>
            </div>
            <div className="flex items-center gap-2">
                {isFocusMode && (
                  <button
                      onClick={() => {
                        setIsPhraseMode(!isPhraseMode);
                        setPhraseSelection({ start: null, end: null });
                        setToolbarPosition(null);
                      }}
                      title={isPhraseMode ? "Disable Phrase Select" : "Enable Phrase Select (tap multiple words)"}
                      className={`p-2 rounded-full transition-colors ${isPhraseMode ? 'bg-primary-100 text-primary-600' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                  >
                      <Icon name="arrows-right-left" className="w-5 h-5"/>
                  </button>
                )}
                <button onClick={toggleFocusMode} title={isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'} className={`p-2 rounded-full transition-colors ${isFocusMode ? 'bg-primary-100 text-primary-600' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}>
                    <Icon name={isFocusMode ? 'lock-open' : 'lock-closed'} className="w-5 h-5"/>
                </button>
                <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-secondary-500 dark:text-secondary-400 p-1"><Icon name="list-bullet" className="w-6 h-6"/></button>
            </div>
        </header>
      <div ref={positionerRef} className="flex flex-1 overflow-hidden relative">
        {(focusModeState === 'entering' || focusModeState === 'leaving') && <div className="absolute inset-0 bg-black/10 dark:bg-black/30 z-10"/>}
        {isFocusMode && toolbarPosition && focusSelection.text && (
            <FloatingToolbar
            position={toolbarPosition}
            onAdd={handleToolbarAdd}
            onExplain={handleToolbarExplain}
            onJournal={handleToolbarJournal}
            onCloze={handleToolbarCloze}
            priority={toolbarPriority}
            />
        )}
        {popupPosition && selectedText && (
            <div ref={positionerRef}>
                <FloatingToolbar
                    position={popupPosition}
                    onAdd={handleToolbarAdd}
                    onExplain={handleToolbarExplain}
                    onJournal={handleToolbarJournal}
                    onCloze={handleToolbarCloze}
                    priority={toolbarPriority}
                />
            </div>
        )}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`absolute top-0 left-0 h-full w-3/4 max-w-xs bg-white dark:bg-secondary-800 flex flex-col z-40 transition-all duration-300 ease-in-out md:relative md:z-auto md:translate-x-0 md:border-r md:dark:border-secondary-700 overflow-hidden ${isSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full'} ${isSidebarCollapsed ? 'md:w-0 md:border-none' : 'md:w-1/4'} ${focusModeState === 'entering' || focusModeState === 'leaving' ? 'opacity-0 -translate-x-full md:translate-x-0 md:w-0' : 'opacity-100'}`}>
           <div className="flex-1 flex flex-col overflow-y-auto">{SidebarContent}</div>
        </aside>
        
        <button onClick={() => setIsSidebarCollapsed(false)} title="Expand sidebar" className={`absolute top-1/2 left-2 z-20 hidden md:block p-1 bg-white dark:bg-secondary-700 rounded-full shadow-lg border dark:border-secondary-600 transition-opacity ${isSidebarCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Icon name="chevron-right" className="w-5 h-5"/>
        </button>
        
        <main 
            className={`relative flex-1 p-4 sm:p-6 md:p-10 flex flex-col transition-all duration-300 perspective-1000 ${isFocusMode ? 'bg-background dark:bg-secondary-950' : ''}`}
            onClick={(e) => {
                if (isFocusMode && e.target === e.currentTarget) {
                    setPhraseSelection({ start: null, end: null });
                    setToolbarPosition(null);
                }
            }}
        >
            {activeNote ? (
            <>
                <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    disabled={isFocusMode}
                    className={`text-3xl font-bold bg-transparent focus:outline-none focus:bg-white dark:focus:bg-secondary-800 w-full rounded-md p-1 -m-1 transition-opacity ${isFocusMode ? 'text-secondary-800 dark:text-white opacity-70' : 'text-secondary-800 dark:text-white'}`}
                />
                {!isFocusMode && <button onClick={() => deleteNote(activeNote.id)} className="text-secondary-400 hover:text-red-500 p-2"><Icon name="trash" className="w-5 h-5"/></button>}
                </div>
                {isNoteContentLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Icon name="spinner" className="w-8 h-8 text-primary-500 animate-spin"/>
                    </div>
                ) : (
                    <div
                        ref={contentEditableRef}
                        onScroll={e => setRawScrollTop(e.currentTarget.scrollTop)}
                        onMouseUp={!isFocusMode ? handleNormalModeSelection : undefined}
                        onBlur={(e) => !isFocusMode && handleUpdateContent(e.currentTarget.innerText)}
                        contentEditable={!isFocusMode}
                        suppressContentEditableWarning
                        onAnimationEnd={handleAnimationEnd}
                        style={isFocusMode ? { fontSize: `${readingFontSize}px` } : {}}
                        className={`
                            flex-1 overflow-y-auto p-4 md:p-8 
                            prose dark:prose-invert max-w-none prose-p:text-secondary-600 dark:prose-p:text-secondary-300
                            transition-all duration-300 transform-style-3d
                            ${isFocusMode 
                                ? `prose-p:cursor-text reading-content-focus focus-paper-bg prose-p:text-text-main dark:prose-p:text-secondary-200 rounded-lg ${readingFontClass}`
                                : 'bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 focus:outline-none focus:ring-2 focus:ring-primary-500'
                            }
                            ${focusModeState === 'entering' ? 'animate-book-open-enter' : ''}
                            ${focusModeState === 'leaving' ? 'animate-book-open-leave' : ''}
                        `}
                    >
                      {isFocusMode ? (
                        <FocusModeContent
                            content={activeNote.content || ''}
                            wordsToHighlight={linkedWordsForNote.words}
                            onWordClick={handleWordClick}
                            phraseSelection={phraseSelection}
                        />
                      ) : (
                        <HighlightedContent content={activeNote.content || ''} wordsToHighlight={linkedWordsForNote.words} />
                      )}
                    </div>
                )}
                {isFocusMode && (
                    <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                        <AmbientSoundsControl />
                        <FontSettingsControl
                            fontFamily={readingFont}
                            onFontFamilyChange={setReadingFont}
                            fontSize={readingFontSize}
                            onFontSizeChange={setReadingFontSize}
                        />
                    </div>
                )}
                {linkedWordsForNote.rows.length > 0 && !isFocusMode && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-text-main dark:text-secondary-100 mb-2">Linked Words</h3>
                        <div className="bg-surface dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-3 flex flex-wrap gap-2">
                            {linkedWordsForNote.rows.map(({row, table}) => {
                                const wordText = row.cols[table.columns[0]?.id] || '...';
                                return (
                                <button key={row.id} onClick={() => { setWordDetailModalRow(row); setWordDetailModalTable(table); }} className="px-3 py-1 rounded-full text-sm font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900">
                                    {wordText}
                                </button>
                                )
                            })}
                        </div>
                    </div>
                )}
            </>
            ) : ( <div className="flex-1 flex items-center justify-center text-center text-secondary-500 dark:text-secondary-400"><p>Select a note from the menu, or create a new one.</p></div> )}
        </main>
      </div>

      <Modal isOpen={isExplainModalOpen} onClose={() => setIsExplainModalOpen(false)} title={`Explanation for "${focusSelection.text || selectedText}"`}>
        <div className="p-6"> {isExplainLoading ? ( <div className="flex items-center justify-center h-24"><Icon name="spinner" className="w-8 h-8 text-primary-500 animate-spin"/></div> ) : ( <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{explanation}</div> )} </div>
      </Modal>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title={`Add "${focusSelection.text || selectedText}"`} containerClassName="max-w-md w-full m-0 sm:m-4 fixed bottom-0 sm:bottom-auto sm:relative rounded-b-none sm:rounded-lg animate-slideInUp sm:animate-fade-scale-in">
          <div className="p-6">
            <div className="flex flex-col gap-4">
                <p className="text-sm text-text-subtle">Select destination:</p>
                <div className="flex items-center gap-2">
                  <select value={targetTableId} onChange={e => { setTargetTableId(e.target.value); setLastUsedTableId(e.target.value); }} className="flex-1 bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-2 text-sm"><option value="">Select Table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  <select value={targetColumnId} onChange={e => { setTargetColumnId(e.target.value); setLastUsedColumnId(e.target.value); }} disabled={!selectedTableForAdd} className="flex-1 bg-secondary-100 dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-md px-2 py-2 text-sm"><option value="">Select Column</option>{selectedTableForAdd?.columns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
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
            aiPrompts={wordDetailModalTable.aiPrompts}
            imageConfig={wordDetailModalTable.imageConfig}
            audioConfig={wordDetailModalTable.audioConfig}
            onClose={() => setWordDetailModalRow(null)}
            onSave={async (row) => upsertRow(wordDetailModalTable!.id, row)}
            onDelete={() => {}}
            onConfigureAI={() => {}}
          />
      )}
    </div>
  );
};

export default ReadingScreen;