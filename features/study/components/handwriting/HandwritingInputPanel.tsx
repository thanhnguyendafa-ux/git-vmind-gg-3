
import React, { useState } from 'react';
import HandwritingCanvas from './HandwritingCanvas';
import CandidateBar from './CandidateBar';
import { useHandwritingRecognition } from '../../hooks/useHandwritingRecognition';
import Icon from '../../../../components/ui/Icon';

interface HandwritingInputPanelProps {
  onSelectCharacter: (char: string) => void;
  expectedAnswer?: string;
  isSidebar?: boolean;
}

const HandwritingInputPanel: React.FC<HandwritingInputPanelProps> = ({ onSelectCharacter, expectedAnswer, isSidebar }) => {
  const { candidates, recognize, isRecognizing, clearCandidates } = useHandwritingRecognition(expectedAnswer);
  const [canvasKey, setCanvasKey] = useState(0);

  const handleStrokeEnd = (strokes: { x: number; y: number }[][]) => {
    recognize(strokes);
  };

  const handleSelect = (char: string) => {
    onSelectCharacter(char);
    handleClear(); 
  };

  const handleClear = () => {
    setCanvasKey(prev => prev + 1);
    clearCandidates();
  };

  // Dynamically size for sidebar context
  const canvasSize = isSidebar ? 280 : 300;
  const layoutClass = isSidebar ? "flex flex-col gap-3" : "flex flex-col lg:flex-row items-start justify-center gap-4";
  const wrapperClass = isSidebar ? "w-full flex justify-center" : "relative w-full max-w-[300px] flex-shrink-0 mx-auto lg:mx-0";

  return (
    <div className="w-full animate-fadeIn pb-2">
       <div className={layoutClass}>
           {/* Canvas Container */}
           <div className={wrapperClass}>
              <div className="relative">
                  <HandwritingCanvas 
                     key={canvasKey}
                     width={canvasSize} 
                     height={canvasSize * 0.75} // Aspect ratio 4:3
                     onStrokeEnd={handleStrokeEnd} 
                  />
                  
                  <div className="absolute top-2 right-2 flex flex-col gap-2">
                     <button 
                        onClick={handleClear} 
                        className="p-1.5 bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-full shadow-sm hover:bg-white dark:hover:bg-black/60 text-text-subtle transition-colors"
                        title="Clear Canvas"
                     >
                        <Icon name="trash" className="w-4 h-4" />
                     </button>
                  </div>
              </div>
           </div>

           {/* Suggestions Container */}
           <div className={`w-full ${isSidebar ? '' : 'max-w-[300px] lg:max-w-none lg:w-auto flex-grow-0 mx-auto lg:mx-0'}`}>
               <CandidateBar 
                  candidates={candidates} 
                  isLoading={isRecognizing} 
                  onSelect={handleSelect} 
               />
           </div>
       </div>
       
       <div className="text-center text-[10px] text-text-subtle uppercase tracking-wider opacity-70 mt-3">
          Write one character
       </div>
    </div>
  );
};

export default HandwritingInputPanel;
