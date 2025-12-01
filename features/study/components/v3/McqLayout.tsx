
import React from 'react';
import { Button } from '../../../../components/ui/Button';

interface McqLayoutProps {
  options: string[];
  onSelect: (option: string) => void;
}

const McqLayout: React.FC<McqLayoutProps> = ({ options, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full animate-fadeIn">
      {options.map((option, index) => (
        <Button 
          key={index} 
          variant="secondary"
          onClick={() => onSelect(option)}
          className="h-auto py-4 text-base justify-start text-left px-4 shadow-sm hover:shadow-md transition-all duration-200 border-2 border-transparent hover:border-primary-500/50"
        >
          <span className="font-semibold mr-2 opacity-50">{String.fromCharCode(65 + index)}.</span>
          {option}
        </Button>
      ))}
    </div>
  );
};

export default McqLayout;
