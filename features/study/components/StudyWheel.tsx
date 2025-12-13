
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

export interface WheelItem {
  id: string;
  label: string;
  color: string;
}

interface StudyWheelProps {
  items: WheelItem[];
  onSpinComplete: (selectedItemId: string) => void;
}

const WHEEL_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#d946ef', // Fuchsia
  '#f43f5e', // Rose
];

const StudyWheel: React.FC<StudyWheelProps> = ({ items, onSpinComplete }) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<WheelItem | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  
  // Limit items for visual clarity (max 12)
  // If more items exist, we shuffle and pick a subset to display on the wheel for this "round"
  const displayItems = React.useMemo(() => {
    const pool = [...items];
    if (pool.length <= 12) return pool;
    // Shuffle and pick 12
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 12);
  }, [items]); // Re-shuffle only when items prop changes significantly (e.g. initial load)

  const handleSpin = () => {
    if (isSpinning || displayItems.length === 0) return;

    setIsSpinning(true);
    setWinner(null);

    // Randomize winner index
    const winnerIndex = Math.floor(Math.random() * displayItems.length);
    const segmentAngle = 360 / displayItems.length;
    
    // Calculate rotation to land the winner at the top (270 degrees in SVG space, or aligned with pointer)
    // We want the winner segment to be at the top pointer.
    // Assuming 0 rotation puts segment 0 at 3 o'clock (SVG default), we need to adjust.
    // Let's rely on visual alignment. 
    // We rotate the container. Pointer is at TOP.
    // If we render startAngle at -90 (top), then segment 0 is at top.
    
    // Add extra spins (5 to 10 full rotations)
    const extraSpins = 360 * (5 + Math.floor(Math.random() * 5));
    
    // To land on index i:
    // The wheel rotates CLOCKWISE.
    // To have segment i at the TOP, we need to rotate the wheel such that segment i is at -90deg (or 270deg).
    // Segment i center is at: i * segmentAngle + segmentAngle/2.
    // We want (i * segmentAngle + segmentAngle/2) + rotation = 270 (or -90 mod 360)??
    // Actually simpler: Target rotation = (360 - (centerAngle of winner)) + extraSpins.
    
    const centerAngle = (winnerIndex * segmentAngle) + (segmentAngle / 2);
    // Align centerAngle to 270 (Top in standard CSS rotation if 0 is Right, but simpler if we rotate visual 0 to Top)
    // Let's assume CSS transform starts at 0deg = 12 o'clock if we configure it so.
    
    // Let's assume initial state: Item 0 is at Top.
    // Item `i` is at `i * -segmentAngle`? No.
    // Item `i` center is at `i * segmentAngle`.
    // We want that angle to end up at 0 (Top).
    // So we rotate BY `(360 - centerAngle)`.
    
    const targetRotation = extraSpins + (360 - centerAngle);
    
    // Add randomness within the segment to avoid landing on lines
    const jitter = (Math.random() - 0.5) * (segmentAngle * 0.8);
    
    setRotation(r => r + targetRotation + jitter);

    setTimeout(() => {
      setIsSpinning(false);
      setWinner(displayItems[winnerIndex]);
      onSpinComplete(displayItems[winnerIndex].id);
    }, 4000); // Duration matches CSS transition
  };

  // SVG Geometry Helpers
  const radius = 50;
  const center = 50;
  
  const getCoordinatesForPercent = (percent: number) => {
    const x = center + radius * Math.cos(2 * Math.PI * percent);
    const y = center + radius * Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  if (items.length === 0) {
      return (
          <div className="w-full h-64 flex flex-col items-center justify-center bg-secondary-100 dark:bg-secondary-800 rounded-full border-4 border-dashed border-secondary-300 dark:border-secondary-600">
              <p className="text-text-subtle font-semibold">No sources available</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center w-full relative py-8">
        {/* Pointer */}
        <div className="absolute top-4 z-20 text-text-main dark:text-white drop-shadow-md">
            <Icon name="arrow-down" className="w-8 h-8 fill-current" variant="filled" />
        </div>

        {/* The Wheel */}
        <div 
            ref={wheelRef}
            className="w-64 h-64 sm:w-80 sm:h-80 relative rounded-full shadow-2xl border-4 border-surface dark:border-secondary-800 overflow-hidden transition-transform cubic-bezier(0.2, 0.8, 0.2, 1)"
            style={{ 
                transform: `rotate(${rotation}deg)`,
                transitionDuration: isSpinning ? '4s' : '0s',
                transitionTimingFunction: 'cubic-bezier(0.25, 0.1, 0.25, 1)' // Ease out cubic
            }}
        >
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {displayItems.map((item, index) => {
                    // Calculate slice path
                    const total = displayItems.length;
                    const startPercent = index / total;
                    const endPercent = (index + 1) / total;
                    
                    const [startX, startY] = getCoordinatesForPercent(startPercent);
                    const [endX, endY] = getCoordinatesForPercent(endPercent);
                    
                    const largeArcFlag = 1 / total > 0.5 ? 1 : 0;
                    
                    const pathData = [
                        `M ${center} ${center}`,
                        `L ${startX} ${startY}`,
                        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                        `Z`
                    ].join(' ');

                    const color = item.color || WHEEL_COLORS[index % WHEEL_COLORS.length];

                    return (
                        <g key={item.id}>
                            <path d={pathData} fill={color} stroke="white" strokeWidth="0.5" />
                            {/* Text Label */}
                            <text
                                x={50 + (radius * 0.75) * Math.cos(2 * Math.PI * (startPercent + endPercent) / 2)}
                                y={50 + (radius * 0.75) * Math.sin(2 * Math.PI * (startPercent + endPercent) / 2)}
                                fill="white"
                                fontSize="4"
                                fontWeight="bold"
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                transform={`rotate(${(startPercent + endPercent) / 2 * 360}, ${50 + (radius * 0.75) * Math.cos(2 * Math.PI * (startPercent + endPercent) / 2)}, ${50 + (radius * 0.75) * Math.sin(2 * Math.PI * (startPercent + endPercent) / 2)})`}
                                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                            >
                                {item.label.length > 8 ? item.label.substring(0, 8) + '..' : item.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
        
        {/* Spin Button */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <button 
                onClick={handleSpin}
                disabled={isSpinning}
                className="w-16 h-16 rounded-full bg-white dark:bg-secondary-800 shadow-xl flex items-center justify-center border-4 border-secondary-100 dark:border-secondary-700 active:scale-95 transition-transform"
            >
                <span className="font-black text-xs uppercase tracking-wider text-text-main dark:text-secondary-100">
                    {isSpinning ? '...' : 'SPIN'}
                </span>
            </button>
        </div>

        {/* Result Feedback */}
        <div className={`mt-6 text-center transition-opacity duration-300 ${winner ? 'opacity-100' : 'opacity-0'}`}>
             <p className="text-xs text-text-subtle font-bold uppercase tracking-wider">Selected</p>
             <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">{winner?.label || '...'}</h3>
        </div>
    </div>
  );
};

export default StudyWheel;
