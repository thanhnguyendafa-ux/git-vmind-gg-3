
import React, { useState, useMemo } from 'react';
import Modal from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import Icon from '../../../components/ui/Icon';

interface ManualJumpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (interval: number) => void;
  queueLength: number;
}

const ManualJumpModal: React.FC<ManualJumpModalProps> = ({ isOpen, onClose, onConfirm, queueLength }) => {
  const [inputValue, setInputValue] = useState('');
  
  // Maximum possible jump is to the end of the queue (index N-1)
  // If current is 0, max jump is queueLength - 1.
  const maxJump = Math.max(0, queueLength - 1);

  const { status, message, effectiveJump } = useMemo(() => {
    const num = parseInt(inputValue, 10);
    
    if (!inputValue || isNaN(num)) {
        return { status: 'empty', message: 'Enter a number to jump forward.', effectiveJump: 0 };
    }

    if (num <= 0) {
        return { status: 'error', message: 'Please enter a positive number.', effectiveJump: 0 };
    }

    if (num > maxJump) {
        return { 
            status: 'warning', 
            message: `Jump exceeds queue length. Will move to the end (+${maxJump}).`, 
            effectiveJump: maxJump 
        };
    }

    return { 
        status: 'valid', 
        message: `New Position: +${num} spots`, 
        effectiveJump: num 
    };

  }, [inputValue, maxJump]);

  const handleConfirm = () => {
    if (status === 'error' || status === 'empty') return;
    onConfirm(effectiveJump);
    setInputValue('');
  };

  const getFeedbackStyles = () => {
    switch (status) {
        case 'error':
            return 'bg-error-50 text-error-700 border-error-200 dark:bg-error-900/20 dark:text-error-300 dark:border-error-800';
        case 'warning':
            return 'bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-300 dark:border-warning-800';
        case 'valid':
            return 'bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-300 dark:border-success-800';
        default:
            return 'bg-secondary-100 text-text-subtle border-secondary-200 dark:bg-secondary-800 dark:text-secondary-400 dark:border-secondary-700';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manual Jump" containerClassName="max-w-sm w-full">
      <div className="p-6 space-y-4">
        <div>
            <label htmlFor="jump-input" className="block text-sm font-medium text-text-main dark:text-secondary-200 mb-1">
                Spots to jump
            </label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle font-bold">+</span>
                <Input
                    id="jump-input"
                    type="number"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="pl-7 font-mono"
                    placeholder="0"
                    autoFocus
                    min={1}
                />
            </div>
        </div>

        <div className={`p-3 rounded-md border text-sm flex items-start gap-2 ${getFeedbackStyles()}`}>
            <Icon name={status === 'error' ? 'error-circle' : (status === 'valid' ? 'check-circle' : 'circle-outline')} className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{message}</span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
                onClick={handleConfirm} 
                disabled={status === 'error' || status === 'empty'}
                className={status === 'warning' ? 'bg-warning-600 hover:bg-warning-700 text-white' : ''}
            >
                {status === 'warning' ? `Jump +${effectiveJump}` : 'Jump'}
            </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualJumpModal;
