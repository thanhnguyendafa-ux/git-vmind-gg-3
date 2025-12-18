import * as React from 'react';

const GlowingBrainIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9.5 20c.8 0 1.5-.7 1.5-1.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1c0 .8.7 1.5 1.5 1.5S17 19.3 17 18.5c0-3-2-4.5-2.5-6.5.5-3 1.5-2 1.5-4 0-3.3-2.7-6-6-6S4 4.7 4 8c0 2 1 1 1.5 4-.5 2-2.5 3.5-2.5 6.5 0 .8.7 1.5 1.5 1.5S6 19.3 6 18.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1c0 .8.7 1.5 1.5 1.5z" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93l1.41 1.41" />
    <path d="M17.66 17.66l1.41 1.41" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M4.93 19.07l1.41-1.41" />
    <path d="M17.66 6.34l1.41-1.41" />
  </svg>
);

export default GlowingBrainIcon;