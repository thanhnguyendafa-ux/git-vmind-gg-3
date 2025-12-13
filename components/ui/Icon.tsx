
import * as React from 'react';
import { iconPaths } from './icons';

interface IconProps {
  name: string;
  className?: string;
  variant?: 'outline' | 'filled';
  strokeWidth?: number;
  title?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = 'w-6 h-6', variant = 'outline', strokeWidth = 2, title }) => {
  const pathData = iconPaths[name as keyof typeof iconPaths];

  if (!pathData) {
      return null;
  }

  const isMaterialIcon = name === 'reading-person';
  const viewBox = isMaterialIcon ? "0 -960 960 960" : "0 0 24 24";
  
  // Material icons usually don't need stroke if filled, or they are outlines by definition in path.
  // For 'reading-person', the path is a shape. We typically fill shapes.
  // If variant is outline, we can set fill="none" stroke="currentColor", but for this path 
  // it might look thin/odd if it was designed as a filled shape. 
  // We'll stick to standard behavior but allow the path to define itself if we had more metadata.
  // For now, let's respect the variant prop as usual.
  
  // NOTE: The reading-person path is a filled shape definition. 
  // To make it look right in "outline" mode, we might want to force fill if it's not supported as a stroke path.
  // But strictly adhering to the prop `variant` is safer for component consistency.
  // However, for this specific Material Symbol path, it's a fill path.
  // If variant='outline' (default), it will stroke the perimeter which is correct for "outline" style.
  // If variant='filled', it fills the shape.

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill={variant === 'filled' || isMaterialIcon ? 'currentColor' : 'none'}
      viewBox={viewBox} 
      strokeWidth={isMaterialIcon ? 0 : strokeWidth}
      stroke={isMaterialIcon ? 'none' : 'currentColor'} 
      className={className}
    >
      {title && <title>{title}</title>}
      <path 
        strokeLinecap="round"
        strokeLinejoin="round"
        d={pathData} 
      />
    </svg>
  );
};

export default Icon;
