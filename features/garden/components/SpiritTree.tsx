
import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGardenStore, getTreeStage, TreeStage } from '../../../stores/useGardenStore';
import { useUserStore } from '../../../stores/useUserStore';
import Icon from '../../../components/ui/Icon';
import { useUIStore } from '../../../stores/useUIStore';
import { Screen } from '../../../types';
import GardenPreviewModal from './GardenPreviewModal';

interface SpiritTreeProps {
  isGolden?: boolean;
  overrideDrops?: number;
}

// Helper to calculate next threshold based on logic in useGardenStore
const getNextStageThreshold = (drops: number): number | null => {
  const thresholds = [15, 40, 90, 180, 350, 600, 1000, 3000, 6000];
  for (const t of thresholds) {
    if (drops < t) return t;
  }
  return null; // Max level reached
};

// --- Shared Definitions (Nature Gradients) ---
const TreeDefs: React.FC = () => (
  <defs>
    {/* Soft Glow */}
    <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    {/* Fresh Leaf Gradient */}
    <linearGradient id="fresh-leaf" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#86efac" /> {/* light green */}
      <stop offset="100%" stopColor="#22c55e" /> {/* vivid green */}
    </linearGradient>

    {/* Deep Foliage Gradient */}
    <linearGradient id="deep-leaf" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#4ade80" />
      <stop offset="100%" stopColor="#15803d" />
    </linearGradient>

    {/* Warm Wood Gradient */}
    <linearGradient id="warm-wood" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#d97706" /> {/* amber */}
      <stop offset="50%" stopColor="#b45309" /> {/* brown */}
      <stop offset="100%" stopColor="#78350f" /> {/* dark oak */}
    </linearGradient>
    
    {/* Sunbeam Gradient */}
    <radialGradient id="sunbeam" cx="50%" cy="0%" r="70%">
       <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.6"/> {/* pale yellow */}
       <stop offset="100%" stopColor="#fef3c7" stopOpacity="0"/>
    </radialGradient>

    {/* Soil Gradient */}
    <radialGradient id="rich-soil" cx="50%" cy="50%" r="50%">
       <stop offset="50%" stopColor="#57534e" stopOpacity="0.6"/>
       <stop offset="100%" stopColor="#57534e" stopOpacity="0"/>
    </radialGradient>
    
    {/* Flower Gradient */}
    <radialGradient id="flower-grad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fca5a5" /> {/* pink */}
        <stop offset="100%" stopColor="#e11d48" /> {/* rose */}
    </radialGradient>
  </defs>
);

// --- Stages ---

const Seed: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    {/* Soil Bed */}
    <ellipse cx="50" cy="88" rx="25" ry="8" fill="url(#rich-soil)" />
    
    {/* The Sprouting Seed */}
    <g className="origin-[50px_88px] animate-bounce-gentle">
        {/* Seed Body */}
        <path d="M50 88 C 60 88, 60 75, 50 68 C 40 75, 40 88, 50 88 Z" fill="#a16207" stroke="#713f12" strokeWidth="0.5" />
        {/* Tiny Sprout */}
        <path d="M 50 68 Q 48 60 42 58 Q 50 60 50 68" fill="#86efac" stroke="#166534" strokeWidth="0.5" />
    </g>
    
    {/* Floating Pollen */}
    <circle cx="40" cy="60" r="1" fill="#fcd34d" className="animate-float-1" opacity="0.6"/>
    <circle cx="60" cy="55" r="1.5" fill="#fcd34d" className="animate-float-2" opacity="0.6"/>
  </svg>
);

const Germination: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="88" rx="22" ry="7" fill="url(#rich-soil)" />
    <g className="origin-[50px_88px] animate-bounce-gentle">
        {/* Cracked Seed Shell Left */}
        <path d="M 48 88 Q 40 88 42 75 Q 48 78 48 88" fill="#a16207" />
        {/* Cracked Seed Shell Right */}
        <path d="M 52 88 Q 60 88 58 75 Q 52 78 52 88" fill="#a16207" />
        {/* Tiny curled shoot */}
        <path d="M 50 88 Q 50 75 45 70 Q 55 65 52 60" stroke="#86efac" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="52" cy="60" r="2" fill="#86efac" />
    </g>
  </svg>
);

const Sprout: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="90" rx="20" ry="6" fill="url(#rich-soil)" />
    
    <g className="origin-[50px_90px] animate-sway-gentle">
        {/* Stem */}
        <path d="M 50 90 Q 52 75 50 65" stroke="#65a30d" strokeWidth="3" strokeLinecap="round" fill="none" />
        {/* Leaves - Lush and Open */}
        <path d="M 50 65 Q 30 55 25 70 Q 20 50 50 65" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.5" />
        <path d="M 50 65 Q 70 55 75 70 Q 80 50 50 65" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.5" />
    </g>
  </svg>
);

const Seedling: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="90" rx="22" ry="7" fill="url(#rich-soil)" />
    <g className="origin-[50px_90px] animate-sway-gentle">
        {/* Stiff Stem */}
        <path d="M 50 90 L 50 50" stroke="#65a30d" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Alternating Leaves */}
        <path d="M 50 80 Q 60 75 62 78 Q 60 85 50 80" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.3" />
        <path d="M 50 70 Q 40 65 38 68 Q 40 75 50 70" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.3" />
        <path d="M 50 60 Q 60 55 62 58 Q 60 65 50 60" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.3" />
        {/* Top Leaf */}
        <path d="M 50 50 Q 40 40 50 35 Q 60 40 50 50" fill="url(#fresh-leaf)" stroke="#166534" strokeWidth="0.3" />
    </g>
  </svg>
);

const Sapling: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="92" rx="25" ry="8" fill="url(#rich-soil)" />
    
    {/* Young Trunk */}
    <path d="M 48 92 L 52 92 L 51 55 Z" fill="url(#warm-wood)" />
    
    <g className="origin-[50px_60px] animate-sway-gentle">
        {/* Branch 1 */}
        <path d="M 51 70 Q 35 65 30 55" stroke="url(#warm-wood)" strokeWidth="2" fill="none" />
        <circle cx="30" cy="55" r="12" fill="url(#fresh-leaf)" opacity="0.9"/>
        
        {/* Branch 2 */}
        <path d="M 51 65 Q 65 60 70 50" stroke="url(#warm-wood)" strokeWidth="2" fill="none" />
        <circle cx="70" cy="50" r="14" fill="url(#fresh-leaf)" opacity="0.9"/>
        
        {/* Top */}
        <circle cx="51" cy="45" r="18" fill="url(#fresh-leaf)" />
    </g>
  </svg>
);

const YoungTree: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="92" rx="28" ry="9" fill="url(#rich-soil)" />
    
    {/* Thin Trunk */}
    <path d="M 47 92 Q 48 70 50 50 Q 52 70 53 92 Z" fill="url(#warm-wood)" />
    
    <g className="origin-[50px_50px] animate-sway-slow">
        {/* Small Canopy Cluster */}
        <circle cx="50" cy="40" r="15" fill="url(#deep-leaf)" />
        <circle cx="40" cy="50" r="12" fill="url(#fresh-leaf)" opacity="0.9" />
        <circle cx="60" cy="50" r="12" fill="url(#fresh-leaf)" opacity="0.9" />
        <circle cx="50" cy="30" r="10" fill="url(#fresh-leaf)" />
    </g>
  </svg>
);

const Tree: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="95" rx="35" ry="10" fill="url(#rich-soil)" />
    
    {/* Solid Trunk */}
    <path d="M 45 95 Q 45 75 48 60 Q 55 75 55 95 Z" fill="url(#warm-wood)" />
    
    <g className="origin-[50px_60px] animate-sway-slow">
        {/* Dense Foliage - Layered for depth */}
        <circle cx="30" cy="50" r="20" fill="url(#deep-leaf)" />
        <circle cx="70" cy="50" r="20" fill="url(#deep-leaf)" />
        <circle cx="50" cy="35" r="25" fill="url(#fresh-leaf)" />
        <circle cx="40" cy="60" r="18" fill="url(#fresh-leaf)" opacity="0.9"/>
        <circle cx="60" cy="60" r="18" fill="url(#fresh-leaf)" opacity="0.9"/>
        
        {/* Simple Fruits */}
        <circle cx="40" cy="40" r="3" fill="#fbbf24" />
        <circle cx="60" cy="45" r="3" fill="#fbbf24" />
    </g>
  </svg>
);

const Mature: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
    <TreeDefs />
    <ellipse cx="50" cy="95" rx="45" ry="12" fill="url(#rich-soil)" />
    
    {/* Majestic Trunk with Roots */}
    <path d="M 40 95 C 40 85, 35 95, 30 100 M 60 95 C 60 85, 65 95, 70 100" stroke="url(#warm-wood)" strokeWidth="4" />
    <path d="M 40 95 Q 42 70 48 50 Q 58 70 60 95 Z" fill="url(#warm-wood)" />
    
    <g className="origin-[50px_50px] animate-sway-slow">
        {/* Massive Canopy */}
        <path d="M 50 50 Q 10 70 10 40 Q 10 10 50 15 Q 90 10 90 40 Q 90 70 50 50" fill="url(#deep-leaf)" />
        <circle cx="30" cy="35" r="22" fill="url(#fresh-leaf)" opacity="0.8"/>
        <circle cx="70" cy="35" r="22" fill="url(#fresh-leaf)" opacity="0.8"/>
        <circle cx="50" cy="20" r="25" fill="url(#fresh-leaf)" />
        
        {/* Flowers/Fruits */}
        <circle cx="25" cy="45" r="4" fill="url(#flower-grad)" />
        <circle cx="75" cy="45" r="4" fill="url(#flower-grad)" />
        <circle cx="50" cy="30" r="5" fill="#fbbf24" />
    </g>
    
    {/* Sun Rays behind */}
    <circle cx="50" cy="0" r="60" fill="url(#sunbeam)" className="animate-pulse-slow" style={{ mixBlendMode: 'screen' }}/>
  </svg>
);

const Ancient: React.FC = () => <Mature />; 
const Eternal: React.FC = () => <Mature />;

const WaterDrop: React.FC = () => (
  <svg viewBox="0 0 24 24" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 text-sky-400 animate-fall z-20 filter drop-shadow-md">
    <path fill="currentColor" d="M12 2c-5.52 0-10 4.48-10 10 0 4.17 2.54 7.8 6.22 9.36.4.22.8.28 1.2.28.48 0 .96-.11 1.4-.34C15.96 19.33 22 15.39 22 12 22 6.48 17.52 2 12 2z"/>
    {/* Highlight */}
    <path d="M14 6 Q 12 8 12 12" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6"/>
  </svg>
);

export const SpiritTree: React.FC<SpiritTreeProps> = ({ isGolden = false, overrideDrops }) => {
    const storeDrops = useGardenStore(useShallow(state => state.totalDrops));
    const isWatering = useGardenStore(useShallow(state => state.isWatering));
    
    const totalDrops = overrideDrops !== undefined ? overrideDrops : storeDrops;

    const { stats } = useUserStore(useShallow(state => ({ stats: state.stats })));
    const { setCurrentScreen } = useUIStore();
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    const stage = getTreeStage(totalDrops);
    const treeShakeClass = isWatering && overrideDrops === undefined ? 'animate-tree-shake' : '';
    const streak = stats.studyStreak;

    // --- Visual Effects Logic ---
    
    // 1. Streak Aura (Loss Aversion) - Only apply if NOT in simulation mode
    let auraFilter = '';
    if (overrideDrops === undefined) {
        if (streak >= 7) {
            auraFilter = 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.6))'; 
        } else if (streak >= 3) {
            auraFilter = 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.5))';
        } else if (streak === 0) {
            auraFilter = 'grayscale(0.2) saturate(0.8)';
        }
    }

    // 2. Tier Effect (isGolden prop comes from Garden Tier)
    const combinedFilter = isGolden 
        ? `${auraFilter} sepia(1) saturate(3) hue-rotate(10deg) drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))`
        : auraFilter;

    // --- Progress Calculation ---
    const nextThreshold = getNextStageThreshold(totalDrops);
    const dropsNeeded = nextThreshold ? Math.max(0, nextThreshold - totalDrops) : 0;
    const prevThreshold = nextThreshold ? (
        // Find the previous threshold to calculate % progress
        [0, 15, 40, 90, 180, 350, 600, 1000, 3000, 6000].filter(t => t < nextThreshold).pop() || 0
    ) : 0;
    
    const progressPercent = nextThreshold 
        ? ((totalDrops - prevThreshold) / (nextThreshold - prevThreshold)) * 100 
        : 100;

    const renderStage = () => {
        switch (stage) {
            case TreeStage.Seed: return <Seed />;
            case TreeStage.Germination: return <Germination />;
            case TreeStage.Sprout: return <Sprout />;
            case TreeStage.Seedling: return <Seedling />;
            case TreeStage.Sapling: return <Sapling />;
            case TreeStage.YoungTree: return <YoungTree />;
            case TreeStage.Tree: return <Tree />;
            case TreeStage.Mature: return <Mature />;
            case TreeStage.Ancient: return <Ancient />;
            case TreeStage.Eternal: return <Eternal />;
            default: return <Seed />;
        }
    };
    
    // Only show the "Dream" button if NOT already in simulation mode
    const showPreviewButton = overrideDrops === undefined && nextThreshold !== null;

    return (
        <div className="relative w-full max-w-xs mx-auto flex flex-col items-center">
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-100%) scale(0.5); opacity: 1; }
                    60% { transform: translateY(180%) scale(1); opacity: 1; }
                    100% { transform: translateY(200%) scale(0.8); opacity: 0; }
                }
                .animate-fall {
                    animation: fall 1s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards;
                }
                @keyframes tree-shake {
                    0%, 100% { transform: rotate(0deg) scale(1); }
                    25% { transform: rotate(-3deg) scale(1.05); }
                    75% { transform: rotate(3deg) scale(1.05); }
                }
                .animate-tree-shake {
                    animation: tree-shake 0.4s ease-in-out;
                }
                 @keyframes bounce-gentle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2px); }
                }
                .animate-bounce-gentle {
                    animation: bounce-gentle 2s infinite ease-in-out;
                }
                @keyframes sway-gentle {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2deg); }
                }
                .animate-sway-gentle {
                    animation: sway-gentle 4s infinite ease-in-out;
                }
                 @keyframes sway-slow {
                    0%, 100% { transform: rotate(-1deg); }
                    50% { transform: rotate(1deg); }
                }
                .animate-sway-slow {
                    animation: sway-slow 6s infinite ease-in-out;
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 0.4; transform: scale(0.9); }
                    50% { opacity: 0.8; transform: scale(1.1); }
                }
                .animate-pulse-slow {
                    animation: pulse-slow 4s infinite ease-in-out;
                }
                @keyframes float-1 {
                    0% { transform: translate(0, 0); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translate(-10px, -20px); opacity: 0; }
                }
                .animate-float-1 { animation: float-1 3s infinite ease-out; }
                @keyframes float-2 {
                    0% { transform: translate(0, 0); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translate(10px, -15px); opacity: 0; }
                }
                .animate-float-2 { animation: float-2 4s infinite ease-out 1.5s; }
            `}</style>

            <div 
                className={`relative w-40 h-40 z-10 transition-all duration-1000`}
                style={{ filter: combinedFilter }}
            >
                {isWatering && overrideDrops === undefined && <WaterDrop />}
                <div className={`w-full h-full transition-all duration-500 ${treeShakeClass}`}>
                    {renderStage()}
                </div>
            </div>
            
            <div className="flex flex-col items-center mt-1 z-20 w-full relative">
                {/* Trigger for Dream Mode */}
                {showPreviewButton && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsPreviewOpen(true); }}
                        className="absolute right-0 top-0 translate-x-full text-purple-400 hover:text-fuchsia-300 animate-pulse hover:scale-110 transition-transform p-2 z-50 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]"
                        title="Glimpse the Future"
                    >
                         <Icon name="crystal-ball" className="w-6 h-6" variant="filled" />
                    </button>
                )}

                <button
                    onClick={() => overrideDrops === undefined && setCurrentScreen(Screen.Stats)}
                    className={`flex items-center gap-2 bg-white/30 dark:bg-black/30 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm transition-transform group ${overrideDrops === undefined ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
                    title={overrideDrops === undefined ? "View Profile" : "Simulated Drops"}
                >
                    <Icon name="cloud-rain" className="w-4 h-4 text-sky-500 dark:text-sky-400 group-hover:animate-bounce" variant="filled" />
                    <span className="font-bold text-lg text-text-main dark:text-white font-nunitosans leading-none">{totalDrops.toLocaleString()}</span>
                </button>
                
                {/* Progress to Next Stage Indicator */}
                {nextThreshold && (
                    <div className="mt-2 flex flex-col items-center w-32">
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-1">
                            <div className="h-full bg-sky-400/80 transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-white/80 drop-shadow-sm uppercase tracking-wide">
                            Next stage in {dropsNeeded}
                        </span>
                    </div>
                )}
            </div>

            <GardenPreviewModal 
                isOpen={isPreviewOpen} 
                onClose={() => setIsPreviewOpen(false)} 
                currentDrops={storeDrops} 
            />
        </div>
    );
};

export default SpiritTree;
