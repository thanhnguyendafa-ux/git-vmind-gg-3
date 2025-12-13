
import * as React from 'react';

interface IconProps {
  className?: string;
}

export const IconSeed: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" fill="#A16207" />
    <path d="M15 10C15 10 16 12 14 15C12 18 10 17 9 15" stroke="#CA8A04" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 5C10 5 7 7 6 10" stroke="#713F12" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

export const IconSprout: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 22V12" stroke="#4D7C0F" strokeWidth="2" strokeLinecap="round" />
    <path d="M12 12C12 12 10 6 6 8C2 10 5 15 12 15" fill="#84CC16" />
    <path d="M12 12C12 12 14 5 18 6C22 7 20 13 12 14" fill="#A3E635" />
  </svg>
);

export const IconTree: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <rect x="10" y="14" width="4" height="10" rx="1" fill="#78350F" />
    <path d="M12 20L8 22M12 20L16 22" stroke="#78350F" strokeWidth="2" />
    <circle cx="12" cy="9" r="8" fill="#15803D" />
    <circle cx="15" cy="7" r="4" fill="#22C55E" fillOpacity="0.5" />
    <circle cx="9" cy="11" r="3" fill="#14532D" fillOpacity="0.2" />
  </svg>
);

export const IconForest: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Left Tree */}
    <path d="M7 16L4 22H10L7 16Z" fill="#78350F" />
    <circle cx="7" cy="14" r="5" fill="#15803D" />
    
    {/* Right Tree */}
    <path d="M17 16L14 22H20L17 16Z" fill="#78350F" />
    <circle cx="17" cy="14" r="5" fill="#15803D" />
    
    {/* Center Tree (Front) */}
    <path d="M12 14L9 22H15L12 14Z" fill="#78350F" />
    <circle cx="12" cy="11" r="6" fill="#16A34A" />
    <circle cx="12" cy="9" r="3" fill="#4ADE80" fillOpacity="0.4" />
  </svg>
);

export const IconWater: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 2.5C12 2.5 5 11 5 15.5C5 19.5 8.13401 22 12 22C15.866 22 19 19.5 19 15.5C19 11 12 2.5 12 2.5Z" fill="#0EA5E9" />
    <path d="M14 9C12.5 11 11 13 11 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
    <ellipse cx="15" cy="15" rx="2" ry="3" fill="white" fillOpacity="0.3" transform="rotate(-30 15 15)" />
  </svg>
);

export const IconSanctuary: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <defs>
      <radialGradient id="sanctuary_glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) rotate(90) scale(12)">
        <stop stopColor="#FCD34D" stopOpacity="0.6" />
        <stop offset="1" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#sanctuary_glow)" />
    <rect x="11" y="14" width="2" height="8" rx="0.5" fill="#B45309" />
    <path d="M12 16L8 19M12 16L16 19" stroke="#B45309" strokeWidth="1" />
    <circle cx="12" cy="9" r="7" fill="#FBBF24" />
    <circle cx="12" cy="9" r="5" fill="#F59E0B" />
    <path d="M12 4L13 6H15L13.5 7.5L14 9.5L12 8.5L10 9.5L10.5 7.5L9 6H11L12 4Z" fill="#FFFBEB" />
  </svg>
);

export const IconBarren: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M2 18C2 18 5 16 8 16C11 16 12 19 15 19C18 19 22 17 22 17V22H2V18Z" fill="#78716C" />
    <path d="M6 18L9 22M15 19L13 22" stroke="#57534E" strokeWidth="1" />
    <path d="M4 12H8L10 14H16L18 12H22" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="6" cy="12" r="1" fill="#78716C" />
    <circle cx="19" cy="11" r="1.5" fill="#78716C" />
  </svg>
);
