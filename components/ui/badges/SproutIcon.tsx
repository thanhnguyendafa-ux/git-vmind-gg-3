import * as React from 'react';

const SproutIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7 20h10" />
    <path d="M10 20c5.5-2.5.8-6.4 3-10" />
    <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.2.4-4.8-.3-1.6-.6-2.3-1.9-2.6-3.2C5.2 8.3 6.5 7.4 8 7c1.5-.4 3.2.5 4.5 2.4z" />
  </svg>
);

export default SproutIcon;