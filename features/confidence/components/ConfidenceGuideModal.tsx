
import * as React from 'react';
import Modal from '../../../components/ui/Modal';

interface ConfidenceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfidenceGuideModal: React.FC<ConfidenceGuideModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How Confidence Works">
        <div className="p-6 space-y-4 text-text-main dark:text-secondary-200 leading-relaxed">
            <p>
                <strong>Confidence</strong> is an In-Session Spaced Repetition System. Unlike Anki which schedules cards over days, Confidence is designed for immediate, short-term mastery loops within a single session.
            </p>
            
            <div className="bg-secondary-100 dark:bg-secondary-800/50 p-4 rounded-lg border-l-4 border-warning-500">
                <h4 className="font-bold mb-2">The Queue System</h4>
                <p>
                    All your cards are in a single line. When you review a card, it is shuffled back into the line based on your rating.
                </p>
            </div>

            <h4 className="font-bold text-sm uppercase text-text-subtle">Fibonacci Intervals</h4>
            <ul className="list-disc list-inside space-y-2 ml-2 text-sm">
                <li><span className="text-error-500 font-bold">Again:</span> +3 spots. You'll see it again very soon.</li>
                <li><span className="text-orange-500 font-bold">Hard:</span> +5 spots.</li>
                <li><span className="text-warning-500 font-bold">Good:</span> +8 spots.</li>
                <li><span className="text-success-500 font-bold">Easy:</span> +13 spots.</li>
                <li><span className="text-info-500 font-bold">Perfect:</span> +21 spots.</li>
                <li><span className="text-purple-500 font-bold">Superb:</span> +34 spots. Mastery!</li>
            </ul>
            
            <p>
                This logic ensures that cards you struggle with stay near the front of the queue for frequent drilling, while easy cards drift to the back, appearing less often.
            </p>
            
            <p className="text-sm text-text-subtle italic mt-4">
                Tip: You can customize these specific jump intervals in the Settings for each set.
            </p>
        </div>
    </Modal>
  );
};

export default ConfidenceGuideModal;
