import * as React from 'react';

interface SettingsIconProps {
  className?: string;
}

const SettingsIcon: React.FC<SettingsIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50.000000 50.000000"
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      <g
        transform="translate(0.000000,50.000000) scale(0.100000,-0.100000)"
        fill="currentColor"
        stroke="none"
      >
        <path d="M234 438 c-16 -53 -60 -73 -104 -46 -27 17 -34 5 -19 -35 16 -45 7 -65 -36 -83 -41 -17 -45 -31 -10 -40 14 -3 34 -17 45 -31 18 -23 18 -26 3 -59 -21 -42 -14 -49 32 -33 43 16 64 7 84 -39 8 -18 17 -32 20 -32 3 0 13 15 21 32 22 46 42 55 85 39 20 -7 39 -10 43 -7 3 4 -2 22 -11 42 -17 35 -17 35 12 65 16 16 37 29 45 29 26 0 18 15 -16 31 -46 20 -62 55 -40 91 21 36 10 45 -32 25 -33 -15 -36 -15 -59 3 -14 11 -28 31 -31 45 -8 31 -22 32 -32 3z m78 -125 c40 -39 39 -92 -3 -127 -17 -14 -42 -26 -55 -26 -32 0 -80 25 -88 45 -37 98 72 179 146 108z"/>
        <path d="M202 297 c-28 -30 -28 -68 1 -95 30 -28 68 -28 95 1 28 30 28 68 -1 95 -30 28 -68 28 -95 -1z"/>
      </g>
    </svg>
  );
};

export default SettingsIcon;