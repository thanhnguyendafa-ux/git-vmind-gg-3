
import * as React from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  containerClassName?: string;
  fullScreen?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, containerClassName, fullScreen = false }) => {
  if (!isOpen) return null;

  const titleId = `modal-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // When fullScreen is enabled:
  // 1. Remove padding from the overlay flex container (p-0)
  // 2. Remove rounding and width constraints from the modal container
  // 3. Force full viewport height/width
  const overlayPaddingClass = fullScreen ? 'p-0' : 'p-0 sm:p-4';
  const overlayAlignClass = fullScreen ? '' : 'sm:items-center';
  const defaultContainerClass = fullScreen
    ? 'w-screen h-[100dvh] max-w-none rounded-none shadow-none'
    : 'sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl border-t border-x sm:border';

  const modalContent = (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] flex items-end justify-center animate-fadeIn ${overlayAlignClass} ${overlayPaddingClass}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={`
            bg-surface dark:bg-secondary-800 
            border-border dark:border-secondary-700 
            flex flex-col 
            w-full
            ${!fullScreen ? 'sm:w-auto max-h-[100dvh]' : ''}
            animate-slideInUp
            ${containerClassName || defaultContainerClass}
        `}
        onClick={(e) => e.stopPropagation()}
        style={!fullScreen ? { boxShadow: '0 25px 50px -12px var(--shadow-color, rgba(0,0,0,0.25))' } : undefined}
      >
        {/* Mobile Handle - Hide in fullScreen mode */}
        {!fullScreen && <div className="w-12 h-1.5 bg-secondary-300 dark:bg-secondary-600 rounded-full mx-auto mt-3 mb-1 sm:hidden" />}

        {/* Header - Conditionally rendered or styled based on fullscreen preference, but kept standard here for consistency */}
        <div className={`flex justify-between items-center p-4 ${fullScreen ? 'md:hidden' : 'sm:p-6'} border-b border-border dark:border-secondary-700 flex-shrink-0`}>
          <h2 id={titleId} className="text-xl font-bold text-text-main dark:text-secondary-100 truncate pr-4">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-text-subtle hover:text-text-main dark:hover:text-secondary-100 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors -mr-2"
            aria-label="Close"
          >
            <Icon name="x" className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
