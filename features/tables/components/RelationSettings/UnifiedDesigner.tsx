
import * as React from 'react';
import { Table, Relation, TypographyDesign, TextBox, StudyMode, VocabRow, Question, CardFaceDesign, QuestionCard, McqPayload, TrueFalsePayload, TypingPayload, ScramblePayload } from '../../../../types';
import Icon from '../../../../components/ui/Icon';
import { Button } from '../../../../components/ui/Button';
import { RelationLivePreview } from '../RelationLivePreview';
import UnifiedQuestionCard from '../../../study/components/v3/UnifiedQuestionCard';
import { useUIStore } from '../../../../stores/useUIStore';
import { UNIFIED_THEMES, UnifiedTheme, DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY } from '../../designConstants';
import Popover from '../../../../components/ui/Popover';
import { createQuestion, convertQuestionToCard } from '../../../../utils/studySessionGenerator';


// --- Helper Constants ---
const DEVICE_WIDTH = 375;
const DEVICE_HEIGHT = 812;

const MOCK_ROW: VocabRow = {
    id: 'mock-row',
    cols: {},
    stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: 'New' as any, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
};

interface UnifiedDesignerProps {
    table: Table;
    relation: Relation;
    onChange: (updater: (draft: Relation) => void) => void;
    forcedMode?: StudyMode | null;
}

// --- Helper Logic (Unified Theme Application) ---
const applyThemeToRelation = (relation: Relation, theme: UnifiedTheme): Relation => {
    const newRelation = JSON.parse(JSON.stringify(relation));
    if (!newRelation.design) return newRelation;

    const applyToFace = (face: CardFaceDesign) => {
        if (!face) return;

        // Update Background
        face.backgroundType = theme.background.type;
        face.backgroundValue = theme.background.value;
        if (theme.background.gradientAngle !== undefined) {
             face.gradientAngle = theme.background.gradientAngle;
        }

        // Update Typography for Data Columns
        if (face.typography) {
            Object.keys(face.typography).forEach(key => {
                face.typography[key].color = theme.typography.primary;
                face.typography[key].fontFamily = theme.typography.fontFamily;
            });
        }

        // Update Typography for Static Text Boxes
        if (face.textBoxes) {
            face.textBoxes.forEach(box => {
                box.typography.color = theme.typography.primary;
                box.typography.fontFamily = theme.typography.fontFamily;
            });
        }
    };

    applyToFace(newRelation.design.front);
    applyToFace(newRelation.design.back);

    return newRelation;
};

const SmartTextarea: React.FC<{
    value: string;
    onChange: (val: string) => void;
    typography: TypographyDesign;
    table?: Table;
    onBlur?: () => void;
}> = ({ value, onChange, typography, table, onBlur }) => {
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [cursorIndex, setCursorIndex] = React.useState<number | null>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const pos = e.target.selectionStart;
        onChange(val);

        // Detect '@' trigger for insertion menu
        if (val.slice(pos - 1, pos) === '@') {
            setCursorIndex(pos);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const insertText = (textToInsert: string) => {
        if (cursorIndex === null) return;
        // Remove the '@' character (located at cursorIndex - 1)
        const before = value.slice(0, cursorIndex - 1);
        const after = value.slice(cursorIndex);
        const newVal = before + textToInsert + after;
        onChange(newVal);
        setShowSuggestions(false);
        setTimeout(() => {
            textareaRef.current?.focus();
        }, 0);
    };

    return (
        <div className="relative w-full pointer-events-auto z-20">
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
                style={{ ...typography, width: '100%', resize: 'none', background: 'transparent', border: 'none', outline: 'none', minHeight: '1.5em' }}
                placeholder="Type text... use '@' for variables"
                className="focus:ring-0 p-0 m-0 whitespace-pre-wrap break-words"
            />
            {showSuggestions && table && (
                <div className="absolute z-50 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 shadow-xl rounded-lg p-1 w-72 max-h-64 overflow-y-auto top-full left-0 mt-1">
                    <p className="text-[10px] uppercase font-bold text-text-subtle px-2 py-1.5 bg-secondary-50 dark:bg-secondary-900/50 rounded mb-1">Insert Variable</p>
                    {table.columns.map(col => (
                        <div key={col.id} className="mb-2 border-b border-secondary-100 dark:border-secondary-700/50 last:border-0 pb-2 last:pb-0">
                            <p className="px-2 text-xs font-semibold text-text-subtle mb-1 flex items-center gap-1.5">
                                <Icon name="table-cells" className="w-3.5 h-3.5" />
                                {col.name}
                            </p>
                            
                            {/* Option 1: Data Only */}
                            <button
                                onMouseDown={(e) => { e.preventDefault(); insertText(`{${col.name}}`); }}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 group"
                                title={`Inserts data, e.g., "apple"`}
                            >
                                <span className="text-xs font-mono bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1 rounded min-w-[3rem] text-center">Data</span>
                                <span className="text-text-main dark:text-secondary-100 text-xs font-medium truncate">{`{${col.name}}`}</span>
                            </button>

                            {/* Option 2: Label Only */}
                            <button
                                onMouseDown={(e) => { e.preventDefault(); insertText(col.name); }}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 group"
                                title={`Inserts label, e.g., "Word"`}
                            >
                                <span className="text-xs font-mono bg-secondary-200 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 px-1 rounded min-w-[3rem] text-center">Label</span>
                                <span className="text-text-main dark:text-secondary-100 text-xs font-medium truncate">{col.name}</span>
                            </button>

                             {/* Option 3: Composite */}
                             <button
                                onMouseDown={(e) => { e.preventDefault(); insertText(`${col.name}: {${col.name}}`); }}
                                className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 flex items-center gap-2 group"
                                title={`Inserts both, e.g., "Word: apple"`}
                            >
                                <span className="text-xs font-mono bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 px-1 rounded min-w-[3rem] text-center">Both</span>
                                <span className="text-text-main dark:text-secondary-100 text-xs font-medium truncate">{`${col.name}: {${col.name}}`}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const UnifiedDesigner: React.FC<UnifiedDesignerProps> = ({ 
    table, 
    relation, 
    onChange, 
    forcedMode 
}) => {
    const { theme } = useUIStore();
    const [viewMode, setViewMode] = React.useState<'design' | 'preview'>('design');
    const [selectedElementId, setSelectedElementId] = React.useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = React.useState(1);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    
    // Design Lock State (Puzzle Master Architecture)
    const [isDesignLocked, setIsDesignLocked] = React.useState(false); 

    const [isThemesOpen, setIsThemesOpen] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    // Synchronized Mode Selector State
    // We initialize this with the first available mode, or Flashcards default.
    const [internalPreviewMode, setInternalPreviewMode] = React.useState<StudyMode>(() => {
        if (relation.interactionModes && relation.interactionModes.length > 0) {
            return relation.interactionModes[0];
        }
        // Legacy fallback
        if (relation.interactionType) {
            return relation.interactionType;
        }
        return StudyMode.Flashcards;
    });

    // Determine the active mode: Prop override takes precedence, otherwise local state
    // Ensure activeMode is never null/undefined
    const activeMode = forcedMode || internalPreviewMode || StudyMode.Flashcards;

    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const sampleRow = React.useMemo(() => {
        if (table.rows.length > 0) return table.rows[0];
        const mock = JSON.parse(JSON.stringify(MOCK_ROW));
        table.columns.forEach((col, i) => {
             mock.cols[col.id] = i % 2 === 0 ? "Sample Data" : "Example Content";
        });
        return mock;
    }, [table]);

    // --- Layout Strategies (Contextual Designer) ---
    // Generates a mock card object appropriate for the current activeMode
    const mockCard = React.useMemo<QuestionCard>(() => {
        // 1. Try generating a real question from the sample row to get correct answer text
        let q = createQuestion(sampleRow, relation, table, [sampleRow], activeMode);
        
        // 2. Patching for Simulator/Designer context where data might be scarce (e.g. no distractors)
        // We force a valid Question object structure for the visualizer
        if (!q) {
             q = {
                 rowId: sampleRow.id,
                 tableId: table.id,
                 relationId: relation.id,
                 type: activeMode,
                 questionText: "Question Text",
                 correctAnswer: "Correct Answer",
                 questionSourceColumnNames: [],
                 // Defaults for safety
                 options: ["Correct Answer", "Option B", "Option C", "Option D"],
                 scrambledParts: ["This", "is", "a", "sentence"],
                 contextBefore: "Context before",
                 contextAfter: "context after",
                 clozeText: "cloze",
             } as Question;
        } else {
            // Patch specific modes if generation was partial
            if (activeMode === StudyMode.MultipleChoice && (!q.options || q.options.length < 4)) {
                q.type = StudyMode.MultipleChoice;
                const baseOptions = q.options || [q.correctAnswer];
                const missing = 4 - baseOptions.length;
                for(let i=0; i<missing; i++) baseOptions.push(`Option ${String.fromCharCode(66+i)}`);
                q.options = baseOptions;
            }
            if (activeMode === StudyMode.Scrambled && (!q.scrambledParts || q.scrambledParts.length < 2)) {
                q.scrambledParts = ["Sample", "Scrambled", "Sentence", "Parts"];
                q.correctAnswer = "Sample Scrambled Sentence Parts";
            }
             if (activeMode === StudyMode.TrueFalse) {
                // Ensure T/F has necessary props for rendering
                if (!q.proposedAnswer) q.proposedAnswer = "Proposed Answer";
            }
        }

        return convertQuestionToCard(q);
    }, [sampleRow, relation, table, activeMode]);


    React.useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            
            for (const entry of entries) {
                const availableHeight = entry.contentRect.height; 
                const availableWidth = entry.contentRect.width;

                if (availableHeight <= 0 || availableWidth <= 0) return;
                
                // Auto-scaling: Adjust buffer specifically for mobile to maximize screen real estate
                const buffer = isMobile ? 0.85 : 0.90; 
                
                const scaleH = (availableHeight / DEVICE_HEIGHT) * buffer;
                const scaleW = (availableWidth / DEVICE_WIDTH) * buffer;
                let newScale = Math.min(scaleH, scaleW);
                newScale = Math.min(newScale, 1.2); 
                
                if (isFullScreen) {
                     const windowScaleH = (window.innerHeight / DEVICE_HEIGHT) * buffer;
                     const windowScaleW = (window.innerWidth / DEVICE_WIDTH) * buffer;
                     newScale = Math.min(windowScaleH, windowScaleW); 
                }
                setScale(newScale);
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [isFullScreen, viewMode, isMobile]);

    // --- Handlers ---

    const handleApplyTheme = (unifiedTheme: UnifiedTheme) => {
         const updatedRelation = applyThemeToRelation(relation, unifiedTheme);
         // Fix: Correctly use the draft mutator pattern required by the parent component
         onChange((draft) => {
             if (updatedRelation.design) {
                 draft.design = updatedRelation.design;
             }
         });
         setIsDesignLocked(true); 
         if (!isMobile) setIsThemesOpen(false);
    };
    
    const handleInsertElement = (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => {
        onChange(draft => {
             if (!draft.design) return;
             const faceDesign = draft.design[face];
             if (!faceDesign.elementOrder) faceDesign.elementOrder = [];
             
             // --- LOGIC TO INHERIT THEME ---
             let inheritedTypo = { ...defaultTypo };
             let sourceStyle: TypographyDesign | undefined;
             
             // Check typography map for existing styles
             const existingTypoKeys = Object.keys(faceDesign.typography || {});
             if (existingTypoKeys.length > 0) {
                 sourceStyle = faceDesign.typography[existingTypoKeys[0]];
             }
             
             // If not found in map, check text boxes
             if (!sourceStyle && faceDesign.textBoxes && faceDesign.textBoxes.length > 0) {
                 sourceStyle = faceDesign.textBoxes[0].typography;
             }

             if (sourceStyle) {
                 inheritedTypo.color = sourceStyle.color;
                 inheritedTypo.fontFamily = sourceStyle.fontFamily;
             }
             // ------------------------------
             
             let newId = '';
             if (type === 'data' && colId) newId = colId;
             else if (type === 'label' && colId) newId = `label-${colId}`;
             else if (type === 'text') {
                 newId = `txt-${Date.now()}`;
                 faceDesign.textBoxes = faceDesign.textBoxes || [];
                 faceDesign.textBoxes.push({ id: newId, text: 'New Text', typography: { ...inheritedTypo, fontWeight: 'normal' } });
             } else if (type === 'divider') {
                 newId = `txt-divider-${Date.now()}`;
                 faceDesign.textBoxes = faceDesign.textBoxes || [];
                 faceDesign.textBoxes.push({ id: newId, text: '---', typography: { ...inheritedTypo } });
             } else if (type === 'inline_composite' && colId) {
                 const col = table.columns.find(c => c.id === colId);
                 if (col) {
                     newId = `txt-comp-${Date.now()}`;
                     faceDesign.textBoxes = faceDesign.textBoxes || [];
                     faceDesign.textBoxes.push({ id: newId, text: `${col.name}: {${col.name}}`, typography: { ...inheritedTypo, textAlign: 'left' } });
                 }
             }

             if (newId) {
                 const exists = faceDesign.elementOrder.includes(newId);
                 
                 if (!exists) {
                     // Insert at specific index
                     faceDesign.elementOrder.splice(index, 0, newId);
                 }

                 // Initialize typography if needed (for data columns & labels which use the map)
                 if (type !== 'text' && type !== 'divider' && type !== 'inline_composite' && newId && !faceDesign.typography[newId]) {
                     if (type === 'label') {
                         faceDesign.typography[newId] = { 
                             ...inheritedTypo, 
                             fontSize: '0.75rem', 
                             opacity: 0.7, 
                             fontWeight: 'bold' 
                         };
                     } else {
                         faceDesign.typography[newId] = { ...inheritedTypo };
                     }
                 }
             }
        });
    };

    const handleDeleteElement = (face: 'front' | 'back', id: string) => {
        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            if (faceDesign.elementOrder) {
                faceDesign.elementOrder = faceDesign.elementOrder.filter((eid: string) => eid !== id);
            }
        });
        if (selectedElementId === id) setSelectedElementId(null);
    };
    
    const handleUpdateElement = (face: 'front' | 'back', id: string, updates: any) => {
        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            const textBox = faceDesign.textBoxes?.find((t: TextBox) => t.id === id);
            if (textBox) {
                if (updates.typography) textBox.typography = { ...textBox.typography, ...updates.typography };
                if (updates.text !== undefined) textBox.text = updates.text;
            } else {
                 if (!faceDesign.typography[id]) faceDesign.typography[id] = { ...defaultTypo };
                 if (updates.typography) faceDesign.typography[id] = { ...faceDesign.typography[id], ...updates.typography };
            }
        });
    }
    
    const handleChangeElementType = (face: 'front' | 'back', id: string, newType: 'data' | 'label') => {
        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            if (!faceDesign.elementOrder) return;
    
            let oldId = id;
            let colId = '';
            
            if (id.startsWith('label-')) {
                colId = id.replace('label-', '');
            } else {
                colId = id;
            }
            
            let newId = '';
            if (newType === 'data') newId = colId;
            if (newType === 'label') newId = `label-${colId}`;
            
            const idx = faceDesign.elementOrder.indexOf(oldId);
            if (idx !== -1) {
                 faceDesign.elementOrder[idx] = newId;
                 
                 // If switching to data, ensure typography exists
                 if (newType === 'data' && !faceDesign.typography[newId]) {
                      faceDesign.typography[newId] = { ...defaultTypo };
                 }
                 // If switching to label, we might want specific label typography or inherit
                 if (newType === 'label' && !faceDesign.typography[newId]) {
                      faceDesign.typography[newId] = { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
                 }
            }
        });
        
        let colId = id.startsWith('label-') ? id.replace('label-', '') : id;
        let nextId = newType === 'label' ? `label-${colId}` : colId;
        setSelectedElementId(nextId);
    };

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setInternalPreviewMode(e.target.value as StudyMode);
    };

    const ThemeCard: React.FC<{ theme: UnifiedTheme }> = ({ theme }) => (
        <button onClick={() => handleApplyTheme(theme)} className="flex flex-col items-center gap-2 group/theme w-24 flex-shrink-0">
            <div className="w-full h-16 rounded-xl shadow-sm border border-black/10 group-hover/theme:scale-105 transition-transform relative overflow-hidden" style={{ background: theme.background.value }}>
                 <div className="absolute inset-0 flex items-center justify-center"><span style={{ color: theme.typography.primary }} className="text-xs font-bold">Aa</span></div>
            </div>
            <span className="text-xs text-text-subtle text-center truncate w-full">{theme.name}</span>
        </button>
    );
    
    const availableModes = [
        { mode: StudyMode.Flashcards, label: 'Flashcard' },
        { mode: StudyMode.MultipleChoice, label: 'Multiple Choice' },
        { mode: StudyMode.TrueFalse, label: 'True/False' },
        { mode: StudyMode.Typing, label: 'Typing' },
        { mode: StudyMode.Scrambled, label: 'Scramble' }
    ];

    if (!availableModes.some(m => m.mode === activeMode)) {
        availableModes.push({ mode: activeMode, label: activeMode });
    }

    const handleContainerClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isDesignLocked) {
          setSelectedElementId(null);
      }
    }
    
    const design = relation.design?.front;
    const backDesign = relation.design?.back;

    return (
        <div className="flex flex-col h-[100dvh] md:h-full w-full bg-secondary-100 dark:bg-black/40 relative overflow-hidden">
            {!isFullScreen && (
                <div className="flex justify-between items-center p-2 border-secondary-200 dark:border-secondary-700 bg-surface dark:bg-secondary-800 z-20 relative shadow-sm order-last md:order-first border-t md:border-t-0 md:border-b">
                   <div className="flex items-center gap-3">
                       <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5 gap-0.5">
                           <button onClick={() => setViewMode('design')} className={`px-3 py-2 md:py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'design' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}>
                               <Icon name="pencil" className="w-4 h-4 md:hidden" />
                               <span className="hidden md:inline">Designer</span>
                           </button>
                           <button onClick={() => setViewMode('preview')} className={`px-3 py-2 md:py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}>
                               <Icon name="play" className="w-4 h-4 md:hidden" />
                               <span className="hidden md:inline">Simulator</span>
                           </button>
                       </div>
                       
                       <div className="relative">
                            <select
                                value={activeMode}
                                onChange={handleModeChange}
                                className="appearance-none bg-secondary-100 dark:bg-secondary-700 border border-transparent hover:border-secondary-300 dark:hover:border-secondary-600 text-xs font-bold text-text-main dark:text-secondary-200 rounded-md py-1.5 pl-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer"
                            >
                                {availableModes.map(opt => (
                                    <option key={opt.mode} value={opt.mode}>{opt.label}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-subtle">
                                <Icon name="chevron-down" className="w-3 h-3" />
                            </div>
                       </div>
                   </div>

                   {viewMode === 'design' && (
                       <div className="flex gap-2 items-center">
                           <button 
                                onClick={() => setIsDesignLocked(!isDesignLocked)} 
                                className={`flex items-center gap-1.5 p-2 md:px-3 md:py-1.5 rounded-md text-xs font-bold border transition-all ${
                                    isDesignLocked 
                                        ? 'bg-white dark:bg-secondary-600 text-primary-600 border-primary-200 dark:border-primary-800 shadow-sm' 
                                        : 'bg-secondary-100 dark:bg-secondary-700 text-text-subtle border-transparent hover:bg-secondary-200'
                                }`}
                                title={isDesignLocked ? "Design Locked (Preview Mode)" : "Design Unlocked (Edit Mode)"}
                            >
                               <Icon name={isDesignLocked ? "lock-closed" : "lock-open"} className="w-3.5 h-3.5" />
                               <span className="hidden md:inline">{isDesignLocked ? 'Locked' : 'Unlocked'}</span>
                           </button>

                            <Popover isOpen={isThemesOpen} setIsOpen={setIsThemesOpen} trigger={
                                <Button variant="secondary" size="sm" className="p-2 md:h-8 md:px-2">
                                    <Icon name="palette" className="w-4 h-4 sm:mr-1 text-primary-500"/> <span className="hidden md:inline">Themes</span>
                                </Button>
                            } contentClassName="w-80 right-0">
                                <div className="p-3">
                                    <p className="text-xs font-bold text-text-subtle uppercase mb-3">Themes</p>
                                    <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">{UNIFIED_THEMES.map(t => <ThemeCard key={t.id} theme={t} />)}</div>
                                </div>
                            </Popover>
                       </div>
                   )}
                </div>
            )}

            <div ref={containerRef} className="flex-1 flex relative transition-all duration-500 overflow-hidden items-center justify-center" onClick={() => setSelectedElementId(null)}>
                 {isFullScreen && <button onClick={() => setIsFullScreen(false)} className="absolute top-6 right-6 z-[60] p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md shadow-lg"><Icon name="x" className="w-6 h-6" /></button>}

                 {viewMode === 'design' ? (
                    <div 
                        style={isMobile ? { 
                            width: DEVICE_WIDTH, 
                            height: DEVICE_HEIGHT, 
                            transform: `scale(${scale})`, 
                            transformOrigin: 'center center',
                            borderRadius: 0,
                            border: 'none',
                            boxShadow: 'none'
                        } : { 
                            width: DEVICE_WIDTH, 
                            height: DEVICE_HEIGHT, 
                            transform: `scale(${scale})` 
                        }} 
                        className={`relative bg-surface dark:bg-secondary-900 overflow-hidden shrink-0 transition-all duration-300 ease-out ${isMobile ? '' : 'shadow-2xl border border-secondary-200 dark:border-secondary-700 rounded-[40px]'}`} 
                        onClick={handleContainerClick}
                    >
                        <div className="absolute inset-0 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col bg-white dark:bg-secondary-900"> 
                            <div className="relative z-10 w-full flex flex-col h-full min-h-[400px] justify-center">
                                 <UnifiedQuestionCard 
                                    card={mockCard}
                                    onAnswer={() => {}}
                                    design={design}
                                    backDesign={backDesign}
                                    row={sampleRow}
                                    table={table}
                                    isDesignMode={!isDesignLocked}
                                    selectedElementId={selectedElementId}
                                    onSelectElement={setSelectedElementId}
                                    onInsertElement={handleInsertElement as any}
                                    onUpdateElement={handleUpdateElement as any}
                                    onDeleteElement={handleDeleteElement as any}
                                    onChangeElementType={handleChangeElementType as any}
                                 />
                            </div>
                        </div>
                    </div>
                 ) : (
                    <div className="w-full h-full bg-surface dark:bg-secondary-800 overflow-hidden">
                        <RelationLivePreview table={table} relation={relation} forcedMode={activeMode} />
                        {!isFullScreen && <button onClick={() => setIsFullScreen(true)} className="absolute bottom-4 right-4 z-30 p-2 bg-secondary-800/80 hover:bg-secondary-700 text-white rounded-full shadow-lg backdrop-blur-sm hover:scale-110"><Icon name="arrows-pointing-out" className="w-5 h-5" /></button>}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default UnifiedDesigner;
