import * as React from 'react';

const TinyPuddle: React.FC = () => {
    // A simple ellipse with a pulse animation to represent a small puddle of water.
    // It is positioned to the right side of the garden area.
    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <ellipse 
                cx="75" 
                cy="85" 
                rx="8" 
                ry="3" 
                fill="#bae6fd" 
                className="animate-pulse" 
                style={{ animationDuration: '4s' }}
                opacity="0.8"
            />
        </svg>
    );
};

export default TinyPuddle;