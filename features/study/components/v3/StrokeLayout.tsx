


import React, { useRef, useEffect, useState } from 'react';
import HanziWriter from 'hanzi-writer';
import { Button } from '../../../../components/ui/Button';
import Icon from '../../../../components/ui/Icon';
import { useUIStore } from '../../../../stores/useUIStore';
import { playStrokeCompleteSound, playSuccessSound, playErrorSound } from '../../../../services/soundService';

interface StrokeLayoutProps {
  character: string;
  meaning?: string;
  onComplete: () => void;
  isImmersive?: boolean;
  isSidebar?: boolean;
  hideMeaning?: boolean;
  onViewInfo?: () => void;
}

// Base size for compact mode
const COMPACT_SIZE = 240;

const StrokeLayout: React.FC<StrokeLayoutProps> = ({ character, meaning, onComplete, isImmersive, hideMeaning = false, onViewInfo }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particleContainerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<any>(null);
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shake, setShake] = useState(false);
  const { theme } = useUIStore();

  // --- Dynamic Resizing State ---
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false); // New: Minimize state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate dynamic size
  // Expanded: Max width of device minus padding, capped at 380px for larger screens
  const expandedSize = Math.min(windowWidth - 32, 380);
  const currentSize = isExpanded ? expandedSize : COMPACT_SIZE;

  const isDark = theme === 'dark';
  // Theme colors
  const strokeColor = isDark ? '#e2e8f0' : '#0f172a'; // slate-200 / slate-900
  const radicalColor = isDark ? '#38bdf8' : '#0ea5e9'; // sky-400 / sky-500
  const outlineColor = isDark ? '#334155' : '#cbd5e1'; // slate-700 / slate-300
  const highlightColor = isDark ? '#4ade80' : '#22c55e'; // green-400 / green-500

  // --- Particle Effect System ---
  const spawnParticles = (x: number, y: number) => {
      const container = particleContainerRef.current;
      if (!container) return;

      for (let i = 0; i < 8; i++) {
          const p = document.createElement('div');
          p.className = 'absolute w-1.5 h-1.5 bg-yellow-400 rounded-full pointer-events-none animate-ping';
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          
          // Random scatter
          const angle = Math.random() * Math.PI * 2;
          const dist = 10 + Math.random() * 20;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist;
          
          p.animate([
              { transform: 'translate(0,0) scale(1)', opacity: 1 },
              { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }
          ], {
              duration: 600,
              easing: 'ease-out'
          });
          
          container.appendChild(p);
          setTimeout(() => p.remove(), 600);
      }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (writerRef.current) {
        containerRef.current.innerHTML = '';
        writerRef.current = null;
    }
    
    setIsLoading(true);

    try {
        const writer = HanziWriter.create(containerRef.current, character, {
            width: currentSize,
            height: currentSize,
            padding: 15,
            showOutline: isGuideVisible,
            strokeAnimationSpeed: 2, // Faster feedback
            delayBetweenStrokes: 200,
            strokeColor: strokeColor,
            radicalColor: radicalColor,
            outlineColor: outlineColor,
            highlightColor: highlightColor,
            drawingWidth: 20, // Slightly thinner for smaller canvas
            showCharacter: false, 
            showHintAfterMisses: 3, // More forgiving before hint
            highlightOnComplete: true,
            charDataLoader: (char, onComplete) => {
                 fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${char}.json`)
                    .then(res => res.json())
                    .then(onComplete)
                    .catch(() => {
                        setIsLoading(false);
                    });
            },
            onLoadCharDataError: () => setIsLoading(false),
            onLoadCharDataSuccess: () => {
                setIsLoading(false);
                startQuiz(writer);
            }
        });

        writerRef.current = writer;

    } catch (e) {
        console.error("HanziWriter initialization failed", e);
        setIsLoading(false);
    }
  }, [character, isDark, isGuideVisible, currentSize]);

  // Handle Print Events to toggle visibility
  useEffect(() => {
    // 1. Listen for Custom "Pre-flight" Event from Orchestrator (fixes Race Condition)
    const handleVmindBeforePrint = () => {
         if (writerRef.current) {
            writerRef.current.showCharacter({ animation: { duration: 0 } });
        }
    };

    // 2. Listen for standard After Print (Cleanup)
    const handleAfterPrint = () => {
        if (writerRef.current) {
            // Restore quiz state (hide character)
            writerRef.current.hideCharacter({ animation: { duration: 0 } });
            // Re-start quiz to allow interaction again
            startQuiz(writerRef.current);
        }
    };

    window.addEventListener('vmind-before-print', handleVmindBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    
    return () => {
        window.removeEventListener('vmind-before-print', handleVmindBeforePrint);
        window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);


  const startQuiz = (writer: any) => {
      writer.quiz({
          onCorrectStroke: (data: any) => {
              playStrokeCompleteSound();
              // Calculate particle position based on stroke center or end?
              // HanziWriter data doesn't give easy coordinates of the stroke end.
              // We'll center the particles in the canvas or guess based on stroke index if possible.
              // For now, center burst is better than nothing, or random position within bounds.
              spawnParticles(currentSize / 2, currentSize / 2); 
          },
          onMistake: () => {
               playErrorSound();
               setShake(true);
               setTimeout(() => setShake(false), 400);
               if (navigator.vibrate) navigator.vibrate(50);
          },
          onComplete: (summary: any) => {
              playSuccessSound();
              setTimeout(() => {
                  onComplete();
              }, 1200); 
          }
      });
  };

  const handleAnimate = () => {
      if(writerRef.current) {
          writerRef.current.animateCharacter();
      }
  };

  const handleRetry = () => {
      if(writerRef.current) {
          startQuiz(writerRef.current);
      }
  };

  const toggleGuide = () => {
      setIsGuideVisible(!isGuideVisible);
  };

  return (
    <div className="flex flex-col items-center w-full animate-fadeIn gap-2">
        {/* Meaning Prompt - Conditionally rendered to avoid duplication */}
        {meaning && !hideMeaning && (
            <div className="text-center p-3 rounded-xl bg-secondary-100 dark:bg-secondary-800/50 border border-secondary-200 dark:border-secondary-700 shadow-sm mb-1 w-full max-w-sm">
                <p className={`font-serif font-bold text-text-main dark:text-secondary-100 ${isImmersive ? 'text-3xl' : 'text-lg'}`}>
                    {meaning}
                </p>
            </div>
        )}
        
        {/* Minimized Placeholder */}
        {isMinimized && (
            <button 
                onClick={() => setIsMinimized(false)}
                className="w-full max-w-xs py-4 bg-secondary-50 dark:bg-secondary-800/50 rounded-2xl border-2 border-dashed border-secondary-300 dark:border-secondary-600 flex items-center justify-center gap-2 text-text-subtle hover:text-primary-500 hover:border-primary-400 transition-colors group animate-fadeIn"
                title="Tap to Write"
            >
                <div className="p-1.5 bg-white dark:bg-secondary-700 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Icon name="pencil" className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold uppercase tracking-wide">Tap to Write</span>
            </button>
        )}

        {/* Canvas Container */}
        <div 
            className={`relative ${shake ? 'animate-shake' : ''} transition-all duration-300 ease-out ${isMinimized ? 'hidden' : 'block'}`}
        >
            <div 
                ref={containerRef} 
                // Added class `hanzi-writer-wrapper` to target specific CSS override in index.html
                className={`hanzi-writer-wrapper bg-surface dark:bg-secondary-800 rounded-2xl shadow-xl border-4 border-secondary-100 dark:border-secondary-700 cursor-crosshair overflow-hidden touch-none relative z-10 transition-all duration-300`}
                style={{
                    width: currentSize,
                    height: currentSize,
                    // Rice Paper Texture
                    backgroundImage: `
                        radial-gradient(rgba(0,0,0,0.02) 2px, transparent 0),
                        radial-gradient(rgba(0,0,0,0.02) 2px, transparent 0)
                    `,
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 12px 12px'
                }}
            />
            
            {/* Particle Layer */}
            <div ref={particleContainerRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden rounded-2xl" />
            
            {/* Top-Right Controls Group */}
            <div className="absolute top-2 right-2 z-40 flex flex-col gap-1.5 no-print">
                {/* Minimize Button (Mobile Helper) */}
                <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 rounded-lg bg-white/60 dark:bg-black/30 text-text-subtle hover:text-primary-500 hover:bg-white dark:hover:bg-black/60 backdrop-blur-sm transition-all shadow-sm"
                    title="Minimize Canvas"
                >
                    <Icon name="minus" className="w-4 h-4" />
                </button>

                {/* Resize Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 rounded-lg bg-white/60 dark:bg-black/30 text-text-subtle hover:text-primary-500 hover:bg-white dark:hover:bg-black/60 backdrop-blur-sm transition-all shadow-sm"
                    title={isExpanded ? "Collapse Canvas" : "Expand Canvas"}
                >
                    <Icon 
                        name={isExpanded ? "arrows-pointing-in" : "arrows-pointing-out"} 
                        className="w-4 h-4" 
                    />
                </button>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/90 dark:bg-secondary-800/90 backdrop-blur-sm rounded-2xl z-30">
                     <Icon name="spinner" className="w-10 h-10 text-primary-500 animate-spin mb-2" />
                     <span className="text-sm font-bold text-text-subtle">Preparing Ink...</span>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className={`flex gap-4 mt-2 ${isMinimized ? 'opacity-50 pointer-events-none' : 'opacity-100'} no-print`}>
            <Button variant="secondary" onClick={toggleGuide} title={isGuideVisible ? "Hide Guide" : "Show Guide"} className="w-10 h-10 rounded-full p-0 flex items-center justify-center">
                <Icon name={isGuideVisible ? "eye-off" : "eye"} className="w-5 h-5" />
            </Button>
             <Button variant="secondary" onClick={handleAnimate} title="Animate Strokes" className="w-10 h-10 rounded-full p-0 flex items-center justify-center">
                <Icon name="play" className="w-5 h-5" />
            </Button>
            <Button variant="secondary" onClick={handleRetry} title="Clear & Retry" className="w-10 h-10 rounded-full p-0 flex items-center justify-center">
                <Icon name="repeat" className="w-5 h-5" />
            </Button>
            {onViewInfo && (
                <Button variant="secondary" onClick={onViewInfo} title="View Word Info" className="w-10 h-10 rounded-full p-0 flex items-center justify-center text-info-500 hover:text-info-600 dark:text-info-400">
                    <Icon name="file-text" className="w-5 h-5" />
                </Button>
            )}
        </div>
    </div>
  );
};

export default StrokeLayout;
