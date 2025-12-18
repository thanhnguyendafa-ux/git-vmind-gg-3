
import * as React from 'react';
import { Table, Relation, StudyMode, VocabRow, Question, CardFaceDesign, QuestionCard, TypographyDesign } from '../../../../types';
import Icon from '../../../../components/ui/Icon';
import { Button } from '../../../../components/ui/Button';
import { RelationLivePreview } from '../RelationLivePreview';
import QuestionCardDesigner from '../../../../features/study/components/v3/QuestionCardDesigner';
import { useUIStore } from '../../../../stores/useUIStore';
import { UNIFIED_THEMES, UnifiedTheme, DEFAULT_TYPOGRAPHY, DARK_MODE_DEFAULT_TYPOGRAPHY, applyThemeToRelation } from '../../designConstants';
import Popover from '../../../../components/ui/Popover';
import { createQuestion, convertQuestionToCard } from '../../../../utils/studySessionGenerator';

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

const ThemeDock: React.FC<{
    currentThemeId: string | null;
    onApply: (theme: UnifiedTheme) => void;
}> = ({ currentThemeId, onApply }) => {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[90%] bg-white/80 dark:bg-black/60 backdrop-blur-md rounded-2xl p-2 shadow-xl border border-white/40 dark:border-white/10 flex gap-3 overflow-x-auto custom-scrollbar pointer-events-auto">
            {UNIFIED_THEMES.map((t) => {
                const isActive = currentThemeId === t.id;
                return (
                    <button
                        key={t.id}
                        onClick={() => onApply(t)}
                        className={`
                            relative w-8 h-8 rounded-full border shadow-sm flex-shrink-0 transition-all duration-200 
                            ${isActive ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-black scale-110 border-transparent' : 'border-black/10 dark:border-white/10 hover:scale-110'}
                        `}
                        style={{ background: t.previewColor }}
                        title={t.name}
                    />
                );
            })}
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
    const [isFocusMode, setIsFocusMode] = React.useState(false);
    const [isDesignLocked, setIsDesignLocked] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);

    const [internalPreviewMode, setInternalPreviewMode] = React.useState<StudyMode>(() => {
        if (relation.interactionModes && relation.interactionModes.length > 0) return relation.interactionModes[0];
        if (relation.interactionType) return relation.interactionType;
        return StudyMode.Flashcards;
    });

    const activeMode = forcedMode || internalPreviewMode || StudyMode.Flashcards;
    const defaultTypo = theme === 'dark' ? DARK_MODE_DEFAULT_TYPOGRAPHY : DEFAULT_TYPOGRAPHY;

    React.useEffect(() => {
        const handleResize = () => { setIsMobile(window.innerWidth < 768); };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isClozeMode = activeMode === StudyMode.ClozeTyping || activeMode === StudyMode.ClozeMCQ;

    const sampleRow = React.useMemo(() => {
        if (table.rows.length > 0) return table.rows[0];
        const mock = JSON.parse(JSON.stringify(MOCK_ROW));
        table.columns.forEach((col, i) => {
            mock.cols[col.id] = i % 2 === 0 ? "Sample Data" : "Example Content";
        });

        // Ensure cloze source has brackets for preview if needed
        if (isClozeMode && relation.questionColumnIds.length > 0) {
            const qCol = relation.questionColumnIds[0];
            mock.cols[qCol] = "The [C++] language is compiled.";
        }

        return mock;
    }, [table, isClozeMode, relation]);

    const mockCard = React.useMemo<QuestionCard>(() => {
        let q = createQuestion(sampleRow, relation, table, [sampleRow], activeMode);
        if (!q) {
            q = {
                rowId: sampleRow.id,
                tableId: table.id,
                relationId: relation.id,
                type: activeMode,
                questionText: "Question Text",
                correctAnswer: "Correct Answer",
                questionSourceColumnNames: [],
                options: ["Correct Answer", "Option B", "Option C", "Option D"],
                scrambledParts: ["This", "is", "a", "sentence"],
                contextBefore: "Context before",
                contextAfter: "context after",
                clozeText: "[...]",
                clozeHint: "{word}",
            } as Question;
        } else {
            if (activeMode === StudyMode.MultipleChoice && (!q.options || q.options.length < 4)) {
                q.type = StudyMode.MultipleChoice;
                const baseOptions = q.options || [q.correctAnswer];
                const missing = 4 - baseOptions.length;
                for (let i = 0; i < missing; i++) baseOptions.push(`Option ${String.fromCharCode(66 + i)}`);
                q.options = baseOptions;
            }
            if (activeMode === StudyMode.Scrambled && (!q.scrambledParts || q.scrambledParts.length < 2)) {
                q.scrambledParts = ["Sample", "Scrambled", "Sentence", "Parts"];
                q.correctAnswer = "Sample Scrambled Sentence Parts";
            }
            if (activeMode === StudyMode.TrueFalse && !q.proposedAnswer) {
                q.proposedAnswer = "Proposed Answer";
            }
            // For Cloze in Design mode, ensure we show a representative preview if real generation failed
            if (isClozeMode && q.questionText === "Image Question") {
                q.questionText = "The [...] language is compiled.";
                q.correctAnswer = "C++";
                q.contextBefore = "The ";
                q.contextAfter = " language is compiled.";
                q.clozeText = "[...]";
            }
        }
        return convertQuestionToCard(q);
    }, [sampleRow, relation, table, activeMode, isClozeMode]);


    React.useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (!isMobile) { setScale(1); return; }
            for (const entry of entries) {
                const availableWidth = entry.contentRect.width;
                if (availableWidth <= 0) return;
                const buffer = 0.92;
                const scaleW = (availableWidth / DEVICE_WIDTH) * buffer;
                setScale(scaleW);
            }
        });
        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [isMobile]);

    const handleApplyTheme = (unifiedTheme: UnifiedTheme) => {
        const updatedRelation = applyThemeToRelation(relation, unifiedTheme);
        onChange((draft) => { if (updatedRelation.design) draft.design = updatedRelation.design; });
        setIsDesignLocked(true);
    };

    // Calculate active theme ID based on background value
    const currentThemeId = React.useMemo(() => {
        const bgVal = relation.design?.front.backgroundValue;
        if (!bgVal) return null;
        // Find matching theme
        const match = UNIFIED_THEMES.find(t => t.background.value === bgVal);
        return match ? match.id : null;
    }, [relation.design]);

    // Handlers
    const handleInsertElement = (face: 'front' | 'back', index: number, type: 'data' | 'label' | 'text' | 'divider' | 'inline_composite', colId?: string) => {
        const timestamp = Date.now();
        let newId = '';

        if (type === 'data' && colId) newId = colId;
        else if (type === 'label' && colId) newId = `label-${colId}`;
        else if (type === 'text') newId = `txt-${timestamp}`;
        else if (type === 'divider') newId = `txt-divider-${timestamp}`;
        else if (type === 'inline_composite' && colId) newId = `txt-comp-${timestamp}`;

        if (newId) {
            setSelectedElementId(newId);
        }

        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            if (!faceDesign.elementOrder) faceDesign.elementOrder = [];
            let inheritedTypo = { ...defaultTypo };
            let sourceStyle: TypographyDesign | undefined;
            const existingTypoKeys = Object.keys(faceDesign.typography || {});
            if (existingTypoKeys.length > 0) sourceStyle = faceDesign.typography[existingTypoKeys[0]];
            if (!sourceStyle && faceDesign.textBoxes && faceDesign.textBoxes.length > 0) sourceStyle = faceDesign.textBoxes[0].typography;
            if (sourceStyle) { inheritedTypo.color = sourceStyle.color; inheritedTypo.fontFamily = sourceStyle.fontFamily; }

            // The ID is already calculated above, just use it to populate data
            if (type === 'text') {
                faceDesign.textBoxes = faceDesign.textBoxes || [];
                faceDesign.textBoxes.push({ id: newId, text: 'New Text', typography: { ...inheritedTypo, fontWeight: 'normal' } });
            }
            else if (type === 'divider') {
                faceDesign.textBoxes = faceDesign.textBoxes || [];
                faceDesign.textBoxes.push({ id: newId, text: '---', typography: { ...inheritedTypo } });
            }
            else if (type === 'inline_composite' && colId) {
                const col = table.columns.find(c => c.id === colId);
                if (col) {
                    faceDesign.textBoxes = faceDesign.textBoxes || [];
                    faceDesign.textBoxes.push({ id: newId, text: `${col.name}: {${col.name}}`, typography: { ...inheritedTypo, textAlign: 'left' } });
                }
            }

            if (newId) {
                const exists = faceDesign.elementOrder.includes(newId);
                if (!exists) faceDesign.elementOrder.splice(index, 0, newId);
                if (type !== 'text' && type !== 'divider' && type !== 'inline_composite' && newId && !faceDesign.typography[newId]) {
                    if (type === 'label') faceDesign.typography[newId] = { ...inheritedTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
                    else faceDesign.typography[newId] = { ...inheritedTypo };
                }
            }
        });
    };

    const handleDeleteElement = (face: 'front' | 'back', id: string) => {
        // Guard: Prevent deletion of System Block in Cloze Mode
        if (isClozeMode && face === 'front' && relation.questionColumnIds.includes(id)) {
            return;
        }

        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            if (faceDesign.elementOrder) { faceDesign.elementOrder = faceDesign.elementOrder.filter((eid: string) => eid !== id); }
        });
        if (selectedElementId === id) setSelectedElementId(null);
    };

    const handleUpdateElement = (face: 'front' | 'back', id: string, updates: any) => {
        onChange(draft => {
            if (!draft.design) return;
            const faceDesign = draft.design[face];
            const textBox = faceDesign.textBoxes?.find((t: any) => t.id === id);
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
            let colId = id.startsWith('label-') ? id.replace('label-', '') : id;
            let newId = newType === 'data' ? colId : `label-${colId}`;
            const idx = faceDesign.elementOrder.indexOf(oldId);
            if (idx !== -1) {
                faceDesign.elementOrder[idx] = newId;
                if (newType === 'data' && !faceDesign.typography[newId]) faceDesign.typography[newId] = { ...defaultTypo };
                if (newType === 'label' && !faceDesign.typography[newId]) faceDesign.typography[newId] = { ...defaultTypo, fontSize: '0.75rem', opacity: 0.7, fontWeight: 'bold' };
            }
        });
        let colId = id.startsWith('label-') ? id.replace('label-', '') : id;
        let nextId = newType === 'label' ? `label-${colId}` : colId;
        setSelectedElementId(nextId);
    };

    const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setInternalPreviewMode(e.target.value as StudyMode);
    };

    const availableModes = [
        { mode: StudyMode.Flashcards, label: 'Flashcard' },
        { mode: StudyMode.MultipleChoice, label: 'Multiple Choice' },
        { mode: StudyMode.TrueFalse, label: 'True/False' },
        { mode: StudyMode.Typing, label: 'Typing' },
        { mode: StudyMode.Scrambled, label: 'Scramble' },
        { mode: StudyMode.ClozeTyping, label: 'Cloze (Typing)' }, // Added
        { mode: StudyMode.ClozeMCQ, label: 'Cloze (MCQ)' }, // Added
    ];

    if (!availableModes.some(m => m.mode === activeMode)) {
        availableModes.push({ mode: activeMode, label: activeMode });
    }

    const handleContainerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDesignLocked) setSelectedElementId(null);
    }

    const design = relation.design?.front;
    const backDesign = relation.design?.back;
    const canvasBgClass = "bg-secondary-50 dark:bg-black/40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]";

    const rootClass = isFocusMode
        ? "fixed inset-0 z-[1000] bg-background dark:bg-secondary-900"
        : `flex flex-col w-full relative ${isMobile && viewMode === 'design' ? 'h-auto min-h-full' : 'h-full overflow-hidden'}`;

    return (
        <div className={rootClass}>
            {(!isFocusMode || viewMode === 'design') && (
                <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-start pointer-events-none">
                    <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto bg-surface/90 dark:bg-secondary-800/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700">
                        <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5 gap-0.5">
                            <button onClick={() => setViewMode('design')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'design' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}><Icon name="pencil" className="w-3.5 h-3.5 sm:hidden" /><span className="hidden sm:inline">Design</span></button>
                            <button onClick={() => setViewMode('preview')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle hover:text-text-main'}`}><Icon name="play" className="w-3.5 h-3.5 sm:hidden" /><span className="hidden sm:inline">Preview</span></button>
                        </div>
                        <div className="relative">
                            <select value={activeMode} onChange={handleModeChange} className="appearance-none w-full bg-secondary-100 dark:bg-secondary-700 border-none text-xs font-bold text-text-main dark:text-secondary-200 rounded-md py-1.5 pl-2 pr-8 focus:ring-2 focus:ring-primary-500/50 cursor-pointer">{availableModes.map(opt => <option key={opt.mode} value={opt.mode}>{opt.label}</option>)}</select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-text-subtle"><Icon name="chevron-down" className="w-3 h-3" /></div>
                        </div>
                    </div>
                    {viewMode === 'design' && (
                        <div className="flex flex-col sm:flex-row gap-2 pointer-events-auto bg-surface/90 dark:bg-secondary-800/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700">
                            <button onClick={() => setIsDesignLocked(!isDesignLocked)} className={`flex items-center justify-center gap-1.5 p-1.5 sm:px-3 rounded-md text-xs font-bold transition-all ${isDesignLocked ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-text-subtle hover:bg-secondary-100 dark:hover:bg-secondary-700'}`} title={isDesignLocked ? "Elements Locked" : "Elements Unlocked"}><Icon name={isDesignLocked ? "lock-closed" : "lock-open"} className="w-4 h-4" /></button>
                        </div>
                    )}
                </div>
            )}

            <div className="absolute top-4 right-4 z-[60]">
                <button onClick={() => setIsFocusMode(!isFocusMode)} className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md shadow-lg transition-transform hover:scale-110" title={isFocusMode ? "Exit Focus Mode" : "Focus Mode"}><Icon name={isFocusMode ? "x" : "arrows-pointing-out"} className="w-5 h-5" /></button>
            </div>

            <div ref={containerRef} className={`flex-1 flex relative transition-all duration-500 justify-center ${canvasBgClass} ${isMobile && viewMode === 'design' ? 'overflow-visible h-auto min-h-full items-start pt-24 pb-20' : 'overflow-hidden h-full items-center'}`} onClick={() => setSelectedElementId(null)}>
                {viewMode === 'design' ? (
                    <div style={isMobile ? { width: DEVICE_WIDTH, height: DEVICE_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top center', boxShadow: '0 20px 50px -12px rgba(0,0,0,0.5)' } : { width: '100%', height: '100%', transform: 'none', padding: '4rem' }} className={`relative transition-all duration-300 ease-out flex items-center justify-center`} onClick={handleContainerClick}>
                        <div className="w-full h-full max-w-4xl max-h-[800px] flex flex-col justify-center relative z-10">
                            <QuestionCardDesigner
                                card={mockCard}
                                design={design}
                                backDesign={backDesign}
                                row={sampleRow}
                                table={table}
                                relation={relation} // Pass full relation for logic checks (like Cloze mode)
                                selectedElementId={!isDesignLocked ? selectedElementId : null}
                                onSelectElement={!isDesignLocked ? setSelectedElementId : undefined}
                                onInsertElement={!isDesignLocked ? handleInsertElement : undefined}
                                onUpdateElement={!isDesignLocked ? handleUpdateElement : undefined}
                                onDeleteElement={!isDesignLocked ? handleDeleteElement : undefined}
                                onChangeElementType={!isDesignLocked ? handleChangeElementType : undefined}
                                isMobile={isMobile}
                            />
                        </div>

                        {/* Theme Dock */}
                        <ThemeDock currentThemeId={currentThemeId} onApply={handleApplyTheme} />
                    </div>
                ) : (
                    <div className="w-full h-full overflow-hidden pt-16 pb-4 px-4">
                        <RelationLivePreview table={table} relation={relation} forcedMode={activeMode} />
                        {/* Theme Dock for Preview Mode */}
                        <ThemeDock currentThemeId={currentThemeId} onApply={handleApplyTheme} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedDesigner;
