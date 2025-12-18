
import React from 'react';
import { Question, VocabRow, Relation, StudyMode, Table } from '../../../types';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';
import { evaluateFormula } from '../../../utils/textUtils';

interface AnswerFeedbackPanelProps {
    feedback: 'correct' | 'incorrect';
    question: Question;
    row: VocabRow;
    relation: Relation;
    table?: Table;
    onViewDetails: () => void;
    onNext?: () => void;
    onViewCorrectCard?: () => void;
}

const AnswerFeedbackPanel: React.FC<AnswerFeedbackPanelProps> = ({
    feedback,
    question,
    row,
    relation,
    table,
    onViewDetails,
    onNext,
    onViewCorrectCard,
}) => {
    const isCorrect = feedback === 'correct';

    const renderCorrectAnswer = () => {
        if (question.type !== StudyMode.TrueFalse) {
            return (
                <div className="space-y-1">
                    <p className="text-base font-medium text-text-main dark:text-secondary-100">
                        {question.correctAnswer}
                    </p>
                    {question.extraInfo && (
                        <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm text-yellow-800 dark:text-yellow-200 flex gap-2 items-start">
                             <Icon name="info" className="w-4 h-4 mt-0.5 flex-shrink-0 opacity-70" />
                             <p className="italic">{question.extraInfo}</p>
                        </div>
                    )}
                </div>
            );
        }

        const realAnswerText = (relation.answerFormula && table)
            ? evaluateFormula(relation.answerFormula, row, table.columns)
            : relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
            
        const questionText = question.questionText;

        if (question.correctAnswer === 'True') {
            return (
                <div className="text-sm">
                    <p className="text-xs text-text-subtle">The statement was correct:</p>
                    <p className="font-medium text-text-main dark:text-secondary-100 mt-0.5">
                        "{questionText}" means "{realAnswerText}".
                    </p>
                </div>
            );
        } else { 
            return (
                <div className="text-sm">
                    <p className="text-xs text-text-subtle">Correct answer:</p>
                    <p className="font-medium text-text-main dark:text-secondary-100 mt-0.5">
                        "{realAnswerText}".
                    </p>
                </div>
            );
        }
    };


    return (
        <div className={`w-full animate-slideInUp rounded-xl border p-4 shadow-lg backdrop-blur-sm ${isCorrect ? 'bg-success-50/90 border-success-200 dark:bg-success-900/20 dark:border-success-800' : 'bg-error-50/90 border-error-200 dark:bg-error-900/20 dark:border-error-800'}`}>
            
            <div className="flex items-start gap-3 mb-4">
                <div className={`p-1.5 rounded-full flex-shrink-0 border ${isCorrect ? 'bg-success-100 border-success-200 text-success-600 dark:bg-success-900/50 dark:border-success-700 dark:text-success-400' : 'bg-error-100 border-error-200 text-error-600 dark:bg-error-900/50 dark:border-error-700 dark:text-error-400'}`}>
                    <Icon name={isCorrect ? 'check' : 'x'} className="w-5 h-5" strokeWidth={3} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-bold ${isCorrect ? 'text-success-800 dark:text-success-200' : 'text-error-800 dark:text-error-200'}`}>
                        {isCorrect ? 'Excellent!' : 'Incorrect'}
                    </h3>
                    {!isCorrect && (
                        <div className="mt-1.5">
                            {renderCorrectAnswer()}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-2 items-center">
                {/* Secondary Actions: Edit / View Info */}
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`bg-white/50 dark:bg-black/20 border border-transparent hover:border-secondary-300 dark:hover:border-secondary-600 px-3 ${isCorrect ? 'text-success-700 dark:text-success-300' : 'text-error-700 dark:text-error-300'}`} 
                    onClick={onViewDetails}
                    title="Edit Card"
                >
                    <Icon name="pencil" className="w-4 h-4" />
                </Button>
                
                {onViewCorrectCard && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={onViewCorrectCard} 
                        className={`bg-white/50 dark:bg-black/20 border border-transparent hover:border-secondary-300 dark:hover:border-secondary-600 px-3 ${isCorrect ? 'text-success-700 dark:text-success-300' : 'text-error-700 dark:text-error-300'}`}
                        title="View Info"
                    >
                        <Icon name="file-text" className="w-4 h-4" />
                    </Button>
                )}

                {/* Primary Action: Continue */}
                {onNext && (
                    <Button 
                        onClick={onNext} 
                        size="sm"
                        className={`flex-1 font-bold shadow-md h-9 ml-2 ${isCorrect ? 'bg-success-600 hover:bg-success-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                    >
                        Continue <Icon name="arrowRight" className="w-4 h-4 ml-2" />
                    </Button>
                )}
            </div>
        </div>
    );
};

export default AnswerFeedbackPanel;