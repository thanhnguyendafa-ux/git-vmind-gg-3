import * as React from 'react';

const SmallRocks: React.FC = () => {
    // A few simple ellipses to represent small rocks and pebbles.
    // Positioned on the ground layer to add texture.
    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <g>
                {/* A small cluster of rocks on the left */}
                <ellipse cx="20" cy="85" rx="5" ry="3" fill="#a8a29e" stroke="#57534e" strokeWidth="0.3" />
                <ellipse cx="23" cy="86" rx="3" ry="2" fill="#78716c" stroke="#44403c" strokeWidth="0.3" />

                {/* A single rock on the right */}
                <ellipse cx="70" cy="88" rx="4" ry="2.5" fill="#a8a29e" stroke="#57534e" strokeWidth="0.3" />
                 
                {/* Another small rock near the center */}
                 <ellipse cx="55" cy="92" rx="2" ry="1" fill="#78716c" stroke="#44403c" strokeWidth="0.2" />
            </g>
        </svg>
    );
};

export default SmallRocks;