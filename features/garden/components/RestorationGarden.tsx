
import * as React from 'react';
import { useGardenStore, getGardenTier } from '../../../stores/useGardenStore';
import { useShallow } from 'zustand/react/shallow';
import { useGardenDirector } from '../logic/gardenDirector';

// Components
import GardenEnvironment from './GardenEnvironment';
import SpiritTree from './SpiritTree';
import GrassPatches from './flora/GrassPatches';
import SmallRocks from './flora/SmallRocks';
import TinyPuddle from './flora/TinyPuddle';
import Mushrooms from './flora/Mushrooms';
import Flowers from './flora/Flowers';
import { Ferns, GlowingMushrooms } from './flora/ExoticFlora';
import { Butterfly, BlueBird, Ladybugs, Dragonflies, KoiFish, WhiteStag } from './Fauna';
import { MorningMist, SunShafts, AuroraSky, StoneLantern, SpiritPortal } from './GardenLayers';

import Icon from '../../../components/ui/Icon';
import GardenGuideModal from './GardenGuideModal';

interface RestorationGardenProps {
    className?: string;
    isAwake?: boolean;
    overrideDrops?: number;
}

const Wisps: React.FC = () => {
    // Random positions for particles
    const particles = React.useMemo(() => Array.from({ length: 8 }).map(() => ({
        x: 30 + Math.random() * 40,
        y: 40 + Math.random() * 40,
        r: 0.5 + Math.random() * 1,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4
    })), []);

    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-40">
             <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            <style>{`
                @keyframes float-up {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    50% { opacity: 0.8; }
                    100% { transform: translateY(-30px) scale(0); opacity: 0; }
                }
            `}</style>
            {particles.map((p, i) => (
                <circle 
                    key={i}
                    cx={p.x} 
                    cy={p.y} 
                    r={p.r} 
                    fill="#fef08a" 
                    filter="url(#glow)"
                    style={{ 
                        animation: `float-up ${p.duration}s infinite ease-in ${p.delay}s`,
                        transformBox: 'fill-box',
                        transformOrigin: 'center'
                    }}
                />
            ))}
        </svg>
    );
};

const RestorationGarden: React.FC<RestorationGardenProps> = ({ className, isAwake = true, overrideDrops }) => {
    const storeDrops = useGardenStore(useShallow(state => state.totalDrops));
    const totalDrops = overrideDrops !== undefined ? overrideDrops : storeDrops;
    
    const tier = getGardenTier(totalDrops);
    const [isGuideOpen, setIsGuideOpen] = React.useState(false);
    
    // Director Hook determines active assets based on the effective drop count
    const { has } = useGardenDirector(totalDrops);

    // Calculated linear density for base flora
    const grassCount = Math.min(15, Math.floor(totalDrops / 20));
    const flowerCount = Math.min(10, Math.floor(totalDrops / 50));
    
    // Tier-based logic for the tree
    const isSanctuary = tier === 'Sanctuary';

    const containerHeight = className || "h-64 sm:h-80 md:h-96";
    const slumberFilters = !isAwake && overrideDrops === undefined ? "grayscale-[0.8] sepia-[0.3] opacity-80" : "";
    const dreamClass = overrideDrops !== undefined ? "dream-overlay" : "";
    
    const contentClass = !isAwake && overrideDrops === undefined ? "slumber-mode w-full h-full" : "w-full h-full";

    return (
        <>
            <div className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 to-stone-100 dark:from-slate-900 dark:to-stone-900 border border-secondary-200 dark:border-secondary-700 shadow-inner ${containerHeight} ${slumberFilters} ${dreamClass}`}>
                {overrideDrops === undefined && (
                    <button
                        onClick={() => setIsGuideOpen(true)}
                        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-sm transition-colors"
                        aria-label="Open Garden Guide"
                    >
                        <Icon name="question-mark-circle" className="w-6 h-6" />
                    </button>
                )}
                
                {!isAwake && overrideDrops === undefined && (
                    <>
                        <style>{`
                            .slumber-mode * {
                                animation-play-state: paused !important;
                            }
                        `}</style>
                        <div className="absolute inset-0 z-50 bg-gradient-to-b from-white/40 to-gray-200/40 dark:from-black/40 dark:to-gray-900/40 pointer-events-none backdrop-blur-[1px]"></div>
                    </>
                )}
                
                <div className={contentClass}>
                    {/* Z-Index 0: Sky & Background Effects */}
                    {has('aurora_sky') && <AuroraSky />}

                    {/* Z-Index 1: Environment (Ground & Water) */}
                    <GardenEnvironment tier={tier} />
                    
                    {/* Z-Index 2: Background Flora & Structures */}
                    {has('stream_flow') && <TinyPuddle />} {/* Enhanced Puddle */}
                    {has('mossy_stones') && <SmallRocks />}
                    {has('stone_lantern') && <StoneLantern />}
                    {has('white_stag') && <WhiteStag />}

                    {/* Z-Index 3: Foreground Flora */}
                    {grassCount > 0 && <GrassPatches count={grassCount} />}
                    {has('glowing_mushrooms') && <GlowingMushrooms />}
                    {has('ferns') && <Ferns />}
                    {/* Legacy Mushrooms for lower levels if Glowing not active? Or overlapping ok */}
                    {!has('glowing_mushrooms') && totalDrops > 800 && <Mushrooms />} 
                    
                    {has('wild_flowers') && <Flowers count={flowerCount} />}
                    
                    {/* Z-Index 4: Fauna (Water) */}
                    {has('koi_fish') && <KoiFish />}

                    {/* Z-Index 10: Center Stage Tree */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 transform scale-110 origin-bottom">
                        <SpiritTree isGolden={isSanctuary} overrideDrops={overrideDrops} />
                    </div>

                    {/* Z-Index 20+: Fauna (Air/Land) & Atmosphere */}
                    {has('ladybugs') && <Ladybugs />}
                    {has('dragonflies') && <Dragonflies />}
                    {/* Legacy thresholds for Butterfly/Bird maintained via Director check if wanted, or reuse thresholds */}
                    {totalDrops >= 100 && <Butterfly />} 
                    {totalDrops >= 250 && <BlueBird />}
                    
                    {has('morning_mist') && <MorningMist />}
                    {has('sun_shafts') && <SunShafts />}
                    {has('spirit_portal') && <SpiritPortal />}

                    {/* Topmost Overlay */}
                    {isSanctuary && <Wisps />}
                </div>
            </div>
            <GardenGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
        </>
    );
};

export default RestorationGarden;
