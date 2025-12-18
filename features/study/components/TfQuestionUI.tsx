
import React from 'react';
import Icon from '../../../components/ui/Icon';

interface TfQuestionUIProps {
    onAnswer: (answer: 'True' | 'False') => void;
}

const TfQuestionUI: React.FC<TfQuestionUIProps> = ({ onAnswer }) => {
    return (
        <div className="flex gap-4 w-full">
            <button 
                onClick={() => onAnswer('False')}
                className="flex-1 h-16 flex items-center justify-center gap-2 rounded-xl bg-error-500 text-white font-bold text-lg shadow-md hover:bg-error-600 active:scale-95 transition-all duration-200"
                aria-label="False"
            >
                <Icon name="x" className="w-6 h-6" strokeWidth={3} />
                False
            </button>

            <button 
                onClick={() => onAnswer('True')}
                className="flex-1 h-16 flex items-center justify-center gap-2 rounded-xl bg-success-500 text-white font-bold text-lg shadow-md hover:bg-success-600 active:scale-95 transition-all duration-200"
                aria-label="True"
            >
                <Icon name="check" className="w-6 h-6" strokeWidth={3} />
                True
            </button>
        </div>
    );
};

export default TfQuestionUI;
