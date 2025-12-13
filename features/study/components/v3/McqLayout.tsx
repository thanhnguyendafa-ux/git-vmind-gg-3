
import React from 'react';
import { Button } from '../../../../components/ui/Button';
import { playSpeech, stopSpeech } from '../../../../services/audioService';

interface McqLayoutProps {
  options: string[];
  onSelect: (option: string) => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
}

const McqLayout: React.FC<McqLayoutProps> = ({ options, onSelect, isImmersive, isSidebar }) => {
  // If in sidebar mode (desktop right panel), use a single column stack for better readability.
  // Otherwise, use the responsive grid.
  const gridClasses = isSidebar
    ? "grid grid-cols-1 gap-3 w-full animate-fadeIn"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full animate-fadeIn";

  const buttonBaseClasses = "h-auto justify-start items-start text-left whitespace-normal px-4 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary-500/50";
  
  const buttonSizeClasses = isImmersive ? "py-6 text-lg" : "py-3 text-base";

  return (
    <div className={gridClasses}>
      {options.map((option, index) => (
        <Button 
          key={index} 
          variant="secondary"
          onClick={() => onSelect(option)}
          onMouseEnter={() => {
            stopSpeech();
            playSpeech(option);
          }}
          className={`${buttonBaseClasses} ${buttonSizeClasses}`}
        >
          <span className="font-semibold mr-2 opacity-50 flex-shrink-0">{String.fromCharCode(65 + index)}.</span>
          <span>{option}</span>
        </Button>
      ))}
    </div>
  );
};

export default McqLayout;
