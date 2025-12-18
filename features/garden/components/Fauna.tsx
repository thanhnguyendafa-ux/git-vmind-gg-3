
import * as React from 'react';

// Common Animation Styles
const FaunaStyles = () => (
    <style>{`
        @keyframes flutter {
            0%, 100% { transform: translate(0, 0) scale(1); }
            25% { transform: translate(5px, -5px) scale(0.9); }
            50% { transform: translate(0, -10px) scale(1); }
            75% { transform: translate(-5px, -5px) scale(0.9); }
        }
        .animate-flutter { animation: flutter 4s infinite ease-in-out; }

        @keyframes fly {
            0% { transform: translate(-10px, 10px) scale(0.8); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translate(110px, -20px) scale(0.8); opacity: 0; }
        }
        .animate-fly { animation: fly 20s linear infinite; }

        @keyframes hover-zigzag {
            0% { transform: translate(0, 0); }
            25% { transform: translate(10px, -5px); }
            50% { transform: translate(0, -10px); }
            75% { transform: translate(-10px, -5px); }
            100% { transform: translate(0, 0); }
        }
        .animate-hover-zigzag { animation: hover-zigzag 5s infinite linear; }

        @keyframes swim-circle {
            0% { transform: rotate(0deg) translateX(5px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(5px) rotate(-360deg); }
        }
        
        @keyframes fade-in-slow {
            0% { opacity: 0; }
            100% { opacity: 0.15; }
        }
    `}</style>
);

export const Butterfly: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
        <FaunaStyles />
        <g className="animate-flutter" style={{ transformOrigin: 'center' }}>
            <path d="M 20 60 Q 15 55 20 50 Q 25 55 20 60 Z" fill="#fcd34d" opacity="0.8" />
            <path d="M 20 60 Q 25 65 20 70 Q 15 65 20 60 Z" fill="#fcd34d" opacity="0.8" />
        </g>
    </svg>
);

export const BlueBird: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30">
        <g className="animate-fly">
            {/* Simple V-shape bird */}
            <path d="M 10 20 L 12 22 L 14 20" stroke="#60a5fa" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <path d="M 15 22 L 17 24 L 19 22" stroke="#60a5fa" strokeWidth="0.8" fill="none" strokeLinecap="round" style={{ transform: 'translate(-2px, 3px) scale(0.8)' }} />
        </g>
    </svg>
);

export const Ladybugs: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10">
        <g transform="translate(30, 85) rotate(-30)">
             <circle cx="0" cy="0" r="1.5" fill="#ef4444" />
             <circle cx="0.5" cy="-0.5" r="0.3" fill="black" />
             <circle cx="-0.5" cy="0.5" r="0.3" fill="black" />
        </g>
        <g transform="translate(60, 92) rotate(15)">
             <circle cx="0" cy="0" r="1.5" fill="#ef4444" />
             <circle cx="0" cy="0" r="0.3" fill="black" />
        </g>
    </svg>
);

export const Dragonflies: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-20">
        <g transform="translate(80, 75)" className="animate-hover-zigzag">
            {/* Body */}
            <path d="M 0 -2 L 0 2" stroke="#0ea5e9" strokeWidth="0.5" />
            {/* Wings */}
            <path d="M -3 -1 L 3 -1" stroke="#bae6fd" strokeWidth="0.3" opacity="0.6" />
            <path d="M -3 0 L 3 0" stroke="#bae6fd" strokeWidth="0.3" opacity="0.6" />
        </g>
    </svg>
);

export const KoiFish: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <style>{`
            @keyframes swim {
                0% { transform: translate(0, 0) rotate(0deg); }
                25% { transform: translate(5px, 2px) rotate(10deg); }
                50% { transform: translate(0, 4px) rotate(0deg); }
                75% { transform: translate(-5px, 2px) rotate(-10deg); }
                100% { transform: translate(0, 0) rotate(0deg); }
            }
            .animate-swim { animation: swim 8s infinite linear; }
        `}</style>
        
        {/* Render inside the water area roughly */}
        <g className="animate-swim" style={{ transformOrigin: '80px 80px' }}>
            <ellipse cx="80" cy="82" rx="2" ry="1" fill="#fca5a5" opacity="0.8" />
        </g>
        <g className="animate-swim" style={{ transformOrigin: '75px 85px', animationDelay: '1s' }}>
            <ellipse cx="75" cy="85" rx="1.5" ry="0.8" fill="#fcd34d" opacity="0.8" />
        </g>
         {/* Extra Koi for higher levels */}
        <g className="animate-swim" style={{ transformOrigin: '70px 82px', animationDelay: '3s' }}>
             <ellipse cx="70" cy="82" rx="1.8" ry="0.9" fill="#f97316" opacity="0.7" />
        </g>
    </svg>
);

export const WhiteStag: React.FC = () => (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
        <g transform="translate(10, 65) scale(0.8)" style={{ animation: 'fade-in-slow 4s ease-out forwards', opacity: 0.15 }}>
             {/* Abstract Silhouette */}
             <path d="M 0 20 L 0 10 Q 5 12, 10 10 L 12 15 M 10 10 L 10 0 M 10 0 L 8 -5 M 10 0 L 12 -5" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />
             <path d="M 0 12 L 8 12" stroke="white" strokeWidth="1" />
        </g>
    </svg>
);

// Keep previous PondFish as alias or remove if fully replaced by KoiFish logic inside RestorationGarden
export const PondFish = KoiFish;
