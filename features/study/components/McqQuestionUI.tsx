import React from 'react';
import { Question } from '../../../types';
import { Button } from '../../../components/ui/Button';

interface McqQuestionUIProps {
    question: Question;
    onAnswer: (answer: string) => void;
}

const McqQuestionUI: React.FC<McqQuestionUIProps> = ({ question, onAnswer }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((option, index) => (
                <Button 
                    key={index} 
                    variant="secondary"
                    onClick={() => onAnswer(option)}
                    className="h-auto py-3 text-base justify-start text-left"
                >
                    {option}
                </Button>
            ))}
        </div>
    );
};

export default McqQuestionUI;
