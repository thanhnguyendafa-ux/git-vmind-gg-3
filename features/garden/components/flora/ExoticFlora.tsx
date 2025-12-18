
import * as React from 'react';

// --- Ferns ---
export const Ferns: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 animate-fadeIn">
        <g transform="translate(85, 78) scale(0.6)">
            <path d="M 0 0 Q 5 -10, 15 -5" stroke="#15803d" strokeWidth="1" fill="none" />
            <path d="M 0 0 Q -5 -8, -12 -4" stroke="#15803d" strokeWidth="1" fill="none" />
            <path d="M 0 0 Q 0 -12, 2 -20" stroke="#15803d" strokeWidth="1" fill="none" />
            {/* Leaves */}
            <path d="M 2 -2 L 6 -4 M 3 -5 L 8 -7 M 4 -9 L 9 -11" stroke="#166534" strokeWidth="0.5" />
        </g>
        <g transform="translate(5, 82) scale(0.5) rotate(10)">
            <path d="M 0 0 Q 8 -15, 20 -10" stroke="#15803d" strokeWidth="1" fill="none" />
             <path d="M 0 0 Q -2 -12, 0 -20" stroke="#15803d" strokeWidth="1" fill="none" />
        </g>
    </svg>
);

// --- Glowing Mushrooms ---
export const GlowingMushrooms: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10 animate-fadeIn">
        <defs>
            <filter id="glow-blue">
                <feGaussianBlur stdDeviation="1" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        <g transform="translate(28, 88)">
            <path d="M 0 0 L 0 -4" stroke="#e2e8f0" strokeWidth="1" />
            <path d="M -2 -4 Q 0 -8, 2 -4 Z" fill="#60a5fa" filter="url(#glow-blue)" className="animate-pulse" style={{ animationDuration: '3s' }} />
        </g>
         <g transform="translate(32, 90) scale(0.8)">
            <path d="M 0 0 L 0 -4" stroke="#e2e8f0" strokeWidth="1" />
            <path d="M -2 -4 Q 0 -8, 2 -4 Z" fill="#818cf8" filter="url(#glow-blue)" className="animate-pulse" style={{ animationDuration: '4s' }} />
        </g>
    </svg>
);
