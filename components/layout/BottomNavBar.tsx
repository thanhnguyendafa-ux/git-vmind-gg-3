
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
      className={`relative flex flex-col items-center justify-center w-full pt-2 pb-1 transition-all duration-300 active:scale-95 group ${
        isActive 
          ? 'text-primary-600 dark:text-primary-400' 
          : 'text-text-subtle hover:text-text-main dark:hover:text-secondary-200'
      }`}
    >
      <div className={`transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.4)] scale-110' : 'scale-100 group-hover:scale-105'}`}>
        {iconElement}
      </div>
      <span className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${isActive ? 'font-bold' : ''}`}>{label}</span>
      {badgeCount && badgeCount > 0 && (
          <span className="absolute top-1 right-1/2 translate-x-3 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-white text-[9px] font-bold leading-none ring-2 ring-white dark:ring-secondary-800 shadow-sm animate-pulse-slow">
              {badgeCount > 9 ? '9+' : badgeCount}
          </span>
      )}
    </button>
  );
};

const BottomNavBar: React.FC = () => {
  const { isImmersive } = useUIStore();
  
  const navItems: { screen: Screen; label: string; icon: React.ReactNode | string; badgeCount?: number }[] = [
    { screen: Screen.Home, label: 'Home', icon: <HomeIcon className="w-6 h-6" /> },
    { screen: Screen.Tables, label: 'Tables', icon: <TableIcon className="w-6 h-6" /> },
    { screen: Screen.Vmind, label: 'Vmind', icon: <VmindIcon className="w-6 h-6" /> },
    { screen: Screen.Map, label: 'Map', icon: <MapIcon className="w-6 h-6" /> },
    { screen: Screen.Community, label: 'Community', icon: <Icon name="globe" className="w-6 h-6" variant="filled" /> },
    { screen: Screen.Stats, label: 'Profile', icon: <RewardsIcon className="w-6 h-6" /> },
    { screen: Screen.Settings, label: 'Settings', icon: <SettingsIcon className="w-6 h-6" /> },
  ];
  
  // ARCHITECTURE UPDATE v2.6: "Ethereal Dock"
  // Glassmorphism + Localized Aurora Effects
  // UPDATE v3.0: Fixed positioning to support Immersive Mode slide-out
  return (
    <footer 
        className={`fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)] bg-white/70 dark:bg-[#0F1A17]/80 backdrop-blur-xl border-t border-white/60 dark:border-white/10 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] transition-transform duration-300 ease-in-out ${isImmersive ? 'translate-y-full' : 'translate-y-0'}`}
    >
      
      {/* Local Aurora Layer - Left Mint Glow */}
      <div 
        className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] rounded-full blur-[40px] bg-primary-500/10 dark:bg-primary-400/10 pointer-events-none animate-pulse" 
        style={{ animationDuration: '6s' }} 
      />
      
      {/* Local Aurora Layer - Right Blue Glow */}
      <div 
        className="absolute bottom-[-50%] right-[-10%] w-[40%] h-[200%] rounded-full blur-[40px] bg-blue-500/10 dark:bg-blue-400/10 pointer-events-none animate-pulse" 
        style={{ animationDuration: '8s', animationDelay: '1s' }} 
      />

      <nav className="relative z-10 flex justify-around items-center h-16">
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
