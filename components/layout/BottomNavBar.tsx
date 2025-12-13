
import React from 'react';
import { Screen } from '../../types';
import Icon from '../ui/Icon';
import VmindIcon from '../ui/VmindIcon';
import TableIcon from '../ui/TableIcon';
import HomeIcon from '../ui/HomeIcon';
import MapIcon from '../ui/MapIcon';
import SettingsIcon from '../ui/SettingsIcon';
import RewardsIcon from '../ui/RewardsIcon';
import { useUIStore } from '../../stores/useUIStore';
import { playNavigateSound } from '../../services/soundService';

interface NavItemProps {
  screen: Screen;
  label: string;
  icon: React.ReactNode | string;
  badgeCount?: number;
}

const NavItem: React.FC<NavItemProps> = ({ screen, label, icon, badgeCount }) => {
  const { currentScreen, attemptNavigation } = useUIStore();
  const isActive = currentScreen === screen;
  
  const handleClick = () => {
    if (!isActive) {
        playNavigateSound();
    }
    // Use the Global Navigation Guard
    attemptNavigation(screen);
  };

  const iconElement = typeof icon === 'string' ? <Icon name={icon} className="w-6 h-6" variant="filled" /> : icon;

  return (
    <button
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 active:scale-95 ${
        isActive ? 'text-primary-500' : 'text-text-subtle hover:text-primary-500'
      }`}
    >
      <div className={isActive ? 'text-primary-500' : 'text-current'}>
        {iconElement}
      </div>
      <span className="text-[10px] font-medium mt-1">{label}</span>
      {badgeCount && badgeCount > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-4 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-white text-xs font-bold leading-none ring-2 ring-surface dark:ring-secondary-800">
              {badgeCount > 9 ? '9+' : badgeCount}
          </span>
      )}
    </button>
  );
};

const BottomNavBar: React.FC = () => {
  const navItems: { screen: Screen; label: string; icon: React.ReactNode | string; badgeCount?: number }[] = [
    { screen: Screen.Home, label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
    { screen: Screen.Tables, label: 'Tables', icon: <TableIcon className="w-6 h-6" /> },
    { screen: Screen.Vmind, label: 'Vmind', icon: <VmindIcon className="w-6 h-6" /> },
    { screen: Screen.Map, label: 'Map', icon: <MapIcon className="w-6 h-6" /> },
    { screen: Screen.Stats, label: 'Profile', icon: <RewardsIcon className="w-6 h-6" /> },
    { screen: Screen.Settings, label: 'Settings', icon: <SettingsIcon className="w-6 h-6" /> },
  ];
  
  // ARCHITECTURE UPDATE v2.6: Flexbox Layout + Safe Area
  // Not fixed anymore; it sits at the bottom of the flex column in AppContent.
  // We apply padding-bottom using env(safe-area-inset-bottom) for iPhone X+ home bars.
  return (
    <footer className="w-full bg-surface dark:bg-secondary-800 border-t border-secondary-200 dark:border-secondary-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)] z-30 pb-[env(safe-area-inset-bottom)]">
      <nav className="flex justify-around items-center h-16">
        {navItems.map(item => (
          <NavItem
            key={item.screen}
            screen={item.screen}
            label={item.label}
            icon={item.icon}
            badgeCount={item.badgeCount}
          />
        ))}
      </nav>
    </footer>
  );
};

export default BottomNavBar;
