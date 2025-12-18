
import * as React from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { Button } from './Button';

interface BlockingSaveOverlayProps {
  isVisible: boolean;
  status: 'saving' | 'idle' | 'error' | 'offline' | 'saved' | 'paused';
  pendingCount: number;
  onForceExit: () => void;
}

const BlockingSaveOverlay: React.FC<BlockingSaveOverlayProps> = ({ isVisible, status, pendingCount, onForceExit }) => {
  const [showForceExit, setShowForceExit] = React.useState(false);

  // If sync takes too long (> 5 seconds) or errors, allow user to force exit (saving to offline DB)
  React.useEffect(() => {
    let timer: number;
    if (isVisible) {
      setShowForceExit(false);
      if (status === 'error' || status === 'offline') {
          setShowForceExit(true);
      } else {
          timer = window.setTimeout(() => setShowForceExit(true), 5000);
      }
    }
    return () => clearTimeout(timer);
  }, [isVisible, status]);

  if (!isVisible) return null;

  const getStatusMessage = () => {
    if (status === 'error' || status === 'offline') return "Network unavailable. Saving to device...";
    if (pendingCount > 0) return `Syncing ${pendingCount} changes to cloud...`;
    return "Finishing up...";
  };

  const overlayContent = (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn p-4">
      <div className="bg-surface dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="mb-6 relative">
             {status === 'error' || status === 'offline' ? (
                 <div className="w-16 h-16 bg-warning-100 dark:bg-warning-900/30 rounded-full flex items-center justify-center mx-auto text-warning-500 animate-pulse">
                     <Icon name="cloud-rain" className="w-8 h-8" />
                 </div>
             ) : (
                <div className="w-16 h-16 mx-auto">
                     <svg className="animate-spin w-full h-full text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
             )}
        </div>
        
        <h3 className="text-xl font-bold text-text-main dark:text-secondary-100 mb-2">
            {status === 'saved' ? 'All Saved!' : 'Saving Changes'}
        </h3>
        <p className="text-text-subtle mb-6">
            {getStatusMessage()}
        </p>

        <div className={`transition-opacity duration-500 ${showForceExit ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <Button onClick={onForceExit} variant="secondary" className="w-full">
                {status === 'error' ? 'Save Locally & Exit' : 'Taking too long? Skip Wait'}
            </Button>
            <p className="text-[10px] text-text-subtle mt-2">
                Your data is safe in the local queue and will sync when possible.
            </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
};

export default BlockingSaveOverlay;
