import * as React from 'react';
import { GardenTier } from '../../../stores/useGardenStore';

interface GardenEnvironmentProps {
  tier: GardenTier;
}

const GardenEnvironment: React.FC<GardenEnvironmentProps> = ({ tier }) => {
  const isTier1 = tier === 'Barren';
  const isTier2 = tier === 'Spring';
  const isTier3 = tier === 'Forest';
  const isTier4OrHigher = tier === 'Ecosystem' || tier === 'Sanctuary';

  // Color definitions based on tier
  let groundColor = '#57534e'; // Stone-600 (Barren)
  if (isTier2) groundColor = '#86efac'; // Green-300 (Spring)
  else if (isTier3) groundColor = '#16a34a'; // Green-600 (Forest)
  else if (isTier4OrHigher) groundColor = '#15803d'; // Green-700 (Ecosystem+)

  const waterColor = isTier1 ? '#292524' : '#0ea5e9'; // Stone-800 vs Sky-500

  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="water-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
        </linearGradient>
        <filter id="water-glow">
          <feGaussianBlur stdDeviation="0.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* --- Ground Layer --- */}
      
      {/* Base Ground */}
      <path 
        d="M0 65 Q 20 60, 50 65 T 100 65 V 100 H 0 Z" 
        fill={groundColor} 
        className="transition-colors duration-1000 ease-in-out"
      />

      {/* Tier 1 Details: Cracks */}
      {isTier1 && (
        <g stroke="#44403c" strokeWidth="0.5" fill="none" opacity="0.6">
           <path d="M 20 70 L 25 75 L 22 80" />
           <path d="M 70 70 L 65 75 L 68 82" />
           <path d="M 45 85 L 50 90 L 55 88" />
        </g>
      )}

      {/* Tier 3+ Details: Rocks */}
      {(isTier3 || isTier4OrHigher) && (
        <g fill="#78716c">
           <ellipse cx="15" cy="70" rx="3" ry="2" />
           <ellipse cx="85" cy="75" rx="4" ry="2.5" />
           <path d="M 12 70 L 15 66 L 18 70 Z" fill="#57534e"/>
        </g>
      )}

      {/* Tier 4+ Details: Stone Path */}
      {isTier4OrHigher && (
        <g fill="#e5e5e5" opacity="0.6">
           <ellipse cx="30" cy="80" rx="3" ry="1.5" />
           <ellipse cx="40" cy="85" rx="3" ry="1.5" />
           <ellipse cx="50" cy="92" rx="3" ry="1.5" />
           <ellipse cx="60" cy="88" rx="3" ry="1.5" />
        </g>
      )}


      {/* --- Water Layer --- */}
      
      {/* Tier 1: Dry Hole */}
      {isTier1 && (
         <ellipse cx="80" cy="80" rx="8" ry="3" fill={waterColor} opacity="0.5" />
      )}

      {/* Tier 2: Small Puddle */}
      {isTier2 && (
         <ellipse cx="80" cy="80" rx="10" ry="4" fill="url(#water-grad)" className="animate-pulse" style={{ animationDuration: '4s' }} />
      )}

      {/* Tier 3+: Pond */}
      {(isTier3 || isTier4OrHigher) && (
         <g>
            <path d="M 65 80 Q 80 75, 95 80 Q 90 90, 75 90 Q 60 85, 65 80 Z" fill="url(#water-grad)" filter="url(#water-glow)" className="animate-pulse" style={{ animationDuration: '3s' }} />
            {/* Reflection lines */}
            <path d="M 70 82 H 75 M 80 85 H 88" stroke="white" strokeWidth="0.5" strokeLinecap="round" opacity="0.4" />
         </g>
      )}

      {/* Tier 4+: Waterfall */}
      {isTier4OrHigher && (
          <g>
              <path d="M 90 40 Q 92 60, 85 80" stroke="url(#water-grad)" strokeWidth="2" strokeDasharray="4 2" className="animate-dash-flow" fill="none" opacity="0.7">
                 <style>{`
                    @keyframes dash-flow {
                        to { stroke-dashoffset: -20; }
                    }
                    .animate-dash-flow {
                        animation: dash-flow 1s linear infinite;
                    }
                 `}</style>
              </path>
              <circle cx="85" cy="80" r="3" fill="white" opacity="0.3" className="animate-ping" />
          </g>
      )}

    </svg>
  );
};

export default GardenEnvironment;