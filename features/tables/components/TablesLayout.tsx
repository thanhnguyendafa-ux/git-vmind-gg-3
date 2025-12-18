import * as React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '../../../stores/useUIStore';
import AuroraBackground from '../../../components/ui/AuroraBackground';

interface TablesLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const TablesLayout: React.FC<TablesLayoutProps> = ({ sidebar, children }) => {
  const { isTablesSidebarOpen, setIsTablesSidebarOpen, isDesktopSidebarOpen } = useUIStore(
    useShallow(state => ({
      isTablesSidebarOpen: state.isTablesSidebarOpen,
      setIsTablesSidebarOpen: state.setIsTablesSidebarOpen,
      isDesktopSidebarOpen: state.isDesktopSidebarOpen,
    }))
  );

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      <AuroraBackground />
      
      {/* Backdrop for mobile sidebar, closes sidebar on click */}
      {isTablesSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fadeIn"
          onClick={() => setIsTablesSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar: Drawer on mobile, collapsible part of layout on desktop. Background removed to let child component handle glass effect. */}
      <aside
        className={`fixed inset-y-0 left-0 w-80 flex-shrink-0 z-40 transition-all duration-300 ease-in-out md:relative md:translate-x-0 ${
          isTablesSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isDesktopSidebarOpen ? 'md:w-80 md:opacity-100' : 'md:w-0 md:opacity-0 md:overflow-hidden'}`}
      >
        {sidebar}
      </aside>

      {/* Main Content: Transparent to show Aurora. Z-index ensures interactivity above background. */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
};

export default TablesLayout;