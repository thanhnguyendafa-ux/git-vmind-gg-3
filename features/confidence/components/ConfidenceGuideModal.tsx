
import * as React from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

interface ConfidenceGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const QUIZ_QUESTIONS = [
    {
        question: "If you select 'Again' for a card in Confidence mode, what happens?",
        options: [
            "It gets deleted from the set.",
            "It is scheduled for review tomorrow (24h later).",
            "It is inserted near the front of the queue (e.g., +3 spots) to review immediately.",
            "It is marked as 'Mastered'."
        ],
        correctAnswer: 2,
        explanation: "Confidence is a short-term mastery loop. 'Again' means you need to see it again within this specific session, usually within a few minutes."
    },
    {
        question: "When should you use Confidence instead of Anki?",
        options: [
            "When you want to remember words for 10 years.",
            "When you want to 'cram' or master a list completely in one sitting.",
            "When you only want to see each word exactly once.",
            "When you want to export data to a CSV."
        ],
        correctAnswer: 1,
        explanation: "Confidence optimizes for the 'Mastery Loop'—repeating until you know it now. Anki optimizes for long-term retention over days and months."
    },
    {
        question: "Where is the queue position (progress) of a Confidence Set saved?",
        options: [
            "It is not saved; it resets when you close the browser.",
            "It changes the due date in your Anki deck.",
            "It is saved specifically within that Confidence Set.",
            "It is sent to your email."
        ],
        correctAnswer: 2,
        explanation: "Each Confidence Set remembers exactly where every card is in the line. You can pause and resume later without losing the specific order of your 'trouble words'."
    }
];

const GuideView: React.FC<{ onTakeQuiz: () => void }> = ({ onTakeQuiz }) => (
    <div className="space-y-8 animate-fadeIn">
        {/* Slide 1: Mechanics */}
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <Icon name="stack-of-cards" className="w-5 h-5" />
                <h3 className="font-bold text-lg">Mastery Loop: The Living Queue</h3>
            </div>
            <div className="bg-secondary-50 dark:bg-secondary-800/50 p-4 rounded-xl border border-secondary-200 dark:border-secondary-700">
                <p className="text-sm text-text-main dark:text-secondary-200 leading-relaxed">
                    Imagine a deck of cards in your hand. When you draw a card:
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-error-500 font-bold whitespace-nowrap">If 'Again':</span>
                        <span className="text-text-subtle">You slip it back near the top (e.g., 3 cards down). You will see it again almost immediately.</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-info-500 font-bold whitespace-nowrap">If 'Perfect':</span>
                        <span className="text-text-subtle">You push it deep to the bottom (e.g., 20 cards down). You won't see it until you've handled the harder cards.</span>
                    </li>
                </ul>
                <p className="mt-3 text-sm font-semibold text-primary-600 dark:text-primary-400">
                    Goal: Push all cards to the back of the line until you feel confident.
                </p>
            </div>
        </section>

        {/* Slide 2: Comparison */}
        <section className="space-y-3">
            <h3 className="font-bold text-lg text-text-main dark:text-secondary-100">Confidence vs. Anki vs. Queue</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 bg-warning-50 dark:bg-warning-900/10 border border-warning-200 dark:border-warning-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-warning-700 dark:text-warning-400">
                        <Icon name="stack-of-cards" className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wide">Confidence</span>
                    </div>
                    <p className="text-xs font-bold mb-1">Cramming / Mastery</p>
                    <p className="text-[11px] text-text-subtle">"I want to memorize these 50 words <em>tonight</em>."</p>
                </div>

                <div className="p-3 bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-sky-700 dark:text-sky-400">
                        <Icon name="brain" className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wide">Anki SRS</span>
                    </div>
                    <p className="text-xs font-bold mb-1">Long-term Memory</p>
                    <p className="text-[11px] text-text-subtle">"I want to never forget this word in my life."</p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                        <Icon name="progress-arrows" className="w-4 h-4" />
                        <span className="font-bold text-xs uppercase tracking-wide">Queue</span>
                    </div>
                    <p className="text-xs font-bold mb-1">One-off Review</p>
                    <p className="text-[11px] text-text-subtle">"I just want to check if I know these words."</p>
                </div>
            </div>
        </section>

        {/* Slide 3: Data */}
        <section className="space-y-3">
            <h3 className="font-bold text-lg text-text-main dark:text-secondary-100">What happens when I rate?</h3>
            <div className="text-sm text-text-subtle space-y-2">
                <p>
                    <strong className="text-text-main dark:text-secondary-100">Queue Position:</strong> Saved locally in this specific Confidence Set. You can pause and resume exactly where you left off.
                </p>
                <p>
                    <strong className="text-text-main dark:text-secondary-100">Global Stats:</strong> Correct/Incorrect counts and Success Rate are updated on the original Table. This improves the algorithms for features like "Smart Sort".
                </p>
            </div>
        </section>

        <div className="pt-4 flex justify-center">
            <Button size="lg" onClick={onTakeQuiz} className="shadow-lg hover:scale-105 transition-transform">
                Take the Quiz
            </Button>
        </div>
    </div>
);

const QuizView: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [score, setScore] = React.useState(0);
    const [selectedOption, setSelectedOption] = React.useState<number | null>(null);
    const [isFinished, setIsFinished] = React.useState(false);
    const [shake, setShake] = React.useState(false);

    const question = QUIZ_QUESTIONS[currentIndex];
    const isAnswered = selectedOption !== null;
    const isCorrect = selectedOption === question.correctAnswer;

    const handleSelect = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
        if (index === question.correctAnswer) {
            setScore(s => s + 1);
        } else {
            setShake(true);
            setTimeout(() => setShake(false), 500);
        }
    };

    const handleNext = () => {
        if (currentIndex < QUIZ_QUESTIONS.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
        } else {
            setIsFinished(true);
        }
    };

    if (isFinished) {
        const isPerfect = score === QUIZ_QUESTIONS.length;
        return (
            <div className="flex flex-col items-center justify-center py-12 animate-fadeIn text-center">
                <div className={`p-4 rounded-full mb-4 ${isPerfect ? 'bg-success-100 text-success-600' : 'bg-warning-100 text-warning-600'}`}>
                    <Icon name={isPerfect ? "trophy" : "check-circle"} className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-text-main dark:text-secondary-100 mb-2">
                    {isPerfect ? "Expert Status!" : "Quiz Completed"}
                </h3>
                <p className="text-text-subtle mb-6">You scored {score} out of {QUIZ_QUESTIONS.length}.</p>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => { setCurrentIndex(0); setScore(0); setSelectedOption(null); setIsFinished(false); }}>Retake Quiz</Button>
                    <Button onClick={onClose}>{isPerfect ? "Start Studying" : "Close"}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-6 animate-fadeIn ${shake ? 'animate-shake' : ''}`}>
            <div className="flex justify-between items-center text-xs font-bold text-text-subtle uppercase tracking-wider">
                <span>Question {currentIndex + 1} / {QUIZ_QUESTIONS.length}</span>
                <span>Score: {score}</span>
            </div>

            <h3 className="text-lg font-bold text-text-main dark:text-secondary-100">{question.question}</h3>

            <div className="space-y-2">
                {question.options.map((opt, idx) => {
                    let stateClass = "border-transparent bg-secondary-50 dark:bg-secondary-800 hover:bg-secondary-100 dark:hover:bg-secondary-700";
                    if (isAnswered) {
                        if (idx === question.correctAnswer) {
                            stateClass = "border-success-500 bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-300";
                        } else if (idx === selectedOption) {
                            stateClass = "border-error-500 bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300";
                        } else {
                            stateClass = "border-transparent opacity-50";
                        }
                    }

                    return (
                        <button
                            key={idx}
                            onClick={() => handleSelect(idx)}
                            disabled={isAnswered}
                            className={`w-full text-left p-4 rounded-lg border-2 text-sm transition-all duration-200 ${stateClass}`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>

            {isAnswered && (
                <div className="bg-secondary-100 dark:bg-secondary-800/50 p-4 rounded-lg animate-slideInUp">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name={isCorrect ? "check-circle" : "info"} className={`w-4 h-4 ${isCorrect ? 'text-success-500' : 'text-primary-500'}`} />
                        <span className="font-bold text-sm text-text-main dark:text-secondary-100">{isCorrect ? 'Correct!' : 'Explanation'}</span>
                    </div>
                    <p className="text-sm text-text-subtle">{question.explanation}</p>
                    <div className="mt-4 flex justify-end">
                        <Button onClick={handleNext}>
                            {currentIndex < QUIZ_QUESTIONS.length - 1 ? "Next Question" : "Finish Quiz"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

const ShortcutsView: React.FC = () => (
    <div className="space-y-6 animate-fadeIn pb-4">
        {/* Navigation & Control */}
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <Icon name="command-line" className="w-5 h-5" />
                <h3 className="font-bold text-lg">General Control</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-xl border border-secondary-200 dark:border-secondary-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Smart Escape (Close Popups / End Session)</span>
                        <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Esc</kbd>
                    </div>
                </div>
            </div>
        </section>

        {/* Answering Phase */}
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <Icon name="chat-bubble-left-right" className="w-5 h-5" />
                <h3 className="font-bold text-lg">Answering Questions</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-xl border border-secondary-200 dark:border-secondary-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Select Option A / False / Focus Typing</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">1</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Select Option B / True</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">2</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Select Option C / D</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">3</kbd>
                            <span>/</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">4</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Evaluation Phase */}
        <section className="space-y-3">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <Icon name="star" className="w-5 h-5" />
                <h3 className="font-bold text-lg">Rating & Review</h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
                <div className="p-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-xl border border-secondary-200 dark:border-secondary-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Rate Card (Again to Superb)</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5, 6].map(k => (
                                <kbd key={k} className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">{k}</kbd>
                            ))}
                        </div>
                    </div>
                    <div className="h-px bg-secondary-200 dark:bg-secondary-700 my-2" />
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Edit Card Detail</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">5</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">View Card Info</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">6</kbd>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">Relation Settings</span>
                        <div className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">Ctrl</kbd>
                            <span>+</span>
                            <kbd className="px-2 py-1 bg-surface dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded text-xs font-bold shadow-sm">7</kbd>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <p className="text-xs text-text-subtle italic text-center mt-4">
            * Note: Answering shortcuts work only before revealing. Rating shortcuts work only after revealing.
        </p>
    </div>
);

const ConfidenceGuideModal: React.FC<ConfidenceGuideModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = React.useState<'guide' | 'shortcuts' | 'quiz'>('guide');

    // Reset tab when modal opens
    React.useEffect(() => {
        if (isOpen) setActiveTab('guide');
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confidence Mode Guide" containerClassName="max-w-3xl w-full max-h-[90vh]">
            <div className="flex flex-col h-full">
                <div className="flex border-b border-secondary-200 dark:border-secondary-700 px-6 pt-2 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('guide')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'guide'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-text-subtle hover:text-text-main'
                            }`}
                    >
                        Guide
                    </button>
                    <button
                        onClick={() => setActiveTab('shortcuts')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'shortcuts'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-text-subtle hover:text-text-main'
                            }`}
                    >
                        Shortcuts
                    </button>
                    <button
                        onClick={() => setActiveTab('quiz')}
                        className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${activeTab === 'quiz'
                            ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                            : 'border-transparent text-text-subtle hover:text-text-main'
                            }`}
                    >
                        Quiz
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {activeTab === 'guide' ? (
                        <GuideView onTakeQuiz={() => setActiveTab('quiz')} />
                    ) : activeTab === 'shortcuts' ? (
                        <ShortcutsView />
                    ) : (
                        <QuizView onClose={onClose} />
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ConfidenceGuideModal;
