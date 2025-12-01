import React from 'react';
import { Question, VocabRow, Relation, StudyMode } from '../../../types';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

interface AnswerFeedbackPanelProps {
    feedback: 'correct' | 'incorrect';
    question: Question;
    row: VocabRow;
    relation: Relation;
    onViewDetails: () => void;
    onNext: () => void;
    onViewCorrectCard?: () => void;
}

const AnswerFeedbackPanel: React.FC<AnswerFeedbackPanelProps> = ({
    feedback,
    question,
    row,
    relation,
    onViewDetails,
    onNext,
    onViewCorrectCard,
}) => {
    const isCorrect = feedback === 'correct';

    const renderCorrectAnswer = () => {
        if (question.type !== StudyMode.TrueFalse) {
            return (
                <p className="text-base font-medium text-text-main dark:text-secondary-100">
                    {question.correctAnswer}
                </p>
            );
        }

        // True/False special logic
        const realAnswerText = relation.answerColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');
        const questionText = relation.questionColumnIds.map(id => row.cols[id]).filter(Boolean).join(' / ');

        if (question.correctAnswer === 'True') {
            return (
                <div>
                    <p className="text-xs text-text-subtle">The statement was correct:</p>
                    <p className="text-base font-medium text-text-main dark:text-secondary-100 mt-1">
                        "{questionText}" means "{realAnswerText}".
                    </p>
                </div>
            );
        } else { // Correct answer was "False"
            return (
                <div>
                    <p className="text-xs text-text-subtle">"{questionText}" does not mean "{question.proposedAnswer}".</p>
                    <p className="text-base font-medium text-text-main dark:text-secondary-100 mt-1">
                        Correct answer: "{realAnswerText}".
                    </p>
                </div>
            );
        }
    };


    return (
        <div className={`w-full animate-slideInUp rounded-xl border p-5 shadow-lg backdrop-blur-sm ${isCorrect ? 'bg-success-50/90 border-success-200 dark:bg-success-900/20 dark:border-success-800' : 'bg-error-50/90 border-error-200 dark:bg-error-900/20 dark:border-error-800'}`}>
            
            <div className="flex items-start gap-4 mb-5">
                <div className={`p-2 rounded-full flex-shrink-0 border ${isCorrect ? 'bg-success-100 border-success-200 text-success-600 dark:bg-success-900/50 dark:border-success-700 dark:text-success-400' : 'bg-error-100 border-error-200 text-error-600 dark:bg-error-900/50 dark:border-error-700 dark:text-error-400'}`}>
                    <Icon name={isCorrect ? 'check' : 'x'} className="w-7 h-7" strokeWidth={3} />
                </div>
                <div className="flex-1">
                    <h3 className={`text-2xl font-bold ${isCorrect ? 'text-success-800 dark:text-success-200' : 'text-error-800 dark:text-error-200'}`}>
                        {isCorrect ? 'Excellent!' : 'Incorrect'}
                    </h3>
                    {!isCorrect && (
                        <div className="mt-2">
                            <p className="text-xs font-bold text-text-subtle uppercase tracking-wider mb-1">Correct Answer</p>
                            {renderCorrectAnswer()}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <Button variant="ghost" className="bg-white/50 dark:bg-black/20 border border-transparent hover:border-secondary-300 dark:hover:border-secondary-600" onClick={onViewDetails}>
                    <Icon name="pencil" className="w-4 h-4 mr-2" />
                    Edit Details
                </Button>
                {feedback === 'incorrect' && onViewCorrectCard && (
                    <Button variant="secondary" onClick={onViewCorrectCard}>
                        <Icon name="credit-card" className="w-4 h-4 mr-2" />
                        View Card
                    </Button>
                )}
                <Button 
                    onClick={onNext} 
                    className={`flex-1 font-bold shadow-md h-11 ${isCorrect ? 'bg-success-600 hover:bg-success-700 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}
                >
                    Continue <Icon name="arrowRight" className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
};

export default AnswerFeedbackPanel;