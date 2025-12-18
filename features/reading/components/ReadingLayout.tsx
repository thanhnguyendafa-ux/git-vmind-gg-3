
import * as React from 'react';

interface ReadingLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  isSidebarOpen: boolean; // Mobile State
  setIsSidebarOpen: (isOpen: boolean) => void; // Mobile Toggle
  isDesktopSidebarOpen: boolean; // Desktop State
}

const ReadingLayout: React.FC<ReadingLayoutProps> = ({ sidebar, children, isSidebarOpen, setIsSidebarOpen, isDesktopSidebarOpen }) => {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar: Glassmorphism */}
      <aside
        className={`
          fixed inset-y-0 left-0 flex-shrink-0 z-40 
          bg-white/60 dark:bg-[#0F1A17]/60 backdrop-blur-xl border-r border-white/20 dark:border-white/5
          transition-all duration-300 ease-in-out 
          ${isSidebarOpen ? 'translate-x-0 shadow-xl w-80' : '-translate-x-full w-80'}
          md:relative md:shadow-none md:translate-x-0
          ${isDesktopSidebarOpen ? 'md:w-80 md:opacity-100' : 'md:w-0 md:opacity-0 md:overflow-hidden md:border-none'}
        `}
      >
        {/* Inner wrapper to maintain content width during collapse animation */}
        <div className="w-80 h-full flex flex-col">
            {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300">
        {children}
      </main>
    </div>
  );
};

export default ReadingLayout;
