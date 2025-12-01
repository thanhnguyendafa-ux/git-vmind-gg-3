

import React from 'react';
import Icon from '../../components/ui/Icon';

const LibraryScreen = () => {
  return (
    <div className="p-4 sm:p-6 md:p-8 mx-auto animate-fadeIn flex flex-col items-center justify-center text-center h-[calc(100vh-5rem)]">
      <Icon name="book" className="w-24 h-24 text-secondary-300 dark:text-secondary-700 mb-4" />
      <h1 className="text-3xl font-bold text-text-main dark:text-secondary-100 mb-2">Community Library</h1>
      <p className="text-text-subtle">This feature is coming soon!</p>
      <p className="text-text-subtle mt-2 max-w-md">You'll be able to browse, download, and share vocabulary tables with other Vmind users from around the world.</p>
    </div>
  );
};

export default LibraryScreen;