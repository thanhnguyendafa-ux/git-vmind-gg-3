import * as React from 'react';

const Mushrooms: React.FC = () => {
    // A few simple mushrooms to appear near rocks and the base of the tree.
    return (
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible animate-fadeIn" style={{ animationDelay: '500ms' }}>
            <g>
                {/* Mushroom 1 (near left rocks) */}
                <path d="M 22 83 L 22 80" stroke="#f1f5f9" strokeWidth="1" />
                <path d="M 20 80 A 2 2 0 0 1 24 80" fill="#ef4444" stroke="#dc2626" strokeWidth="0.3" />
                
                {/* Mushroom 2 (near right rocks) */}
                <path d="M 71 86 L 71 83" stroke="#f1f5f9" strokeWidth="0.8" />
                <path d="M 70 83 A 1.5 1.5 0 0 1 72 83" fill="#f97316" stroke="#ea580c" strokeWidth="0.2" />
                
                 {/* Mushroom 3 (small, near center) */}
                <path d="M 56 90 L 56 88" stroke="#e2e8f0" strokeWidth="0.5" />
                <path d="M 55.5 88 A 1 1 0 0 1 56.5 88" fill="#a8a29e" stroke="#78716c" strokeWidth="0.2" />
            </g>
        </svg>
    );
};

export default Mushrooms;