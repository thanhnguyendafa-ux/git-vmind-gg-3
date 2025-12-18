import * as React from 'react';
import { AppContent } from './AppContent';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  // The useUserStore's init() method, called on import, sets up the auth listener.
  // AppContent now handles the data fetching lifecycle based on the auth state.
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
