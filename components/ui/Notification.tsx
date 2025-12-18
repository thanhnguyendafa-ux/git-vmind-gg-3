import * as React from 'react';
import Icon from './Icon';

interface NotificationProps {
  message: string;
  icon: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, icon, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className="fixed bottom-5 right-5 z-50 animate-slideInUp"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-4 bg-success-600 text-white font-bold py-3 px-5 rounded-xl shadow-2xl border border-success-500 dark:border-success-500">
        <img 
            src={icon} 
            alt={message}
            className="w-8 h-8 object-contain"
        />
        <div>
          <p className="text-sm font-bold">Badge Unlocked!</p>
          <p className="text-sm font-normal">{message}</p>
        </div>
        <button onClick={onClose} className="p-3 -m-3 ml-1 rounded-full text-success-200 hover:text-white">
          <Icon name="x" className="w-5 h-5"/>
        </button>
      </div>
    </div>
  );
};

export default Notification;