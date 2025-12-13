
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
import { useLocalStorage } from '../../../hooks/useLocalStorage';
import { useDebounce } from '../../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabaseClient';
import { explainText } from '../../../services/geminiService';
import { extractContextSnippet, CONTEXT_WORD_COUNT } from '../../../utils/textUtils';
import WordDetailModal from '../../tables/WordDetailModal';
import ClozeCreationModal from './ClozeCreationModal';

// --- Sub-components for Reading Content ---

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
      className="absolute z-50 bg-surface dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-lg flex items-center -translate-x-1/2 transition-opacity animate-fade-scale-in"
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
    { id: 'rain', name: 'Rain', icon: 'cloud-rain', url: '/audio/rain.mp3' },
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
    { name: 'Lora', family: 'font-serif' },
    { name: 'Merriweather', family: 'font-merriweather' },
    { name: 'Literata', family: 'font-literata' },
    { name: 'Inter', family: 'font-sans' },
    { name: 'Nunito Sans', family: 'font-nunitosans' },
];

const FONT_SIZES = [0.875, 1, 1.125, 1.25, 1.5];

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
                    <span className="text-sm font-semibold">Text Size</span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSizeChange(false)} disabled={fontSize === FONT_SIZES[0]}>-</Button>
                        <span className="w-12 text-center text-xs">{(fontSize * 16).toFixed(0)}px</span>
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


// --- Main Component ---

interface ReadingContentProps {
    noteId: string | null;
    onToggleSidebar: () => void;
    onBack: () => void;
}

const ReadingContent: React.FC<ReadingContentProps> = ({ noteId, onToggleSidebar, onBack }) => {
    // Store Access
    const { updateNote, deleteNote, handleSaveToJournal, notes } = useNoteStore();
    const { tables, upsertRow } = useTableStore();
    const { setIsApiKeyModalOpen, showToast } = useUIStore();
    const { addContextLink, contextLinks } = useContextLinkStore();
    const { readingScreenTarget, setReadingScreenTarget } = useSessionStore();
    const { addCounter, toggleTracking, counters } = useCounterStore();

    // Local State
    const [activeNote, setActiveNote] = React.useState<Note | null>(null);
    const [localTitle, setLocalTitle] = React.useState('');
    const [isFocusMode, setIsFocusMode] = React.useState(false);
    const [focusModeState, setFocusModeState] = React.useState<'off' | 'entering' | 'on' | 'leaving'>('off');
    
    // Tools State
    const [selectedText, setSelectedText] = React.useState<string | null>(null);
    const [popupPosition, setPopupPosition] = React.useState<{ top: number; left: number } | null>(null);
    const [focusSelection, setFocusSelection] = React.useState<{ text: string; range: Range | null; startIndex?: number }>({ text: '', range: null });
    const [isPhraseMode, setIsPhraseMode] = React.useState(false);
    const [phraseSelection, setPhraseSelection] = React.useState<{ start: number | null, end: number | null }>({ start: null, end: null });
    const [toolbarPosition, setToolbarPosition] = React.useState<{ top: number; left: number } | null>(null);
    const [toolbarPriority, setToolbarPriority] = React.useState<'explain' | 'add' | 'default'>('default');

    // Modals State
    const [isExplainModalOpen, setIsExplainModalOpen] = React.useState(false);
    const [explanation, setExplanation] = React.useState('');
    const [isExplainLoading, setIsExplainLoading] = React.useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isClozeModalOpen, setIsClozeModalOpen] = React.useState(false);
    const [wordDetailModalRow, setWordDetailModalRow] = React.useState<VocabRow | null>(null);
    const [wordDetailModalTable, setWordDetailModalTable] = React.useState<Table | null>(null);
    const [targetTableId, setTargetTableId] = React.useState('');
    const [targetColumnId, setTargetColumnId] = React.useState('');
    const [addStatus, setAddStatus] = React.useState<'idle' | 'adding' | 'added'>('idle');

    // Preferences Persistence
    const [readingFont, setReadingFont] = useLocalStorage('vmind-reading-font', 'font-serif');
    const [readingFontSize, setReadingFontSize] = useLocalStorage('vmind-reading-font-size-rem', 1.125);
    const [scrollPositions, setScrollPositions] = useLocalStorage<Record<string, number>>('vmind-reading-progress', {});
    const [rawScrollTop, setRawScrollTop] = React.useState(0);
    const debouncedScrollTop = useDebounce(rawScrollTop, 500);
    
    const contentEditableRef = React.useRef<HTMLDivElement>(null);
    const positionerRef = React.useRef<HTMLDivElement>(null);
    
    // --- Data Fetching ---
    
    const fetchNoteContent = async () => {
        if (!noteId) return null;
        const { data, error } = await supabase.from('notes').select('content').eq('id', noteId).single();
        if (error) throw new Error(error.message);
        return data.content;
    };

    const noteFromStore = React.useMemo(() => notes.find(n => n.id === noteId), [notes, noteId]);

    const { data: noteContent, isLoading: isNoteContentLoading } = useQuery({
        queryKey: ['noteContent', noteId],
        queryFn: fetchNoteContent,
        enabled: !!noteId && !!noteFromStore && noteFromStore.content === undefined,
    });

    React.useEffect(() => {
        if (noteId && noteFromStore) {
            setActiveNote(noteFromStore);
            setLocalTitle(noteFromStore.title);
        } else {
            setActiveNote(null);
            setLocalTitle('');
        }
    }, [noteId, noteFromStore]);

    React.useEffect(() => {
        if (noteContent !== undefined && activeNote && activeNote.content === undefined) {
             const updated = { ...activeNote, content: noteContent };
             updateNote(updated);
             setActiveNote(updated);
        }
    }, [noteContent, activeNote, updateNote]);

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

    // --- Scroll & Selection Restoration ---
    React.useEffect(() => {
        if (activeNote?.id && contentEditableRef.current && !isNoteContentLoading) {
          const savedPosition = scrollPositions[activeNote.id];
          if (typeof savedPosition === 'number') {
              contentEditableRef.current.scrollTo({ top: savedPosition, behavior: 'auto' });
          } else {
              contentEditableRef.current.scrollTo({ top: 0, behavior: 'auto' });
          }
        }
    }, [activeNote?.id, isNoteContentLoading]);

    React.useEffect(() => {
        if (activeNote?.id) {
            setScrollPositions(prev => ({ ...prev, [activeNote.id]: debouncedScrollTop }));
        }
    }, [debouncedScrollTop, activeNote?.id, setScrollPositions]);

    // Deep Linking Highlight Logic
    React.useEffect(() => {
        if (
            readingScreenTarget &&
            readingScreenTarget.noteId === activeNote?.id &&
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
        }
    }, [readingScreenTarget, setReadingScreenTarget, isNoteContentLoading, activeNote]);

    // --- Actions ---

    const handleTitleBlur = () => {
        if (!activeNote || localTitle === activeNote.title) return;
        updateNote({ ...activeNote, title: localTitle.trim() });
    };

    const handleUpdateContent = (newContent: string) => { 
        if (activeNote && newContent !== activeNote.content) { 
            updateNote({ ...activeNote, content: newContent }); 
        } 
    };

    const toggleFocusMode = () => {
        if (focusModeState === 'off') {
            setIsFocusMode(true);
            setFocusModeState('entering');
        } else if (focusModeState === 'on') {
            setFocusModeState('leaving');
        }
    };
    
    const handleAnimationEnd = () => {
        if (focusModeState === 'entering') setFocusModeState('on');
        else if (focusModeState === 'leaving') {
            setFocusModeState('off');
            setIsFocusMode(false);
            setToolbarPosition(null);
            setPhraseSelection({ start: null, end: null });
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

    // Selection Handling
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
        if (!activeNote?.content) return;
        const wordsAndSpaces = activeNote.content.split(/(\s+)/);

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
            const top = rect.top - positionerRect.top - 45;
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
    
    if (!activeNote && isNoteContentLoading) {
        return <div className="flex items-center justify-center h-full"><Icon name="spinner" className="w-8 h-8 text-primary-500 animate-spin"/></div>;
    }

    if (!activeNote) return null;

    const counter = counters.find(c => c.targetId === activeNote.id);
    const isTracking = counter?.isActive ?? false;
    const readingFontClass = FONT_FACES.find(f => f.family === readingFont)?.family || 'font-serif';
    const selectedTableForAdd = tables.find(t => t.id === targetTableId);

    return (
        <div className={`flex flex-col h-full ${isFocusMode ? 'fixed inset-0 z-50 bg-background dark:bg-secondary-950' : ''}`}>
             <header className={`px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex justify-between items-center flex-shrink-0 bg-background/95 dark:bg-secondary-900/95 backdrop-blur-md sticky top-0 z-20 transition-opacity duration-300 ${focusModeState === 'entering' || focusModeState === 'leaving' ? 'opacity-0' : 'opacity-100'}`}>
                {/* Breadcrumbs Navigation */}
                <div className="flex items-center gap-2 text-lg font-medium overflow-hidden">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1 text-text-subtle hover:text-text-main transition-colors flex-shrink-0"
                    >
                        <Icon name="reading-person" className="w-5 h-5" variant="filled" />
                        <span className="hidden sm:inline">Reading Space</span>
                    </button>

                    <Icon name="chevron-right" className="w-4 h-4 text-text-subtle flex-shrink-0" />

                    <div className="flex items-center gap-2 text-text-main dark:text-secondary-100 font-bold truncate min-w-0">
                        <Icon name="file-text" className="w-5 h-5 text-info-500 flex-shrink-0" variant="filled" />
                        <input
                            type="text"
                            value={localTitle}
                            onChange={(e) => setLocalTitle(e.target.value)}
                            onBlur={handleTitleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="bg-transparent focus:outline-none focus:bg-secondary-100 dark:focus:bg-secondary-700 rounded px-1 -ml-1 w-full truncate"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                        onClick={handleTrackingToggle}
                        className={`p-2 rounded-full transition-colors ${isTracking ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700'}`}
                        title={isTracking ? "Tracking Active" : "Track Activity"}
                    >
                        <Icon name="chart-bar" variant={isTracking ? 'filled' : 'outline'} className="w-5 h-5" />
                    </button>
                    <button onClick={toggleFocusMode} title="Focus Mode" className="p-2 rounded-full transition-colors text-secondary-500 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700">
                        <Icon name="arrows-pointing-out" className="w-5 h-5"/>
                    </button>
                </div>
            </header>

            <div ref={positionerRef} className="flex-1 overflow-hidden relative">
                {(focusModeState === 'entering' || focusModeState === 'leaving') && <div className="absolute inset-0 bg-black/10 dark:bg-black/30 z-10"/>}
                
                {/* Floating Toolbars */}
                {isFocusMode && toolbarPosition && focusSelection.text && (
                    <FloatingToolbar
                        position={toolbarPosition}
                        onAdd={() => setIsAddModalOpen(true)}
                        onExplain={handleExplain}
                        onJournal={handleSaveJournalClick}
                        onCloze={() => { setIsClozeModalOpen(true); setToolbarPosition(null); }}
                        priority={toolbarPriority}
                    />
                )}
                {popupPosition && selectedText && (
                     <div ref={positionerRef}> {/* Wrapper to ensure correct ref context if needed, though position is fixed */}
                        <FloatingToolbar
                            position={popupPosition}
                            onAdd={() => setIsAddModalOpen(true)}
                            onExplain={handleExplain}
                            onJournal={handleSaveJournalClick}
                            onCloze={() => { setIsClozeModalOpen(true); setPopupPosition(null); }}
                            priority={toolbarPriority}
                        />
                    </div>
                )}
                
                {/* Focus Mode Controls */}
                {isFocusMode && (
                    <div className="absolute top-4 right-4 z-50 flex gap-2">
                         <button
                            onClick={() => { setIsPhraseMode(!isPhraseMode); setPhraseSelection({ start: null, end: null }); setToolbarPosition(null); }}
                            title={isPhraseMode ? "Disable Phrase Select" : "Enable Phrase Select"}
                            className={`p-2 rounded-full transition-colors backdrop-blur-md shadow-sm ${isPhraseMode ? 'bg-primary-100 text-primary-600' : 'bg-white/80 dark:bg-black/40 text-secondary-600 dark:text-secondary-300'}`}
                        >
                            <Icon name="text-wrap" className="w-5 h-5"/>
                        </button>
                        <button onClick={toggleFocusMode} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md shadow-lg">
                             <Icon name="x" className="w-5 h-5" />
                        </button>
                    </div>
                )}

                <div
                    ref={contentEditableRef}
                    onScroll={e => setRawScrollTop(e.currentTarget.scrollTop)}
                    onMouseUp={!isFocusMode ? handleNormalModeSelection : undefined}
                    onBlur={(e) => !isFocusMode && handleUpdateContent(e.currentTarget.innerText)}
                    contentEditable={!isFocusMode}
                    suppressContentEditableWarning
                    onAnimationEnd={handleAnimationEnd}
                    style={isFocusMode ? { fontSize: `${readingFontSize}rem` } : {}}
                    className={`
                        h-full overflow-y-auto p-4 md:p-8 
                        prose dark:prose-invert max-w-none prose-p:text-secondary-600 dark:prose-p:text-secondary-300
                        transition-all duration-300 transform-style-3d
                        ${isFocusMode 
                            ? `prose-p:cursor-text reading-content-focus focus-paper-bg prose-p:text-text-main dark:prose-p:text-secondary-200 ${readingFontClass} px-8 md:px-20 lg:px-40 py-12`
                            : 'bg-white dark:bg-secondary-800 focus:outline-none'
                        }
                        ${focusModeState === 'entering' ? 'animate-book-open-enter' : ''}
                        ${focusModeState === 'leaving' ? 'animate-book-open-leave' : ''}
                    `}
                    onClick={(e) => {
                        if (isFocusMode && e.target === e.currentTarget) {
                            setPhraseSelection({ start: null, end: null });
                            setToolbarPosition(null);
                        }
                    }}
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

                {/* Footer Controls in Focus Mode */}
                {isFocusMode && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full shadow-lg">
                        <AmbientSoundsControl />
                        <div className="w-px h-4 bg-white/20"></div>
                        <FontSettingsControl
                            fontFamily={readingFont}
                            onFontFamilyChange={setReadingFont}
                            fontSize={readingFontSize}
                            onFontSizeChange={setReadingFontSize}
                        />
                    </div>
                )}
            </div>
            
            {/* Linked Words Footer (Standard Mode) */}
            {!isFocusMode && linkedWordsForNote.rows.length > 0 && (
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
        </div>
    );
};

export default ReadingContent;
