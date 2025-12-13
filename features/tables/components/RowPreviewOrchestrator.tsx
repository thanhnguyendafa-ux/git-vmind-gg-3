

import * as React from 'react';
import { Table, VocabRow, Relation, StudyMode, Question } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import UnifiedQuestionCard from '../../study/components/v3/UnifiedQuestionCard';
import { createQuestion, convertQuestionToCard, validateAnswer } from '../../../utils/studySessionGenerator';
import { playSuccessSound, playErrorSound } from '../../../services/soundService';
import { useUIStore } from '../../../stores/useUIStore';

interface RowPreviewOrchestratorProps {
    isOpen: boolean;
    onClose: () => void;
    row: VocabRow;
    table: Table;
    onSaveToJournal: (source: string, content: string) => void;
}

const RowPreviewOrchestrator: React.FC<RowPreviewOrchestratorProps> = ({ isOpen, onClose, row, table, onSaveToJournal }) => {
    const { theme } = useUIStore();
    const [step, setStep] = React.useState<'relation' | 'mode' | 'preview'>('relation');
    const [selectedRelation, setSelectedRelation] = React.useState<Relation | null>(null);
    const [selectedMode, setSelectedMode] = React.useState<StudyMode | null>(null);
    const [feedback, setFeedback] = React.useState<'correct' | 'incorrect' | null>(null);
    
    // Reset state on open
    React.useEffect(() => {
        if (isOpen) {
            setStep('relation');
            setSelectedRelation(null);
            setSelectedMode(null);
            setFeedback(null);
        }
    }, [isOpen]);

    const handleRelationSelect = (rel: Relation) => {
        setSelectedRelation(rel);
        const modes = rel.interactionModes || rel.compatibleModes || [];
        if (modes.length === 1) {
            setSelectedMode(modes[0]);
            setStep('preview');
        } else {
            setStep('mode');
        }
    };

    const handleModeSelect = (mode: StudyMode) => {
        setSelectedMode(mode);
        setStep('preview');
    };

    const handleAnswer = (answer: any) => {
        if (!card) return;
        const isCorrect = validateAnswer(card, answer);
        if (isCorrect) playSuccessSound();
        else playErrorSound();
        setFeedback(isCorrect ? 'correct' : 'incorrect');
    };

    const handleJournal = () => {
        if (!selectedRelation || !question) return;
        const content = `**Q:** ${question.questionText}\n**A:** ${question.correctAnswer}`;
        onSaveToJournal(`Preview: ${selectedRelation.name}`, content);
    };

    const handlePrint = () => {
        // Snapshot Printing Logic
        // 1. Enter Print State
        document.body.classList.add('is-printing');
        
        // 2. Dispatch custom event for complex components (HanziWriter) to prepare themselves
        window.dispatchEvent(new CustomEvent('vmind-before-print'));

        // 3. Wait for rendering to settle (Race condition fix for HanziWriter)
        setTimeout(() => {
            // 4. Trigger Print Dialog
            // This blocks the main thread in most browsers.
            window.print();
            
            // 5. Cleanup State
            document.body.classList.remove('is-printing');
            // Allow components to restore state if needed (handled by 'afterprint' event listeners usually)
        }, 500); 
    };

    // Generate Card Logic
    const { question, card } = React.useMemo(() => {
        if (!selectedRelation || !selectedMode) return { question: null, card: null };
        const q = createQuestion(row, selectedRelation, table, table.rows, selectedMode);
        if (!q) return { question: null, card: null };
        return { question: q, card: convertQuestionToCard(q) };
    }, [row, selectedRelation, selectedMode, table]);

    const titleMap = {
        'relation': 'Select Context',
        'mode': 'Select Interaction',
        'preview': selectedRelation?.name || 'Preview'
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={titleMap[step]} 
            containerClassName="max-w-2xl w-full h-[80vh] md:h-auto overflow-hidden flex flex-col"
        >
            <div className="flex-1 overflow-y-auto p-0 md:p-6 bg-secondary-50 dark:bg-secondary-900/50">
                {step === 'relation' && (
                    <div className="space-y-3 p-4">
                        <p className="text-sm text-text-subtle mb-2">Choose a relation to define the Question/Answer context:</p>
                        {table.relations.length === 0 && (
                            <div className="text-center text-text-subtle py-8">
                                No relations defined for this table.
                            </div>
                        )}
                        {table.relations.map(rel => (
                            <button
                                key={rel.id}
                                onClick={() => handleRelationSelect(rel)}
                                className="w-full p-4 bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all flex items-center justify-between group text-left"
                            >
                                <div>
                                    <h4 className="font-bold text-text-main dark:text-secondary-100">{rel.name}</h4>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {(rel.interactionModes || rel.compatibleModes || []).map(m => (
                                            <span key={m} className="text-[10px] uppercase font-bold bg-secondary-100 dark:bg-secondary-700 text-text-subtle px-2 py-0.5 rounded-full">{m}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center group-hover:bg-primary-50 dark:group-hover:bg-primary-900/20 group-hover:text-primary-500 transition-colors">
                                    <Icon name="chevron-right" className="w-5 h-5"/>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {step === 'mode' && selectedRelation && (
                    <div className="p-6">
                        <p className="text-sm text-text-subtle mb-4">How do you want to interact with this card?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(selectedRelation.interactionModes || selectedRelation.compatibleModes || []).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => handleModeSelect(mode)}
                                    className="p-6 bg-surface dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 group"
                                >
                                    <span className="font-bold text-lg text-text-main dark:text-secondary-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">{mode}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'preview' && card ? (
                    <div className="flex flex-col h-full">
                        <div className="flex-1 min-h-[400px] relative p-4 flex flex-col items-center justify-center">
                            {/* Card Wrapper for Print Targeting */}
                            <div className="w-full max-w-xl vmind-print-target">
                                <UnifiedQuestionCard 
                                    card={card}
                                    onAnswer={handleAnswer}
                                    design={selectedRelation?.design?.front}
                                    backDesign={selectedRelation?.design?.back}
                                    row={row}
                                    table={table}
                                    relation={selectedRelation || undefined}
                                />
                            </div>
                            
                            {feedback && (
                                <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full font-bold text-white shadow-lg animate-fadeIn ${feedback === 'correct' ? 'bg-success-500' : 'bg-error-500'} no-print`}>
                                    {feedback === 'correct' ? 'Correct!' : 'Incorrect'}
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-surface dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 flex justify-between items-center gap-2">
                             <Button variant="ghost" onClick={() => { setStep('relation'); setFeedback(null); }}>
                                <Icon name="arrowLeft" className="w-4 h-4 mr-2"/> Start Over
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={handlePrint} title="Print Card to PDF">
                                    <Icon name="printer" className="w-4 h-4 mr-2"/> Print
                                </Button>
                                <Button variant="secondary" onClick={handleJournal} title="Save to Journal">
                                    <Icon name="book" className="w-4 h-4"/>
                                </Button>
                                <Button onClick={onClose}>Close</Button>
                            </div>
                        </div>
                    </div>
                ) : step === 'preview' && (
                    <div className="p-8 text-center text-error-500 flex flex-col items-center justify-center h-full">
                        <Icon name="error-circle" className="w-12 h-12 mx-auto mb-2"/>
                        <p className="font-semibold">Unable to Generate Preview</p>
                        <p className="text-sm mt-1 opacity-80">This row might be missing data required for the "{selectedMode}" mode.</p>
                        <Button variant="ghost" onClick={() => setStep('relation')} className="mt-6">Back to Selection</Button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default RowPreviewOrchestrator;
