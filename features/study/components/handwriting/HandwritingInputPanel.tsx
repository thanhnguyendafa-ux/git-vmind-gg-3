
import React, { useState } from 'react';
import HandwritingCanvas from './HandwritingCanvas';
import CandidateBar from './CandidateBar';
import { useHandwritingRecognition } from '../../hooks/useHandwritingRecognition';
import Icon from '../../../../components/ui/Icon';

interface HandwritingInputPanelProps {
  onSelectCharacter: (char: string) => void;
  expectedAnswer?: string; // Used for "context-aware" recognition
}

const HandwritingInputPanel: React.FC<HandwritingInputPanelProps> = ({ onSelectCharacter, expectedAnswer }) => {
  const { candidates, recognize, isRecognizing, clearCandidates } = useHandwritingRecognition(expectedAnswer);
  
  // Force re-render of canvas to clear it by changing key
  const [canvasKey, setCanvasKey] = useState(0);

  const handleStrokeEnd = (strokes: { x: number; y: number }[][]) => {
    recognize(strokes);
  };

  const handleSelect = (char: string) => {
    onSelectCharacter(char);
    handleClear(); // Auto-clear after selection for continuous writing
  };

  const handleClear = () => {
    setCanvasKey(prev => prev + 1);
    clearCandidates();
  };

  return (
    <div className="w-full animate-fadeIn pb-2">
       
       <div className="flex flex-col lg:flex-row items-start justify-center gap-4">
           {/* Canvas Container */}
           <div className="relative w-full max-w-[300px] flex-shrink-0 mx-auto lg:mx-0">
              <HandwritingCanvas 
                 key={canvasKey}
                 width={300} 
                 height={220} // Reduced from 300 for mobile optimization
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

           {/* Suggestions Container (Sidebar on Desktop, Bottom bar on Mobile) */}
           <div className="w-full max-w-[300px] lg:max-w-none lg:w-auto flex-grow-0 mx-auto lg:mx-0">
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
