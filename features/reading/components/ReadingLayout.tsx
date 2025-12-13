
import * as React from 'react';

interface ReadingLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const ReadingLayout: React.FC<ReadingLayoutProps> = ({ sidebar, children, isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <div className="flex h-full w-full overflow-hidden bg-background dark:bg-secondary-900">
      {/* Backdrop for mobile sidebar */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden animate-fadeIn"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar: Drawer on mobile, fixed on desktop */}
      <aside
        className={`fixed inset-y-0 left-0 w-80 flex-shrink-0 bg-surface dark:bg-secondary-800 border-r border-border dark:border-secondary-700 z-40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background dark:bg-secondary-900 relative">
        {children}
      </main>
    </div>
  );
};

export default ReadingLayout;
