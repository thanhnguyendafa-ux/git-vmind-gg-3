import * as React from 'react';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';
import { Button } from '../../../components/ui/Button';

interface StudyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const quizQuestions = [
    {
        question: "Which of the following words would likely have the HIGHEST Priority Score?",
        options: [
            "A word you answered correctly yesterday.",
            "A brand new word you have never seen before.",
            "A word you got wrong 10 days ago and was in a session you quit.",
            "A word you have answered correctly 15 times."
        ],
        correctAnswer: 2,
        explanation: "The combination of a high failure rate, a long time since last practice, and being in a 'quit' session gives this word the highest urgency for review."
    },
    {
        question: "If you want to focus on words you haven't seen in a long time, which criteria is BEST to sort by?",
        options: [
            "Success Rate (Ascending)",
            "Last Practiced (Ascending)",
            "Rank Point (Descending)",
            "Random"
        ],
        correctAnswer: 1,
        explanation: "Sorting by 'Last Practiced (Ascending)' brings the oldest, least recently studied words to the top of the list."
    },
    {
        question: "What is the main goal of the 'Strategies' tab in this guide?",
        options: [
            "To provide a list of all features in Vmind.",
            "To give concrete 'recipes' for creating effective, targeted study sessions.",
            "To explain the mathematical formulas behind the sorting.",
            "To test your vocabulary knowledge."
        ],
        correctAnswer: 1,
        explanation: "The 'Strategies' tab is designed to give you practical, ready-to-use templates for different learning goals, like drilling difficult words or reviewing old ones."
    }
];

type GuideTab = 'priority' | 'metrics' | 'strategies';

const MetricDetail: React.FC<{ icon: string; title: string; weight: string; children: React.ReactNode; }> = ({ icon, title, weight, children }) => (
    <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 flex flex-col items-center justify-center bg-secondary-200 dark:bg-secondary-700 rounded-lg">
            <Icon name={icon} className="w-6 h-6 text-primary-500" />
            <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{weight}</span>
        </div>
        <div>
            <h5 className="font-semibold text-text-main dark:text-secondary-100">{title}</h5>
            <p className="text-xs text-text-subtle">{children}</p>
        </div>
    </div>
);


const GuideContent: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState<GuideTab>('priority');

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-primary-600 dark:text-primary-400">Master Vmind's Learning Engine</h3>
            <p className="text-sm text-text-subtle">
                Vmind uses powerful sorting to create optimal study sessions. Understand these tools to supercharge your learning.
            </p>

            <div className="border-b border-secondary-200 dark:border-secondary-700">
                <div className="flex space-x-4">
                    <button onClick={() => setActiveTab('priority')} className={`px-1 py-2 font-semibold text-sm ${activeTab === 'priority' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>Priority Score</button>
                    <button onClick={() => setActiveTab('metrics')} className={`px-1 py-2 font-semibold text-sm ${activeTab === 'metrics' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>Core Metrics</button>
                    <button onClick={() => setActiveTab('strategies')} className={`px-1 py-2 font-semibold text-sm ${activeTab === 'strategies' ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400' : 'text-text-subtle'}`}>Strategies</button>
                </div>
            </div>

            {activeTab === 'priority' && (
                <div className="space-y-4 animate-fadeIn">
                    <p className="text-xs text-text-subtle">This is Vmind's default "smart sort". It combines multiple factors to find the words that need your attention most urgently. A higher score means a higher priority.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <MetricDetail icon="trophy" title="Mastery" weight="30%">
                            Gives lower priority to words you've already mastered (high Rank Point & Level). This lets you focus on newer, less familiar vocabulary.
                        </MetricDetail>
                        <MetricDetail icon="error-circle" title="Difficulty" weight="20%">
                            Prioritizes words you frequently get wrong (high Failure Rate). This helps you conquer your "trouble words".
                        </MetricDetail>
                        <MetricDetail icon="clock" title="Spaced Repetition" weight="20%">
                            Boosts the priority of words you haven't seen in a while, fighting the "forgetting curve". A word unseen for 10+ days gets max priority.
                        </MetricDetail>
                        <MetricDetail icon="fire" title="Urgency" weight="20%">
                            Strongly prioritizes words that were in a session you quit. This ensures you don't accidentally skip words by ending a session early.
                        </MetricDetail>
                         <MetricDetail icon="arrows-right-left" title="Fairness" weight="10%">
                            Ensures all words, even easy ones, get reviewed eventually by prioritizing those that have appeared in fewer sessions.
                        </MetricDetail>
                    </div>
                </div>
            )}
            
            {activeTab === 'metrics' && (
                 <div className="space-y-3 animate-fadeIn">
                    <p className="text-xs text-text-subtle">Take control of your learning by sorting by a specific metric. This is great for targeted drills.</p>
                     <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Last Practiced (Ascending)</h4>
                        <p className="text-xs text-text-subtle mt-1">
                            <strong className="text-primary-600 dark:text-primary-400">Use this to:</strong> Quickly review words you haven't seen in a long time. Perfect for "dusting off the cobwebs".
                        </p>
                    </div>
                     <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Success Rate (Ascending) or Failed (Descending)</h4>
                        <p className="text-xs text-text-subtle mt-1">
                            <strong className="text-primary-600 dark:text-primary-400">Use this to:</strong> Create a focused drill on your most difficult words.
                        </p>
                    </div>
                     <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Rank Point (Ascending)</h4>
                        <p className="text-xs text-text-subtle mt-1">
                            <strong className="text-primary-600 dark:text-primary-400">Use this to:</strong> Review words you are just beginning to learn and haven't mastered yet.
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'strategies' && (
                 <div className="space-y-3 animate-fadeIn">
                    <p className="text-xs text-text-subtle">Combine sorting and modes for powerful, targeted sessions. Here are a few recipes:</p>
                    <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Recipe: The "Weakest Links" Drill</h4>
                        <p className="text-xs text-text-subtle mt-1">
                            <strong>Goal:</strong> Hammer down on words you consistently get wrong.
                        </p>
                        <ul className="mt-2 space-y-1 text-xs">
                           <li><strong className="w-20 inline-block">Sort by:</strong> `Success Rate` (Ascending)</li>
                           <li><strong className="w-20 inline-block">Modes:</strong> `Typing`</li>
                        </ul>
                    </div>
                     <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Recipe: "Dust Off the Cobwebs" Review</h4>
                        <p className="text-xs text-text-subtle mt-1">
                           <strong>Goal:</strong> Quickly refresh old vocabulary you haven't seen in ages.
                        </p>
                        <ul className="mt-2 space-y-1 text-xs">
                           <li><strong className="w-20 inline-block">Sort by:</strong> `Last Practiced` (Ascending)</li>
                           <li><strong className="w-20 inline-block">Modes:</strong> `Multiple Choice`</li>
                        </ul>
                    </div>
                     <div className="p-3 bg-secondary-100 dark:bg-secondary-900/50 rounded-lg">
                        <h4 className="font-semibold text-text-main dark:text-secondary-100">Recipe: The Balanced Daily Driver (Default)</h4>
                         <p className="text-xs text-text-subtle mt-1">
                           <strong>Goal:</strong> Let Vmind's AI create a balanced session for consistent, daily progress.
                        </p>
                         <ul className="mt-2 space-y-1 text-xs">
                           <li><strong className="w-20 inline-block">Sort by:</strong> `Priority Score` (Descending)</li>
                           <li><strong className="w-20 inline-block">Modes:</strong> All, Randomized</li>
                        </ul>
                    </div>
                </div>
            )}

        </div>
    );
}

const QuizContent: React.FC<{
    answers: (number | null)[];
    showResults: boolean;
    onAnswerSelect: (qIndex: number, oIndex: number) => void;
}> = ({ answers, showResults, onAnswerSelect }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-bold text-primary-600 dark:text-primary-400">Check Your Understanding</h3>
        {quizQuestions.map((q, qIndex) => (
            <div key={qIndex}>
                <p className="font-semibold mb-2 text-text-main dark:text-secondary-100">{qIndex + 1}. {q.question}</p>
                <div className="space-y-2">
                    {q.options.map((option, oIndex) => {
                        const isSelected = answers[qIndex] === oIndex;
                        let resultClass = '';
                        if (showResults) {
                            if (oIndex === q.correctAnswer) {
                                resultClass = 'bg-success-100 dark:bg-success-900/40 border-success-500 ring-2 ring-success-500/50';
                            } else if (isSelected) {
                                resultClass = 'bg-error-100 dark:bg-error-900/40 border-error-500';
                            }
                        }
                        return (
                            <button
                                key={oIndex}
                                onClick={() => !showResults && onAnswerSelect(qIndex, oIndex)}
                                className={`w-full text-left p-3 text-sm rounded-lg border-2 transition-colors ${isSelected && !showResults ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20' : 'border-transparent bg-secondary-100 dark:bg-secondary-900/50'} ${resultClass}`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
                 {showResults && (
                    <div className="mt-2 p-2 text-xs bg-secondary-100 dark:bg-secondary-900/50 rounded text-text-subtle">
                       <strong>Explanation:</strong> {q.explanation}
                    </div>
                )}
            </div>
        ))}
    </div>
);

const StudyGuideModal: React.FC<StudyGuideModalProps> = ({ isOpen, onClose }) => {
    const [step, setStep] = React.useState(0); // 0: Guide, 1: Quiz, 2: Results
    const [answers, setAnswers] = React.useState<(number | null)[]>(Array(quizQuestions.length).fill(null));
    const [showResults, setShowResults] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setStep(0);
            setAnswers(Array(quizQuestions.length).fill(null));
            setShowResults(false);
        }
    }, [isOpen]);

    const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[questionIndex] = optionIndex;
            return newAnswers;
        });
    };
    
    const score = answers.reduce((acc, answer, index) => {
        return acc + (answer === quizQuestions[index].correctAnswer ? 1 : 0);
    }, 0);
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Study Session Guide" containerClassName="max-w-3xl w-full">
            <div className="p-4 sm:p-6">
                {step === 0 && <GuideContent />}
                {step >= 1 && <QuizContent answers={answers} showResults={showResults} onAnswerSelect={handleAnswerSelect} />}
            </div>
            <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 border-t border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
                {step === 1 && showResults ? (
                     <p className="font-bold text-primary-600 dark:text-primary-400">Your Score: {score} / {quizQuestions.length}</p>
                ) : <div />}
                
                <div className="flex gap-2 ml-auto">
                    {step === 0 && <Button onClick={() => setStep(1)}>Test Your Knowledge →</Button>}
                    {step === 1 && !showResults && <Button onClick={() => setShowResults(true)} disabled={answers.includes(null)}>Check Answers</Button>}
                    {step === 1 && showResults && <Button onClick={onClose}>Finish</Button>}
                    {step === 1 && <Button variant="secondary" onClick={() => setStep(0)}>← Back to Guide</Button>}
                </div>
            </div>
        </Modal>
    );
};

export default StudyGuideModal;