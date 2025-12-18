
import React, { useState, useMemo, useEffect } from 'react';
import { Table, Relation, VocabRow, StudyMode, QuestionCard, Question } from '../../../types';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../../utils/studySessionGenerator';
import UnifiedQuestionCard from '../../../features/study/components/v3/UnifiedQuestionCard';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';
import { playSuccessSound, playErrorSound } from '../../../services/soundService';
import { evaluateFormula } from '../../../utils/textUtils';

interface RelationLivePreviewProps {
    table: Table;
    relation: Relation;
    forcedMode?: StudyMode | null;
}

const MOCK_ROW: VocabRow = {
    id: 'mock-row',
    cols: {},
    stats: { correct: 0, incorrect: 0, lastStudied: null, flashcardStatus: 'New' as any, flashcardEncounters: 0, isFlashcardReviewed: false, lastPracticeDate: null }
};

export const RelationLivePreview: React.FC<RelationLivePreviewProps> = ({ table, relation, forcedMode }) => {
    const [targetRowIndex, setTargetRowIndex] = useState(0);
    const [forceScenario, setForceScenario] = useState<'true' | 'false' | null>(null);
    const [seed, setSeed] = useState(0); 
    const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
    
    // The active mode is now directly controlled by the parent component.
    const activePreviewMode = forcedMode;

    useEffect(() => {
        setTargetRowIndex(0);
        setSeed(0);
        setForceScenario(null);
    }, [table.id, relation.id]);

    const relationDataKey = JSON.stringify({
        qIds: relation.questionColumnIds,
        aIds: relation.answerColumnIds,
        mode: activePreviewMode,
        scramble: relation.scrambleConfig,
        cloze: relation.clozeConfig,
        dict: relation.dictationConfig,
        prompt: relation.promptType,
        custom: relation.customPromptText,
        config: relation.interactionConfig,
        formula: relation.answerFormula, // Added dependency
        target: relation.targetLabel // Added dependency
    });

    const { card, row } = useMemo<{ card: QuestionCard | null, row: VocabRow }>(() => {
        if (!activePreviewMode) return { card: null, row: MOCK_ROW };

        const hasRows = table.rows.length > 0;
        let rows = hasRows ? [...table.rows] : [JSON.parse(JSON.stringify(MOCK_ROW))];
        
        const validIndex = targetRowIndex % rows.length;
        const row = rows[validIndex];
        
        // If mock row, populate with sample data
        if (!hasRows) {
            table.columns.forEach((col, i) => {
                // If column is configured as image, provide a dummy image
                if (table.imageConfig?.imageColumnId === col.id) {
                     row.cols[col.id] = "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400";
                } else {
                     row.cols[col.id] = `Sample ${col.name} ${i + 1}`;
                }
            });
        }
        
        // Cloze Data Patching for Preview
        // Ensure the preview always shows a valid Cloze question even if data doesn't match perfectly
        if (activePreviewMode === StudyMode.ClozeTyping || activePreviewMode === StudyMode.ClozeMCQ) {
             const qCol = relation.questionColumnIds[0];
             const aCol = relation.answerColumnIds[0];
             
             if (qCol && aCol) {
                 let qText = row.cols[qCol] || "The sky is blue.";
                 let aText = row.cols[aCol] || "blue";
                 
                 // If mocking or if real data is missing proper structure (bracket or matching answer)
                 if (!qText.includes('[...]')) {
                     // If the answer is found in the text (case insensitive), createQuestion will handle it.
                     // But if not, we must force it for the preview to work.
                     if (!aText || !qText.toLowerCase().includes(aText.toLowerCase())) {
                         // Force a valid preview format by appending the placeholder
                         qText = `${qText} [...]`;
                         // Update row copy so RichCell renders the modified text in the preview
                         row.cols[qCol] = qText;
                     }
                 }
             }
        }
        
        // Scramble Mock Data Patching
        if (activePreviewMode === StudyMode.Scrambled && !hasRows) {
            if (relation.questionColumnIds.length > 0) {
                const firstQCol = relation.questionColumnIds[0];
                row.cols[firstQCol] = "This is a sample sentence for the scramble preview mode.";
            }
        }

        if (activePreviewMode === StudyMode.Scrambled) {
             let textToScramble = '';
             if (relation.answerFormula) {
                 textToScramble = evaluateFormula(relation.answerFormula, row, table.columns); 
             } else if (relation.questionColumnIds.length > 0) {
                 textToScramble = row.cols[relation.questionColumnIds[0]];
             }

             const wordCount = (textToScramble || '').split(' ').filter(Boolean).length;
             if (wordCount < 2) {
                 return {
                     card: {
                         id: 'placeholder-scramble',
                         rowId: row.id,
                         type: 'scramble',
                         content: { promptText: 'Scramble Preview Placeholder' },
                         payload: { segments: ['Sample', 'Scramble', 'Data'], originalSentence: 'Sample Scramble Data' } as any
                     },
                     row
                 }
             }
        }

        let question = createQuestion(row, relation, table, rows, activePreviewMode);
        
        if (!question && activePreviewMode === StudyMode.Scrambled && relation.questionColumnIds.length > 0) {
                const qCol = relation.questionColumnIds[0];
                if (qCol) {
                    question = {
                    rowId: row.id,
                    tableId: table.id,
                    relationId: relation.id,
                    questionSourceColumnNames: [table.columns.find(c => c.id === qCol)?.name || 'Col'],
                    questionText: row.cols[qCol] || "Sample Text",
                    correctAnswer: row.cols[qCol] || "Sample Text",
                    type: StudyMode.Scrambled,
                    scrambledParts: (row.cols[qCol] || "Sample Text").split(' ').sort(() => Math.random() - 0.5)
                };
                }
        }

        if (!question) {
             // Fallback Generation to ensure Design Preview always works
             // Ensure row has data for design rendering in case of empty real rows
             [...relation.questionColumnIds, ...relation.answerColumnIds].forEach(colId => {
                 if (!row.cols[colId]) {
                     const colName = table.columns.find(c => c.id === colId)?.name || 'Column';
                     row.cols[colId] = `[${colName}]`;
                 }
             });

             const fallbackQuestionText = relation.questionColumnIds.map(id => row.cols[id]).join(' ') || "Preview Question";
             const fallbackAnswerText = relation.answerColumnIds.map(id => row.cols[id]).join(' ') || "Preview Answer";
             
             question = {
                rowId: row.id,
                tableId: table.id,
                relationId: relation.id,
                questionSourceColumnNames: [],
                questionText: fallbackQuestionText,
                correctAnswer: fallbackAnswerText,
                type: activePreviewMode,
                // Provide defaults for specific modes so they don't crash
                options: ["Option 1", "Option 2", "Option 3", fallbackAnswerText],
                scrambledParts: ["Preview", "Scramble", "Text"],
                proposedAnswer: fallbackAnswerText,
                contextBefore: "Context Before",
                contextAfter: "Context After",
                clozeText: "[...]"
             } as Question;
        }
        
        if (activePreviewMode === StudyMode.TrueFalse && forceScenario) {
                if (forceScenario === 'false' && question.correctAnswer === 'True') {
                    const validDistractors = rows.filter(r => r.id !== row.id);
                    const distractorRow = validDistractors.length > 0 ? validDistractors[0] : null;
                    const distractorText = distractorRow 
                    ? relation.answerColumnIds.map(id => distractorRow.cols[id]).filter(Boolean).join(' / ') 
                    : "Different Answer";
                    
                    question = {
                        ...question,
                        proposedAnswer: distractorText,
                        proposedCols: distractorRow ? distractorRow.cols : { ...row.cols, [relation.answerColumnIds[0]]: distractorText },
                        correctAnswer: 'False'
                    };
                } else if (forceScenario === 'true' && question.correctAnswer === 'False') {
                    const actualAnswer = relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
                    question = {
                        ...question,
                        proposedAnswer: actualAnswer,
                        proposedCols: row.cols,
                        correctAnswer: 'True'
                    };
                }
        }

        return { card: convertQuestionToCard(question), row };

    }, [table, relationDataKey, targetRowIndex, forceScenario, seed, activePreviewMode]); 

    useEffect(() => {
        setFeedback(null);
    }, [card?.id]);

    const handleShuffle = () => {
        setTargetRowIndex(prev => prev + 1);
        setSeed(prev => prev + 1);
    };
    
    const handleAnswer = (userAnswer: any) => {
        if (!card) return;
        const isCorrect = validateAnswer(card, userAnswer);
        setFeedback(isCorrect ? 'correct' : 'incorrect');
        if (isCorrect) {
            playSuccessSound();
        } else {
            playErrorSound();
        }
    };

    const hasTrueFalse = activePreviewMode === StudyMode.TrueFalse;

    if (!activePreviewMode) return <div className="flex items-center justify-center h-full text-text-subtle text-sm p-4"><p>Select an interaction mode to see a preview.</p></div>;

    return (
        <div className="flex flex-col h-full w-full bg-surface dark:bg-secondary-800 relative">
            {/* Controls Header: Adaptive positioning for mobile/desktop */}
            <div className={`
                flex justify-end items-center z-20 flex-shrink-0 transition-all duration-300
                md:p-3 md:border-b md:border-secondary-200 md:dark:border-secondary-700 md:bg-surface md:dark:bg-secondary-800 md:sticky md:top-0
                absolute top-2 right-2 p-0 bg-transparent pointer-events-none md:pointer-events-auto
            `}>
                <div className={`flex gap-2 bg-surface/80 dark:bg-secondary-800/80 backdrop-blur-sm p-1 rounded-lg shadow-sm border border-secondary-200 dark:border-secondary-700 md:bg-transparent md:shadow-none md:border-none md:p-0 pointer-events-auto`}>
                     {hasTrueFalse && (
                        <div className="flex bg-secondary-100 dark:bg-secondary-700 rounded p-0.5">
                             <button onClick={() => setForceScenario('true')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${forceScenario === 'true' ? 'bg-white dark:bg-secondary-600 shadow text-success-600' : 'text-text-subtle'}`} title="Force True">T</button>
                            <button onClick={() => setForceScenario('false')} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${forceScenario === 'false' ? 'bg-white dark:bg-secondary-600 shadow text-error-600' : 'text-text-subtle'}`} title="Force False">F</button>
                             <button onClick={() => setForceScenario(null)} className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors ${forceScenario === null ? 'bg-white dark:bg-secondary-600 shadow text-primary-600' : 'text-text-subtle'}`} title="Random">?</button>
                        </div>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleShuffle} title="Next Example" className="h-6 w-6 p-0"><Icon name="shuffle" className="w-3 h-3" /></Button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto relative w-full">
                {/* min-h-full ensures the content centers vertically if small, but can scroll if large. Added top padding for mobile to clear absolute controls. */}
                <div className="flex flex-col items-center justify-center min-h-full w-full p-1 md:p-4 pt-12 md:pt-4">
                    {card ? (
                         <div className="w-full flex flex-col">
                            <UnifiedQuestionCard 
                                card={card} 
                                onAnswer={handleAnswer} 
                                design={relation.design?.front}
                                backDesign={relation.design?.back}
                                row={row}
                                table={table}
                            />
                        </div>
                    ) : (
                        <div className="text-center text-text-subtle text-sm"><p>Preview Unavailable for this mode.</p></div>
                    )}

                    {feedback && (
                         <div 
                            className={`sticky bottom-4 mt-4 p-2 px-4 rounded-full text-white font-bold text-sm shadow-lg animate-fadeIn z-50 ${
                                feedback === 'correct' ? 'bg-success-500' : 'bg-error-500'
                            }`}
                        >
                            {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
