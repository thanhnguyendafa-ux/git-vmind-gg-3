import * as React from 'react';

// Lazy-load the badge components
const CompassIcon = React.lazy(() => import('./badges/CompassIcon'));
const MagnifyingGlassIcon = React.lazy(() => import('./badges/MagnifyingGlassIcon'));
const NotebookPenIcon = React.lazy(() => import('./badges/NotebookPenIcon'));
const GlowingBrainIcon = React.lazy(() => import('./badges/GlowingBrainIcon'));
const SproutIcon = React.lazy(() => import('./badges/SproutIcon'));

const iconMap: { [key: string]: React.LazyExoticComponent<React.FC<{ className?: string }>> } = {
  'compass': CompassIcon,
  'magnifying-glass': MagnifyingGlassIcon,
  'notebook-pen': NotebookPenIcon,
  'glowing-brain': GlowingBrainIcon,
  'sprout': SproutIcon,
};

interface BadgeIconProps {
  iconName: string;
  className?: string;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ iconName, className }) => {
  const IconComponent = iconMap[iconName];

  if (!IconComponent) {
    // Return a placeholder div with the same dimensions/classes if the name is invalid
    // or if we want a fallback visual for unknown badges.
    return <div className={className} />;
  }

  return (
    <React.Suspense fallback={<div className={className} />}>
      <IconComponent className={className} />
    </React.Suspense>
  );
};

export default BadgeIcon;