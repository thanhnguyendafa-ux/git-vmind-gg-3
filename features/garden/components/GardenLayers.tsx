
import * as React from 'react';

// --- Atmosphere Layer ---

export const MorningMist: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30">
        <style>{`
            @keyframes drift {
                0% { transform: translateX(-5%); opacity: 0.3; }
                50% { transform: translateX(5%); opacity: 0.6; }
                100% { transform: translateX(-5%); opacity: 0.3; }
            }
        `}</style>
        <defs>
            <filter id="mist-blur">
                <feGaussianBlur stdDeviation="3" />
            </filter>
            <linearGradient id="mist-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0" />
                <stop offset="50%" stopColor="#e0f2fe" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0" />
            </linearGradient>
        </defs>
        <rect x="-20" y="75" width="140" height="20" fill="url(#mist-grad)" filter="url(#mist-blur)" style={{ animation: 'drift 20s infinite ease-in-out' }} />
        <rect x="-20" y="65" width="140" height="30" fill="url(#mist-grad)" filter="url(#mist-blur)" style={{ animation: 'drift 25s infinite ease-in-out reverse' }} opacity="0.5" />
    </svg>
);

export const SunShafts: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-40 mix-blend-overlay">
        <defs>
            <linearGradient id="shaft-grad" x1="50%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#fff7ed" stopOpacity="0" />
            </linearGradient>
        </defs>
        <path d="M 60 -10 L 20 100 L 40 100 L 80 -10 Z" fill="url(#shaft-grad)" className="animate-pulse" style={{ animationDuration: '8s' }} />
        <path d="M 40 -10 L 0 80 L 10 80 L 50 -10 Z" fill="url(#shaft-grad)" opacity="0.6" className="animate-pulse" style={{ animationDuration: '11s' }} />
    </svg>
);

export const AuroraSky: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <style>{`
            @keyframes aurora-wave {
                0% { transform: translateY(0) scaleY(1); opacity: 0.3; }
                50% { transform: translateY(-5px) scaleY(1.2); opacity: 0.6; }
                100% { transform: translateY(0) scaleY(1); opacity: 0.3; }
            }
        `}</style>
        <defs>
            <filter id="aurora-blur">
                <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="aurora-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0" />
                <stop offset="50%" stopColor="#34d399" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="aurora-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
        </defs>
        <path d="M -10 20 Q 30 10, 60 25 T 110 15 V 0 H -10 Z" fill="url(#aurora-grad-1)" filter="url(#aurora-blur)" style={{ animation: 'aurora-wave 10s infinite ease-in-out' }} />
        <path d="M -10 15 Q 40 30, 80 20 T 110 30 V 0 H -10 Z" fill="url(#aurora-grad-2)" filter="url(#aurora-blur)" style={{ animation: 'aurora-wave 15s infinite ease-in-out reverse' }} opacity="0.7" />
    </svg>
);

// --- Decoration Layer ---

export const StoneLantern: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
        <g transform="translate(10, 68) scale(0.6)">
            {/* Base */}
            <path d="M 5 20 L 25 20 L 22 5 L 8 5 Z" fill="#78716c" />
            {/* Middle */}
            <rect x="10" y="1" width="10" height="4" fill="#57534e" />
            {/* Light Box */}
            <rect x="8" y="-8" width="14" height="9" fill="#a8a29e" />
            <rect x="10" y="-6" width="10" height="5" fill="#fef3c7" className="animate-pulse" style={{ animationDuration: '4s' }} />
            {/* Roof */}
            <path d="M 4 -8 L 15 -18 L 26 -8" fill="#57534e" stroke="#44403c" strokeWidth="1" />
        </g>
    </svg>
);

export const SpiritPortal: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-5">
        <style>{`
            @keyframes spin-slow {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `}</style>
        <g transform="translate(50, 85)" opacity="0.3">
             <circle cx="0" cy="0" r="35" fill="none" stroke="#fcd34d" strokeWidth="0.5" strokeDasharray="2 4" style={{ animation: 'spin-slow 60s linear infinite' }} />
             <circle cx="0" cy="0" r="30" fill="none" stroke="#60a5fa" strokeWidth="0.3" strokeDasharray="1 3" style={{ animation: 'spin-slow 40s linear infinite reverse' }} />
        </g>
    </svg>
);
