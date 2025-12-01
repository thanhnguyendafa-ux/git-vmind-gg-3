import * as React from 'react';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  containerClassName?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, containerClassName }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 grid place-items-center z-50 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`bg-surface dark:bg-secondary-800 rounded-lg shadow-xl border border-secondary-200 dark:border-secondary-700 animate-slideInUp flex flex-col max-h-[90vh] ${containerClassName || 'w-full max-w-md m-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-text-main dark:text-secondary-100">{title}</h2>
          <button onClick={onClose} className="text-secondary-400 hover:text-text-main dark:hover:text-secondary-100 transition-colors">
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;