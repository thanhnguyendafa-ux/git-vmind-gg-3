import React from 'react';
import Modal from './Modal';
import { Button, ButtonProps } from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
  confirmVariant?: ButtonProps['variant'];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmText = 'Confirm',
  confirmVariant = 'destructive',
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-text-subtle mb-4">{message}</p>
        
        {warning && (
          <div className="bg-error-500/10 dark:bg-error-900/20 p-3 rounded-md mb-6">
            <p className="text-sm text-error-700 dark:text-error-300">
              <strong>Warning:</strong> {warning}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button 
            variant="secondary"
            onClick={onClose} 
          >
            Cancel
          </Button>
          <Button 
            variant={confirmVariant}
            onClick={onConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;