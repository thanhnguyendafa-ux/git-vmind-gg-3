import * as React from 'react';
import { useUIStore } from '../../stores/useUIStore';

const AuroraBackground: React.FC = () => {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none transition-colors duration-700 ease-in-out ${isDark ? 'bg-[#0F1A17]' : 'bg-[#F8FAF9]'}`}>
      {/* Mesh Gradients */}
      <div 
        className={`absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[100px] animate-pulse transition-colors duration-1000 ${isDark ? 'bg-primary-500/20' : 'bg-[#86EFAC]/40'}`} 
        style={{ animationDuration: '8s' }} 
      />
      <div 
        className={`absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] animate-pulse transition-colors duration-1000 ${isDark ? 'bg-blue-500/10' : 'bg-[#93C5FD]/40'}`} 
        style={{ animationDuration: '10s', animationDelay: '1s' }} 
      />
      <div 
        className={`absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full blur-[90px] animate-pulse transition-colors duration-1000 ${isDark ? 'bg-amber-500/10' : 'bg-[#FDE68A]/40'}`} 
        style={{ animationDuration: '12s', animationDelay: '2s' }} 
      />
      
      {/* Noise Overlay */}
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05]'}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
};

export default AuroraBackground;